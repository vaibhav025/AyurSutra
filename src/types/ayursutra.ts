export type PanchakarmaCategory = 
  | 'Purvakarma' 
  | 'Pradhanakarma' 
  | 'Paschatkarma' 
  | 'Rasayana';

export type DoshaType = 'Vata' | 'Pitta' | 'Kapha' | 'Tridoshic' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha';

export interface Therapy {
  id: string;
  name: string;
  sanskrit_name: string;
  category: PanchakarmaCategory;
  duration_mins: number;
  oil_required_ml: number;
  oil_type: string;
  price: number;
  dosha_target: string;
  description: string;
  benefits: string[];
  contraindications: string[];
  icon_name: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  category: 'Medicated Oil' | 'Herbal Decoction' | 'Herbal Churna' | 'Ghee & Butter' | 'Linen & Accessories';
  stock_ml: number;
  min_threshold_ml: number;
  unit: string;
  batch_number: string;
  last_restocked: string;
  price_per_liter: number;
}

export interface ResourceRoom {
  id: string;
  room_name: string;
  room_code: string;
  room_type: string;
  droni_wood: string;
  droni_length_ft: number;
  is_operational: boolean;
  maintenance_status: 'Operational' | 'Sanitizing' | 'Maintenance' | 'Inspection';
  features: string[];
}

export interface Therapist {
  id: string;
  name: string;
  title: string; // e.g. 'Senior Panchakarma Vaidya', 'Certified Ayurvedic Therapist'
  specialization: string;
  gender: 'Male' | 'Female';
  experience_years: number;
  status: 'Available' | 'In Session' | 'On Leave';
  avatar_url: string;
  rating: number;
  completed_sessions: number;
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rejected';

export interface Booking {
  id: string;
  booking_ref: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_age?: number;
  client_gender?: 'Male' | 'Female' | 'Other';
  prakriti?: string;
  therapy_id: string;
  therapist_id: string;
  room_id: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  status: BookingStatus;
  report_url?: string;
  report_file_name?: string;
  medical_notes?: string;
  oil_deducted: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined relation fields for convenience
  therapy?: Therapy;
  therapist?: Therapist;
  room?: ResourceRoom;
}

export interface ConstraintValidationResult {
  can_book: boolean;
  therapist_available: boolean;
  therapist_conflict_reason?: string;
  room_available: boolean;
  room_conflict_reason?: string;
  inventory_sufficient: boolean;
  inventory_conflict_reason?: string;
  required_oil_ml: number;
  current_stock_ml: number;
  oil_name: string;
  conflicting_booking?: Booking;
}

export interface BookingCreationRPCResponse {
  success: boolean;
  booking_id?: string;
  booking_ref?: string;
  message: string;
  details?: {
    client_name: string;
    therapy_name: string;
    therapist_name: string;
    room_name: string;
    start_time: string;
    end_time: string;
    oil_required_ml: number;
    oil_type: string;
  };
  error_code?: 'THERAPIST_CONFLICT' | 'ROOM_CONFLICT' | 'INVENTORY_SHORTAGE' | 'ROOM_OFFLINE' | 'THERAPIST_OFFLINE' | 'INVALID_TIME' | 'TRANSACTION_ERROR';
  error_message?: string;
}

export interface RealtimeAuditLog {
  id: string;
  timestamp: string;
  event_type: 'RPC_CALL' | 'BOOKING_CREATED' | 'BOOKING_APPROVED' | 'INVENTORY_DEDUCTED' | 'BOOKING_REJECTED' | 'RESTOCK' | 'CONSTRAINT_BLOCKED';
  title: string;
  details: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  payload?: any;
}
