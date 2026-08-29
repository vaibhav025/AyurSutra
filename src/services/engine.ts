import { 
  Therapy, 
  InventoryItem, 
  ResourceRoom, 
  Therapist, 
  Booking, 
  ConstraintValidationResult, 
  BookingCreationRPCResponse,
  RealtimeAuditLog 
} from '../types/ayursutra';
import { 
  INITIAL_THERAPIES, 
  INITIAL_INVENTORY, 
  INITIAL_ROOMS, 
  INITIAL_THERAPISTS, 
  INITIAL_BOOKINGS, 
  INITIAL_AUDIT_LOGS 
} from '../data/seedData';
import { supabase } from '../lib/supabaseClient';

type Listener = () => void;

class AyurSutraEngine {
  private therapies: Therapy[] = [];
  private inventory: InventoryItem[] = [];
  private rooms: ResourceRoom[] = [];
  private therapists: Therapist[] = [];
  private bookings: Booking[] = [];
  private auditLogs: RealtimeAuditLog[] = [];
  private listeners: Set<Listener> = new Set();
  
  // VERSION BUMP: Changing this automatically forces all laptops to clear old cache 
  // and load the latest oils/inventory without needing console commands.
  private storageKey = 'ayursutra_state_v3'; 

  constructor() {
    this.loadState();
    this.fetchBookingsFromSupabase();
    this.setupRealtimeSubscription();
  }

  private async fetchBookingsFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        this.bookings = data as Booking[];
        this.notify();
      } else {
        console.warn('Supabase fetch failed (Using local state):', error);
      }
    } catch (err) {
      console.warn('Supabase connection error (Using local state):', err);
    }
  }

  private setupRealtimeSubscription() {
    try {
      supabase
        .channel('public:bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
          this.fetchBookingsFromSupabase();
        })
        .subscribe();
    } catch (err) {
      console.warn('Supabase realtime subscription failed:', err);
    }
  }

  private loadState() {
    try {
      // AUTO-CLEANUP: Automatically destroy older buggy versions from the user's browser
      localStorage.removeItem('ayursutra_state_v1');
      localStorage.removeItem('ayursutra_state_v2');
      localStorage.removeItem('ayursutra_state');

      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.therapies = parsed.therapies || INITIAL_THERAPIES;
        this.inventory = parsed.inventory || INITIAL_INVENTORY;
        this.rooms = parsed.rooms || INITIAL_ROOMS;
        this.therapists = parsed.therapists || INITIAL_THERAPISTS;
        
        if (this.bookings.length === 0) {
          this.bookings = parsed.bookings || INITIAL_BOOKINGS;
        }
        
        this.auditLogs = parsed.auditLogs || INITIAL_AUDIT_LOGS;
        return;
      }
    } catch (e) {
      console.warn('Failed to parse saved AyurSutra state, using initial seeds', e);
    }
    this.resetToDefaults();
  }

  public saveState() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          therapies: this.therapies,
          inventory: this.inventory,
          rooms: this.rooms,
          therapists: this.therapists,
          bookings: this.bookings,
          auditLogs: this.auditLogs,
        })
      );
    } catch (e) {
      console.warn('Failed to save AyurSutra state to localStorage', e);
    }
    this.notify();
  }

  public resetToDefaults() {
    this.therapies = JSON.parse(JSON.stringify(INITIAL_THERAPIES));
    this.inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
    this.rooms = JSON.parse(JSON.stringify(INITIAL_ROOMS));
    this.therapists = JSON.parse(JSON.stringify(INITIAL_THERAPISTS));
    this.bookings = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.saveState();
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public addAuditLog(
    event_type: RealtimeAuditLog['event_type'],
    title: string,
    details: string,
    severity: RealtimeAuditLog['severity'] = 'info',
    payload?: any
  ) {
    const log: RealtimeAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      event_type,
      title,
      details,
      severity,
      payload,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 50) {
      this.auditLogs.pop();
    }
    this.saveState();
  }

  // Getters
  public getTherapies(): Therapy[] {
    return this.therapies;
  }

  public getInventory(): InventoryItem[] {
    return this.inventory;
  }

  public getRooms(): ResourceRoom[] {
    return this.rooms;
  }

  public getTherapists(): Therapist[] {
    return this.therapists;
  }

  public getAuditLogs(): RealtimeAuditLog[] {
    return this.auditLogs;
  }

  public getBookings(): Booking[] {
    return this.bookings.map((b) => ({
      ...b,
      therapy: this.therapies.find((t) => t.id === b.therapy_id),
      therapist: this.therapists.find((th) => th.id === b.therapist_id),
      room: this.rooms.find((r) => r.id === b.room_id),
    }));
  }

  private isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    const sA = new Date(startA).getTime();
    const eA = new Date(endA).getTime();
    const sB = new Date(startB).getTime();
    const eB = new Date(endB).getTime();
    return sA < eB && sB < eA;
  }

  public checkConstraints(
    therapyId: string,
    therapistId: string,
    roomId: string,
    startTimeIso: string
  ): ConstraintValidationResult {
    const therapy = this.therapies.find((t) => t.id === therapyId);
    const therapist = this.therapists.find((th) => th.id === therapistId);
    const room = this.rooms.find((r) => r.id === roomId);

    const durationMins = therapy ? therapy.duration_mins : 60;
    const sDate = new Date(startTimeIso);
    const eDate = new Date(sDate.getTime() + durationMins * 60000);
    const endTimeIso = eDate.toISOString();

    const result: ConstraintValidationResult = {
      can_book: true,
      therapist_available: true,
      room_available: true,
      inventory_sufficient: true,
      required_oil_ml: therapy ? therapy.oil_required_ml : 0,
      current_stock_ml: 0,
      oil_name: therapy ? therapy.oil_type : 'Unknown Oil',
    };

    if (!therapy) {
      result.can_book = false;
      return result;
    }

    if (therapist) {
      if (therapist.status === 'On Leave') {
        result.therapist_available = false;
        result.therapist_conflict_reason = `${therapist.name} is currently marked On Leave.`;
      } else {
        const conflictingBooking = this.bookings.find(
          (b) =>
            b.therapist_id === therapistId &&
            ['Pending', 'Confirmed', 'In Progress'].includes(b.status) &&
            this.isTimeOverlap(b.start_time, b.end_time || b.start_time, startTimeIso, endTimeIso)
        );
        if (conflictingBooking) {
          result.therapist_available = false;
          result.conflicting_booking = conflictingBooking;
          const fmtStart = new Date(conflictingBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          result.therapist_conflict_reason = `${therapist.name} has a scheduled session at ${fmtStart}.`;
        }
      }
    }

    if (room) {
      if (!room.is_operational) {
        result.room_available = false;
        result.room_conflict_reason = `${room.room_name} is non-operational (${room.maintenance_status}).`;
      } else {
        const conflictingRoomBooking = this.bookings.find(
          (b) =>
            b.room_id === roomId &&
            ['Pending', 'Confirmed', 'In Progress'].includes(b.status) &&
            this.isTimeOverlap(b.start_time, b.end_time || b.start_time, startTimeIso, endTimeIso)
        );
        if (conflictingRoomBooking) {
          result.room_available = false;
          const fmtStart = new Date(conflictingRoomBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          result.room_conflict_reason = `${room.room_name} is occupied at ${fmtStart}.`;
        }
      }
    }

    const inv = this.inventory.find((item) => item.item_name === therapy.oil_type);
    if (inv) {
      result.current_stock_ml = inv.stock_ml;
      if (inv.stock_ml < therapy.oil_required_ml) {
        result.inventory_sufficient = false;
        result.inventory_conflict_reason = `Insufficient ${therapy.oil_type}. Required: ${therapy.oil_required_ml} mL, in stock: ${inv.stock_ml} mL.`;
      }
    } else if (therapy.oil_required_ml > 0) {
      result.inventory_sufficient = false;
      result.inventory_conflict_reason = `Required oil "${therapy.oil_type}" is missing from clinic inventory!`;
    }

    result.can_book = result.therapist_available && result.room_available && result.inventory_sufficient;
    return result;
  }

  public async createPanchakarmaBookingRPC(params: {
    client_name: string;
    client_phone: string;
    client_email: string;
    therapy_id: string;
    therapist_id: string;
    room_id: string;
    start_time: string;
    report_url?: string;
    report_file_name?: string;
    medical_notes?: string;
    prakriti?: string;
    client_age?: number;
    client_gender?: 'Male' | 'Female' | 'Other';
  }): Promise<BookingCreationRPCResponse> {
    
    const therapy = this.therapies.find((t) => t.id === params.therapy_id);
    const therapist = this.therapists.find((th) => th.id === params.therapist_id);
    const room = this.rooms.find((r) => r.id === params.room_id);

    if (!therapy) {
      return { success: false, error_code: 'TRANSACTION_ERROR', message: 'Invalid therapy selected.' };
    }

    const validation = this.checkConstraints(params.therapy_id, params.therapist_id, params.room_id, params.start_time);

    if (!validation.therapist_available) {
      return { success: false, error_code: 'THERAPIST_CONFLICT', message: validation.therapist_conflict_reason || 'Therapist is unavailable.' };
    }

    if (!validation.room_available) {
      return { success: false, error_code: 'ROOM_CONFLICT', message: validation.room_conflict_reason || 'Room is occupied.' };
    }

    if (!validation.inventory_sufficient) {
      return { success: false, error_code: 'INVENTORY_SHORTAGE', message: validation.inventory_conflict_reason || 'Insufficient inventory.' };
    }

    const durationMins = therapy.duration_mins;
    const sDate = new Date(params.start_time);
    const eDate = new Date(sDate.getTime() + durationMins * 60000);
    const bookingRef = `AYUR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let finalBookingData: Booking;

    try {
      const { data, error } = await supabase.from('bookings').insert([{
        booking_ref: bookingRef,
        client_name: params.client_name,
        client_phone: params.client_phone,
        client_email: params.client_email,
        prakriti: params.prakriti || 'Tridoshic',
        therapy_id: params.therapy_id,
        therapist_id: params.therapist_id,
        room_id: params.room_id,
        start_time: sDate.toISOString(),
        end_time: eDate.toISOString(),
        status: 'Pending',
        report_url: params.report_url || null,
        report_file_name: params.report_file_name || null,
        medical_notes: params.medical_notes || null,
        oil_deducted: false
      }]).select().single();

      if (error || !data) {
        throw new Error(error?.message || "Failed to retrieve inserted data");
      }
      finalBookingData = data as Booking;
    } catch (err) {
      console.warn("Supabase Insert Failed (Proceeding with Hackathon Fallback):", err);
      finalBookingData = {
        id: 'bk-' + Date.now(),
        booking_ref: bookingRef,
        client_name: params.client_name,
        client_phone: params.client_phone,
        client_email: params.client_email,
        client_age: params.client_age || 35,
        client_gender: params.client_gender || 'Male',
        prakriti: params.prakriti || 'Tridoshic',
        therapy_id: params.therapy_id,
        therapist_id: params.therapist_id,
        room_id: params.room_id,
        start_time: sDate.toISOString(),
        end_time: eDate.toISOString(),
        status: 'Pending',
        report_url: params.report_url || undefined,
        report_file_name: params.report_file_name || undefined,
        medical_notes: params.medical_notes || undefined,
        oil_deducted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    this.bookings.unshift(finalBookingData);
    this.addAuditLog('BOOKING_CREATED', `New Panchakarma Request: ${bookingRef}`, `${params.client_name} requested ${therapy.name}.`, 'info', finalBookingData);
    this.saveState();

    return {
      success: true,
      booking_id: finalBookingData.id,
      booking_ref: bookingRef,
      message: 'Booking created successfully!',
      details: {
        client_name: params.client_name,
        therapy_name: therapy.name,
        therapist_name: therapist ? therapist.name : 'Assigned Vaidya',
        room_name: room ? room.room_name : 'Assigned Suite',
        start_time: finalBookingData.start_time,
        end_time: finalBookingData.end_time,
        oil_required_ml: therapy.oil_required_ml,
        oil_type: therapy.oil_type,
      },
    };
  }

  public async approveBookingRPC(bookingId: string): Promise<{ success: boolean; message: string; remaining_stock_ml?: number; error_code?: string; }> {
    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) return { success: false, message: 'Booking not found.' };

    const booking = this.bookings[bookingIndex];
    if (booking.status !== 'Pending') return { success: false, message: `Cannot approve booking in "${booking.status}" state.` };

    const therapy = this.therapies.find((t) => t.id === booking.therapy_id);
    if (!therapy) return { success: false, message: 'Associated therapy not found.' };

    const invIndex = this.inventory.findIndex((i) => i.item_name === therapy.oil_type);
    if (invIndex !== -1 && therapy.oil_required_ml > 0) {
      const invItem = this.inventory[invIndex];
      if (invItem.stock_ml < therapy.oil_required_ml) {
        return { success: false, error_code: 'INVENTORY_SHORTAGE', message: `Insufficient ${therapy.oil_type}.` };
      }
      this.inventory[invIndex].stock_ml -= therapy.oil_required_ml;
      this.inventory[invIndex].last_restocked = new Date().toISOString().split('T')[0];
    }

    this.bookings[bookingIndex] = {
      ...booking,
      status: 'Confirmed',
      oil_deducted: true,
      updated_at: new Date().toISOString()
    };
    this.saveState();

    try {
      await supabase.from('bookings').update({ 
        status: 'Confirmed', 
        oil_deducted: true,
        updated_at: new Date().toISOString()
      }).eq('id', bookingId);
      this.fetchBookingsFromSupabase();
    } catch (err) {
      console.warn("Supabase update failed, continuing with local state", err);
    }

    this.addAuditLog('BOOKING_APPROVED', `Booking Confirmed: ${booking.booking_ref}`, `Confirmed for ${booking.client_name}.`, 'success');
    return { success: true, message: `Booking approved!` };
  }

  public async rejectBookingRPC(bookingId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) return { success: false, message: 'Booking not found.' };

    const booking = this.bookings[bookingIndex];

    if (booking.oil_deducted) {
      const therapy = this.therapies.find((t) => t.id === booking.therapy_id);
      if (therapy) {
        const invIndex = this.inventory.findIndex((i) => i.item_name === therapy.oil_type);
        if (invIndex !== -1) {
          this.inventory[invIndex].stock_ml += therapy.oil_required_ml;
          this.saveState();
        }
      }
    }

    this.bookings[bookingIndex] = {
      ...booking,
      status: 'Rejected',
      rejection_reason: reason,
      oil_deducted: false,
      updated_at: new Date().toISOString()
    };
    this.saveState();

    try {
      await supabase.from('bookings').update({ 
        status: 'Rejected', 
        rejection_reason: reason,
        oil_deducted: false,
        updated_at: new Date().toISOString()
      }).eq('id', bookingId);
      this.fetchBookingsFromSupabase();
    } catch (err) {
      console.warn("Supabase update failed, continuing with local state", err);
    }

    this.addAuditLog('BOOKING_REJECTED', `Booking Rejected: ${booking.booking_ref}`, `Reason: ${reason}`, 'warning');
    return { success: true, message: `Booking rejected.` };
  }

  public restockItem(itemId: string, addMl: number) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      this.inventory[idx].stock_ml += addMl;
      this.inventory[idx].last_restocked = new Date().toISOString().split('T')[0];
      this.addAuditLog('RESTOCK', `Inventory Restocked: ${this.inventory[idx].item_name}`, `Added +${addMl} mL. New balance: ${this.inventory[idx].stock_ml} mL.`, 'success');
      this.saveState();
    }
  }

  public setRoomStatus(roomId: string, isOperational: boolean, status: ResourceRoom['maintenance_status']) {
    const idx = this.rooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) {
      this.rooms[idx].is_operational = isOperational;
      this.rooms[idx].maintenance_status = status;
      this.addAuditLog('RPC_CALL', `Room Status Updated: ${this.rooms[idx].room_name}`, `Now ${status} (Operational: ${isOperational}).`, 'info');
      this.saveState();
    }
  }

  public setTherapistStatus(therapistId: string, status: Therapist['status']) {
    const idx = this.therapists.findIndex((th) => th.id === therapistId);
    if (idx !== -1) {
      this.therapists[idx].status = status;
      this.addAuditLog('RPC_CALL', `Therapist Status Changed: ${this.therapists[idx].name}`, `Status set to ${status}.`, 'info');
      this.saveState();
    }
  }

  public setInventoryStock(itemId: string, exactStockMl: number) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      this.inventory[idx].stock_ml = Math.max(0, exactStockMl);
      this.saveState();
    }
  }

  public updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): boolean {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;
    this.inventory[idx] = { ...this.inventory[idx], ...updates, last_restocked: updates.last_restocked || new Date().toISOString().split('T')[0] };
    this.addAuditLog('RESTOCK', `Inventory Updated: ${this.inventory[idx].item_name}`, `Stock: ${this.inventory[idx].stock_ml} mL`, 'info');
    this.saveState();
    return true;
  }

  public addInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = { ...item, id: 'inv-' + Date.now(), last_restocked: item.last_restocked || new Date().toISOString().split('T')[0], price_per_liter: item.price_per_liter || 1800 };
    this.inventory.push(newItem);
    this.addAuditLog('RESTOCK', `New Formulation Added: ${newItem.item_name}`, `Initial Stock: ${newItem.stock_ml} mL`, 'success');
    this.saveState();
    return newItem;
  }

  public deleteInventoryItem(itemId: string): boolean {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;
    const name = this.inventory[idx].item_name;
    this.inventory.splice(idx, 1);
    this.addAuditLog('RPC_CALL', `Item Removed from Inventory: ${name}`, `Item ID: ${itemId} was archived.`, 'warning');
    this.saveState();
    return true;
  }

  public updateRoom(roomId: string, updates: Partial<ResourceRoom>): boolean {
    const idx = this.rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return false;
    this.rooms[idx] = { ...this.rooms[idx], ...updates };
    this.addAuditLog('RPC_CALL', `Room Config Updated: ${this.rooms[idx].room_name}`, `Operational: ${this.rooms[idx].is_operational}`, 'info');
    this.saveState();
    return true;
  }

  public addRoom(room: Omit<ResourceRoom, 'id'>): ResourceRoom {
    const newRoom: ResourceRoom = { ...room, id: 'rm-' + Date.now(), droni_length_ft: room.droni_length_ft || 7.5, features: room.features || ['Handcrafted Wooden Droni Bed'] };
    this.rooms.push(newRoom);
    this.addAuditLog('RPC_CALL', `New Droni Suite Added: ${newRoom.room_name}`, `Wood: ${newRoom.droni_wood}`, 'success');
    this.saveState();
    return newRoom;
  }

  public updateTherapist(therapistId: string, updates: Partial<Therapist>): boolean {
    const idx = this.therapists.findIndex((th) => th.id === therapistId);
    if (idx === -1) return false;
    this.therapists[idx] = { ...this.therapists[idx], ...updates };
    this.addAuditLog('RPC_CALL', `Practitioner Record Updated: ${this.therapists[idx].name}`, `Status: ${this.therapists[idx].status}`, 'info');
    this.saveState();
    return true;
  }
}

export const ayurEngine = new AyurSutraEngine();