/**
 * Production-ready PostgreSQL schema, Stored Procedures (RPC), Storage Bucket Config,
 * and Row Level Security (RLS) for AyurSutra Panchakarma Scheduling Engine on Supabase.
 */

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- AYURSUTRA: PANCHAKARMA MULTI-VARIABLE CONSTRAINT SCHEDULING ENGINE
-- Database Schema, Functions, Storage & Security Policies
-- Generated for Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. EXTENSIONS & CLEANUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE SCHEMAS & TABLES
-- ==============================================================================

-- 2.1 Therapies Table (Panchakarma Procedures & Oil Consumption)
CREATE TABLE IF NOT EXISTS public.therapies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sanskrit_name TEXT,
    category TEXT NOT NULL CHECK (category IN ('Purvakarma', 'Pradhanakarma', 'Paschatkarma', 'Rasayana')),
    duration_mins INTEGER NOT NULL DEFAULT 60 CHECK (duration_mins > 0),
    oil_required_ml INTEGER NOT NULL DEFAULT 200 CHECK (oil_required_ml >= 0),
    oil_type TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    dosha_target TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 Inventory Table (Ayurvedic Medicated Oils & Herbs in Stock)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'Medicated Oil',
    stock_ml INTEGER NOT NULL DEFAULT 0 CHECK (stock_ml >= 0),
    min_threshold_ml INTEGER NOT NULL DEFAULT 500 CHECK (min_threshold_ml >= 0),
    unit TEXT NOT NULL DEFAULT 'mL',
    batch_number TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 Resources Table (Panchakarma Treatment Rooms with Droni Beds)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    room_code TEXT UNIQUE NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'Traditional Droni Suite',
    droni_wood TEXT NOT NULL DEFAULT 'Teak Wood (Sagwan)',
    is_operational BOOLEAN NOT NULL DEFAULT true,
    maintenance_status TEXT NOT NULL DEFAULT 'Operational' CHECK (maintenance_status IN ('Operational', 'Sanitizing', 'Maintenance', 'Inspection')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 Therapists Table (Vaidyas & Certified Panchakarma Practitioners)
CREATE TABLE IF NOT EXISTS public.therapists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialization TEXT,
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'In Session', 'On Leave')),
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 Bookings Table (Core Scheduling Entity with Foreign Key Constraints)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    therapy_id UUID NOT NULL REFERENCES public.therapies(id) ON DELETE RESTRICT,
    therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rejected')),
    report_url TEXT,
    report_file_name TEXT,
    medical_notes TEXT,
    oil_deducted BOOLEAN NOT NULL DEFAULT false,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT valid_time_window CHECK (end_time > start_time)
);

-- Indexes for lightning fast overlap queries and constraint checking
CREATE INDEX IF NOT EXISTS idx_bookings_therapist_time ON public.bookings (therapist_id, start_time, end_time) WHERE status IN ('Pending', 'Confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON public.bookings (room_id, start_time, end_time) WHERE status IN ('Pending', 'Confirmed');
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON public.inventory (item_name);

-- ==============================================================================
-- 3. SUPABASE STORAGE SETUP (Medical Report PDFs)
-- ==============================================================================

-- Create bucket for client Ayurvedic medical reports & prakriti assessments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-reports',
    'medical-reports',
    true,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- Storage RLS Policies
CREATE POLICY "Public Read Access for Medical Reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'medical-reports');

CREATE POLICY "Authenticated/Anon Upload Access for Reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medical-reports');

-- ==============================================================================
-- 4. ATOMIC STORED PROCEDURE: create_panchakarma_booking (RPC)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_panchakarma_booking(
    p_client_name TEXT,
    p_client_phone TEXT,
    p_client_email TEXT,
    p_therapy_id UUID,
    p_therapist_id UUID,
    p_room_id UUID,
    p_start_time TIMESTAMPTZ,
    p_report_url TEXT DEFAULT NULL,
    p_report_file_name TEXT DEFAULT NULL,
    p_medical_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_therapy RECORD;
    v_therapist RECORD;
    v_room RECORD;
    v_inventory RECORD;
    v_end_time TIMESTAMPTZ;
    v_booking_id UUID;
    v_booking_ref TEXT;
    v_overlap_count INTEGER;
    v_conflict_info TEXT;
BEGIN
    -- 1. Validate Input & Retrieve Therapy Details
    SELECT * INTO v_therapy FROM public.therapies WHERE id = p_therapy_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_THERAPY',
            'message', 'Selected therapy does not exist in catalog.'
        );
    END IF;

    -- 2. Compute Target Time Window
    v_end_time := p_start_time + (v_therapy.duration_mins * INTERVAL '1 minute');

    IF p_start_time < NOW() - INTERVAL '5 minutes' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_TIME',
            'message', 'Cannot book Panchakarma slots in the past.'
        );
    END IF;

    -- 3. CONSTRAINT 1: Therapist Validation & Availability
    SELECT * INTO v_therapist FROM public.therapists WHERE id = p_therapist_id FOR SHARE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_THERAPIST',
            'message', 'Therapist record not found.'
        );
    END IF;

    IF v_therapist.status = 'On Leave' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'THERAPIST_OFFLINE',
            'message', format('Therapist %s is currently on leave.', v_therapist.name)
        );
    END IF;

    -- Check for overlapping active bookings for this therapist
    SELECT COUNT(*), string_agg(to_char(start_time, 'HH24:MI') || '-' || to_char(end_time, 'HH24:MI'), ', ')
    INTO v_overlap_count, v_conflict_info
    FROM public.bookings
    WHERE therapist_id = p_therapist_id
      AND status IN ('Pending', 'Confirmed')
      AND (start_time, end_time) OVERLAPS (p_start_time, v_end_time);

    IF v_overlap_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'THERAPIST_CONFLICT',
            'message', format('Therapist %s is already assigned to a session (%s) during this slot.', v_therapist.name, v_conflict_info)
        );
    END IF;

    -- 4. CONSTRAINT 2: Treatment Room (Droni Bed) Validation & Availability
    SELECT * INTO v_room FROM public.resources WHERE id = p_room_id FOR SHARE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_ROOM',
            'message', 'Treatment room record not found.'
        );
    END IF;

    IF NOT v_room.is_operational THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ROOM_OFFLINE',
            'message', format('Treatment Room %s is currently offline (%s).', v_room.room_name, v_room.maintenance_status)
        );
    END IF;

    -- Check for overlapping active bookings for this room
    SELECT COUNT(*), string_agg(to_char(start_time, 'HH24:MI') || '-' || to_char(end_time, 'HH24:MI'), ', ')
    INTO v_overlap_count, v_conflict_info
    FROM public.bookings
    WHERE room_id = p_room_id
      AND status IN ('Pending', 'Confirmed')
      AND (start_time, end_time) OVERLAPS (p_start_time, v_end_time);

    IF v_overlap_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ROOM_CONFLICT',
            'message', format('Treatment Room %s (Droni Bed) is occupied (%s) during this slot.', v_room.room_name, v_conflict_info)
        );
    END IF;

    -- 5. CONSTRAINT 3: Medicated Oil Inventory Stock Sufficiency Check
    SELECT * INTO v_inventory 
    FROM public.inventory 
    WHERE item_name = v_therapy.oil_type 
    FOR SHARE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVENTORY_NOT_FOUND',
            'message', format('Required medicated oil "%s" is not registered in the clinic inventory.', v_therapy.oil_type)
        );
    END IF;

    IF v_inventory.stock_ml < v_therapy.oil_required_ml THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVENTORY_SHORTAGE',
            'message', format('Inventory Shortage: Insufficient %s. Required: %s mL, Current Stock: %s mL.', 
                              v_therapy.oil_type, v_therapy.oil_required_ml, v_inventory.stock_ml)
        );
    END IF;

    -- 6. ALL 3 CONSTRAINTS SATISFIED: Create Booking in 'Pending' State
    v_booking_ref := 'AYUR-' || to_char(NOW(), 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

    INSERT INTO public.bookings (
        booking_ref,
        client_name,
        client_phone,
        client_email,
        therapy_id,
        therapist_id,
        room_id,
        start_time,
        end_time,
        status,
        report_url,
        report_file_name,
        medical_notes,
        oil_deducted
    ) VALUES (
        v_booking_ref,
        p_client_name,
        p_client_phone,
        p_client_email,
        p_therapy_id,
        p_therapist_id,
        p_room_id,
        p_start_time,
        v_end_time,
        'Pending',
        p_report_url,
        p_report_file_name,
        p_medical_notes,
        false
    )
    RETURNING id INTO v_booking_id;

    -- Return structured success payload
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_ref', v_booking_ref,
        'message', 'Panchakarma booking created successfully! Pending receptionist review and confirmation.',
        'details', jsonb_build_object(
            'client_name', p_client_name,
            'therapy_name', v_therapy.name,
            'therapist_name', v_therapist.name,
            'room_name', v_room.room_name,
            'start_time', p_start_time,
            'end_time', v_end_time,
            'oil_required_ml', v_therapy.oil_required_ml,
            'oil_type', v_therapy.oil_type
        )
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error_code', 'TRANSACTION_ERROR',
        'message', SQLERRM
    );
END;
$$;

-- ==============================================================================
-- 5. RECEPTIONIST APPROVAL RPC: approve_panchakarma_booking
-- Decrements Inventory Stock and confirms the booking atomically.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.approve_panchakarma_booking(
    p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_therapy RECORD;
    v_inventory RECORD;
    v_new_stock INTEGER;
BEGIN
    -- 1. Lock booking row for update
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Booking not found.');
    END IF;

    IF v_booking.status != 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', format('Cannot approve booking in %s state.', v_booking.status));
    END IF;

    -- 2. Fetch therapy requirements
    SELECT * INTO v_therapy FROM public.therapies WHERE id = v_booking.therapy_id;

    -- 3. Lock & verify inventory
    SELECT * INTO v_inventory FROM public.inventory WHERE item_name = v_therapy.oil_type FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Required oil not found in inventory.');
    END IF;

    IF v_inventory.stock_ml < v_therapy.oil_required_ml THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_code', 'INVENTORY_SHORTAGE',
            'message', format('Stock depleted before approval! Needed %s mL of %s, but only %s mL remains.', 
                              v_therapy.oil_required_ml, v_therapy.oil_type, v_inventory.stock_ml)
        );
    END IF;

    -- 4. Decrement Stock atomically
    v_new_stock := v_inventory.stock_ml - v_therapy.oil_required_ml;
    UPDATE public.inventory 
    SET stock_ml = v_new_stock, updated_at = NOW() 
    WHERE id = v_inventory.id;

    -- 5. Update Booking Status to Confirmed
    UPDATE public.bookings 
    SET status = 'Confirmed',
        oil_deducted = true,
        updated_at = NOW()
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'Confirmed',
        'oil_deducted_ml', v_therapy.oil_required_ml,
        'remaining_stock_ml', v_new_stock,
        'message', format('Booking %s approved. %s mL of %s reserved.', v_booking.booking_ref, v_therapy.oil_required_ml, v_therapy.oil_type)
    );
END;
$$;

-- ==============================================================================
-- 6. REALTIME REPLICATION ENABLEMENT
-- ==============================================================================

-- Enable Supabase Realtime broadcast for live updates across clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.therapists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
`;

export const SUPABASE_SEED_SQL = `-- ==============================================================================
-- AYURSUTRA: AUTHENTIC AYURVEDIC SEED DATA
-- ==============================================================================

-- 1. Insert Core Panchakarma Therapies
INSERT INTO public.therapies (name, sanskrit_name, category, duration_mins, oil_required_ml, oil_type, price, dosha_target, description)
VALUES 
(
    'Shirodhara',
    'शिरोधारा (Continuous Medicated Stream)',
    'Pradhanakarma',
    60,
    750,
    'Ksheerabala Thailam (101 Avarthanam)',
    2800.00,
    'Vata-Pitta Balance / Manasika Shanti',
    'Continuous rhythmic pouring of warm medicated herbal oil on the Ajna chakra forehead for neurological restoration, insomnia, and deep vagus nerve calming.'
),
(
    'Abhyanga Snana',
    'अभ्यङ्ग स्नान (Full Body Synchronization)',
    'Purvakarma',
    60,
    450,
    'Mahanarayana Thailam',
    2200.00,
    'Vata Shamana / Sandhigata Vata',
    'Full body synchronised Ayurvedic massage using classical warm medicated oils following lymphatic channels, enhancing ojas and joint mobility.'
),
(
    'Patra Pinda Sweda (Elakizhi)',
    'पत्रपिण्ड स्वेद (Herbal Bolus Sudation)',
    'Purvakarma',
    75,
    350,
    'Kottamchukkadi Thailam',
    2600.00,
    'Vata-Kapha Detox / Pain Relief',
    'Warm cloth boluses packed with medicinal herbal leaves, lemon, rock salt, and spices dipped in medicated oil for stiffness and musculoskeletal chronic pains.'
),
(
    'Nasya Karma',
    'नस्य कर्म (Nasal Bio-Purification)',
    'Pradhanakarma',
    45,
    50,
    'Anu Thailam',
    1500.00,
    'Urdhva Jatrugata / Kapha Cleansing',
    'Administration of specialized herbal oils through the nostrils following facial oleation and swedana to cleanse head sinuses, migraine, and cervical nodes.'
),
(
    'Kati Basti',
    'कटि बस्ति (Lumbosacral Oil Reservoir)',
    'Pradhanakarma',
    50,
    500,
    'Dhanwantharam Thailam (Special)',
    1950.00,
    'Vata Shamana / Lumbar Spondylosis',
    'A specialized dam constructed with black gram dough over the lumbar sacral spine holding continuous warm medicated oil pool.'
),
(
    'Janu Basti',
    'जानु बस्ति (Knee Joint Rejuvenation)',
    'Pradhanakarma',
    50,
    400,
    'Sahacharadi Thailam',
    1800.00,
    'Sandhi Vata / Osteoarthritis',
    'Warm herbal oil pool over bilateral knee joints to lubricate cartilage, rebuild synovial fluids, and alleviate osteoarthritic degradation.'
),
(
    'Udvartana',
    'उद्वर्तन (Herbal Powder Exfoliation)',
    'Purvakarma',
    60,
    200,
    'Triphala & Kolakulathadi Churna Blend',
    2400.00,
    'Kapha Reduction / Meda Dhatu Detox',
    'Upward lymphatic strokes using warm herbal powders mixed with therapeutic oils for cellulite breakdown, lymph drainage, and metabolic stimulation.'
)
ON CONFLICT DO NOTHING;

-- 2. Insert Ayurvedic Inventory
INSERT INTO public.inventory (item_name, category, stock_ml, min_threshold_ml, unit, batch_number)
VALUES
('Ksheerabala Thailam (101 Avarthanam)', 'Medicated Oil', 4200, 1000, 'mL', 'KB-2026-B8'),
('Mahanarayana Thailam', 'Medicated Oil', 3800, 1000, 'mL', 'MN-2026-C4'),
('Dhanwantharam Thailam (Special)', 'Medicated Oil', 2100, 800, 'mL', 'DH-2026-A1'),
('Kottamchukkadi Thailam', 'Medicated Oil', 1800, 600, 'mL', 'KC-2026-F9'),
('Anu Thailam', 'Medicated Oil', 1200, 200, 'mL', 'AT-2026-X3'),
('Sahacharadi Thailam', 'Medicated Oil', 850, 600, 'mL', 'SH-2026-E2'),
('Triphala & Kolakulathadi Churna Blend', 'Medicated Oil', 1500, 500, 'mL', 'TP-2026-K1')
ON CONFLICT (item_name) DO UPDATE SET stock_ml = EXCLUDED.stock_ml;

-- 3. Insert Droni Treatment Rooms
INSERT INTO public.resources (room_name, room_code, room_type, droni_wood, is_operational, maintenance_status)
VALUES
('Dhanvantari Sanctum', 'ROOM-101', 'Traditional Droni Suite', 'Malabar Teak Wood (Sagwan)', true, 'Operational'),
('Charaka Chamber', 'ROOM-102', 'Shirodhara & Basti Suite', 'Sacred Anjili (Wild Jack) Wood', true, 'Operational'),
('Sushruta Hall', 'ROOM-103', 'Swedana & Kizhi Suite', 'Aegle Marmelos (Country Rosewood)', true, 'Operational'),
('Vagbhata Haven', 'ROOM-104', 'VIP Panchakarma Pavilion', 'Carved Malabar Teak Wood', true, 'Operational')
ON CONFLICT (room_code) DO NOTHING;

-- 4. Insert Vaidyas & Therapists
INSERT INTO public.therapists (name, specialization, gender, status, phone)
VALUES
('Vaidya Rajeshwari Sharma, BAMS', 'Senior Panchakarma Physician & Nadi Pariksha', 'Female', 'Available', '+91 98450 11201'),
('Acharya Govind Menon', 'Master Shirodhara & Marma Specialist', 'Male', 'Available', '+91 98450 11202'),
('Vaidya Priya Nambiar', 'Swedana & Elakizhi Specialist', 'Female', 'Available', '+91 98450 11203'),
('Therapist Anand Kulkarni', 'Classical Abhyanga & Kaya Chikitsa', 'Male', 'Available', '+91 98450 11204')
ON CONFLICT DO NOTHING;
`;

export const SUPABASE_CLIENT_SNIPPET = `// ==============================================================================
// AYURSUTRA: NEXT.JS / SUPABASE CLIENT INTEGRATION CODE
// File: src/lib/supabaseClient.ts & API route handler
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 1. Upload Ayurvedic Medical Report PDF to Supabase Storage
 */
export async function uploadMedicalReport(file: File, clientName: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = \`\${Date.now()}_\${clientName.toLowerCase().replace(/\\s+/g, '_')}.\${fileExt}\`;
  const filePath = \`reports/\${fileName}\`;

  const { data, error } = await supabase.storage
    .from('medical-reports')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('medical-reports')
    .getPublicUrl(filePath);

  return { publicUrl, fileName };
}

/**
 * 2. Invoke the Multi-Variable Constraint RPC Engine
 */
export async function createPanchakarmaBookingRPC(params: {
  client_name: string;
  client_phone: string;
  client_email: string;
  therapy_id: string;
  therapist_id: string;
  room_id: string;
  start_time: string; // ISO String
  report_url?: string;
  report_file_name?: string;
  medical_notes?: string;
}) {
  const { data, error } = await supabase.rpc('create_panchakarma_booking', {
    p_client_name: params.client_name,
    p_client_phone: params.client_phone,
    p_client_email: params.client_email,
    p_therapy_id: params.therapy_id,
    p_therapist_id: params.therapist_id,
    p_room_id: params.room_id,
    p_start_time: params.start_time,
    p_report_url: params.report_url || null,
    p_report_file_name: params.report_file_name || null,
    p_medical_notes: params.medical_notes || null,
  });

  if (error) throw error;
  return data;
}

/**
 * 3. Receptionist Approves Booking (Atomic Inventory Decrement)
 */
export async function approveBookingRPC(bookingId: string) {
  const { data, error } = await supabase.rpc('approve_panchakarma_booking', {
    p_booking_id: bookingId,
  });

  if (error) throw error;
  return data;
}

/**
 * 4. Subscribe to Real-time Updates (Receptionist & Therapist Dashboards)
 */
export function subscribeToAyurSutraLive(onUpdate: () => void) {
  return supabase
    .channel('ayursutra-live-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onUpdate)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, onUpdate)
    .subscribe();
}
`;
