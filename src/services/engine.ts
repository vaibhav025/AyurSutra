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

type Listener = () => void;

class AyurSutraEngine {
  private therapies: Therapy[] = [];
  private inventory: InventoryItem[] = [];
  private rooms: ResourceRoom[] = [];
  private therapists: Therapist[] = [];
  private bookings: Booking[] = [];
  private auditLogs: RealtimeAuditLog[] = [];
  private listeners: Set<Listener> = new Set();
  private storageKey = 'ayursutra_state_v1';

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.therapies = parsed.therapies || INITIAL_THERAPIES;
        this.inventory = parsed.inventory || INITIAL_INVENTORY;
        this.rooms = parsed.rooms || INITIAL_ROOMS;
        this.therapists = parsed.therapists || INITIAL_THERAPISTS;
        this.bookings = parsed.bookings || INITIAL_BOOKINGS;
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
    // Return with populated relations
    return this.bookings.map((b) => ({
      ...b,
      therapy: this.therapies.find((t) => t.id === b.therapy_id),
      therapist: this.therapists.find((th) => th.id === b.therapist_id),
      room: this.rooms.find((r) => r.id === b.room_id),
    }));
  }

  // Time overlap utility: [startA, endA) overlaps [startB, endB)
  private isTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    const sA = new Date(startA).getTime();
    const eA = new Date(endA).getTime();
    const sB = new Date(startB).getTime();
    const eB = new Date(endB).getTime();
    return sA < eB && sB < eA;
  }

  /**
   * Pre-flight Constraint Validator for the UI and RPC Engine
   */
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

    // 1. Therapist Check
    if (therapist) {
      if (therapist.status === 'On Leave') {
        result.therapist_available = false;
        result.therapist_conflict_reason = `${therapist.name} is currently marked On Leave.`;
      } else {
        const conflictingBooking = this.bookings.find(
          (b) =>
            b.therapist_id === therapistId &&
            ['Pending', 'Confirmed'].includes(b.status) &&
            this.isTimeOverlap(b.start_time, b.end_time, startTimeIso, endTimeIso)
        );
        if (conflictingBooking) {
          result.therapist_available = false;
          result.conflicting_booking = conflictingBooking;
          const fmtStart = new Date(conflictingBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const fmtEnd = new Date(conflictingBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          result.therapist_conflict_reason = `${therapist.name} has a scheduled session (${fmtStart} - ${fmtEnd}).`;
        }
      }
    }

    // 2. Treatment Room (Droni Bed) Check
    if (room) {
      if (!room.is_operational) {
        result.room_available = false;
        result.room_conflict_reason = `${room.room_name} is non-operational (${room.maintenance_status}).`;
      } else {
        const conflictingRoomBooking = this.bookings.find(
          (b) =>
            b.room_id === roomId &&
            ['Pending', 'Confirmed'].includes(b.status) &&
            this.isTimeOverlap(b.start_time, b.end_time, startTimeIso, endTimeIso)
        );
        if (conflictingRoomBooking) {
          result.room_available = false;
          const fmtStart = new Date(conflictingRoomBooking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const fmtEnd = new Date(conflictingRoomBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          result.room_conflict_reason = `${room.room_name} (${room.droni_wood}) is occupied (${fmtStart} - ${fmtEnd}).`;
        }
      }
    }

    // 3. Inventory Stock Sufficiency Check
    const inv = this.inventory.find((item) => item.item_name === therapy.oil_type);
    if (inv) {
      result.current_stock_ml = inv.stock_ml;
      if (inv.stock_ml < therapy.oil_required_ml) {
        result.inventory_sufficient = false;
        result.inventory_conflict_reason = `Insufficient ${therapy.oil_type}. Required: ${therapy.oil_required_ml} mL, in stock: ${inv.stock_ml} mL.`;
      }
    } else {
      result.inventory_sufficient = false;
      result.inventory_conflict_reason = `Required oil "${therapy.oil_type}" is missing from clinic inventory!`;
    }

    result.can_book = result.therapist_available && result.room_available && result.inventory_sufficient;
    return result;
  }

  /**
   * Stored Procedure Simulation: create_panchakarma_booking RPC
   */
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
    // Artificial small latency to simulate network RPC execution
    await new Promise((res) => setTimeout(res, 250));

    const therapy = this.therapies.find((t) => t.id === params.therapy_id);
    const therapist = this.therapists.find((th) => th.id === params.therapist_id);
    const room = this.rooms.find((r) => r.id === params.room_id);

    if (!therapy) {
      return {
        success: false,
        error_code: 'TRANSACTION_ERROR',
        message: 'Invalid therapy selected.',
      };
    }

    const validation = this.checkConstraints(
      params.therapy_id,
      params.therapist_id,
      params.room_id,
      params.start_time
    );

    if (!validation.therapist_available) {
      this.addAuditLog(
        'CONSTRAINT_BLOCKED',
        'RPC Blocked: Therapist Collision',
        `Attempted booking for ${params.client_name} failed: ${validation.therapist_conflict_reason}`,
        'warning'
      );
      return {
        success: false,
        error_code: 'THERAPIST_CONFLICT',
        message: validation.therapist_conflict_reason || 'Therapist is unavailable for this time slot.',
      };
    }

    if (!validation.room_available) {
      this.addAuditLog(
        'CONSTRAINT_BLOCKED',
        'RPC Blocked: Droni Room Collision',
        `Attempted booking for ${params.client_name} failed: ${validation.room_conflict_reason}`,
        'warning'
      );
      return {
        success: false,
        error_code: 'ROOM_CONFLICT',
        message: validation.room_conflict_reason || 'Treatment Room / Droni bed is occupied for this time slot.',
      };
    }

    if (!validation.inventory_sufficient) {
      this.addAuditLog(
        'CONSTRAINT_BLOCKED',
        'RPC Blocked: Oil Shortage',
        `Attempted booking for ${params.client_name} failed: ${validation.inventory_conflict_reason}`,
        'error'
      );
      return {
        success: false,
        error_code: 'INVENTORY_SHORTAGE',
        message: validation.inventory_conflict_reason || 'Insufficient medicated oil in stock.',
      };
    }

    // All constraints passed -> Generate Booking
    const durationMins = therapy.duration_mins;
    const sDate = new Date(params.start_time);
    const eDate = new Date(sDate.getTime() + durationMins * 60000);
    const bookingRef = `AYUR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newBooking: Booking = {
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

    this.bookings.unshift(newBooking);
    this.addAuditLog(
      'BOOKING_CREATED',
      `New Panchakarma Request: ${bookingRef}`,
      `${params.client_name} requested ${therapy.name} with ${therapist?.name || 'Therapist'}. Status: Pending.`,
      'info',
      newBooking
    );
    this.saveState();

    return {
      success: true,
      booking_id: newBooking.id,
      booking_ref: bookingRef,
      message: 'Panchakarma booking created successfully! Pending receptionist review and confirmation.',
      details: {
        client_name: params.client_name,
        therapy_name: therapy.name,
        therapist_name: therapist ? therapist.name : 'Assigned Vaidya',
        room_name: room ? room.room_name : 'Assigned Suite',
        start_time: newBooking.start_time,
        end_time: newBooking.end_time,
        oil_required_ml: therapy.oil_required_ml,
        oil_type: therapy.oil_type,
      },
    };
  }

  /**
   * Stored Procedure Simulation: approve_panchakarma_booking RPC
   * Atomically decrements oil stock and switches booking status to 'Confirmed'.
   */
  public async approveBookingRPC(bookingId: string): Promise<{
    success: boolean;
    message: string;
    remaining_stock_ml?: number;
    error_code?: string;
  }> {
    await new Promise((res) => setTimeout(res, 200));

    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) {
      return { success: false, message: 'Booking not found.' };
    }

    const booking = this.bookings[bookingIndex];
    if (booking.status !== 'Pending') {
      return { success: false, message: `Cannot approve booking in "${booking.status}" state.` };
    }

    const therapy = this.therapies.find((t) => t.id === booking.therapy_id);
    if (!therapy) {
      return { success: false, message: 'Associated therapy not found.' };
    }

    const invIndex = this.inventory.findIndex((i) => i.item_name === therapy.oil_type);
    if (invIndex === -1) {
      return { success: false, message: `Required oil "${therapy.oil_type}" not registered in inventory.` };
    }

    const invItem = this.inventory[invIndex];
    if (invItem.stock_ml < therapy.oil_required_ml) {
      this.addAuditLog(
        'CONSTRAINT_BLOCKED',
        `Approval Failed: Stock Depleted for ${booking.booking_ref}`,
        `Needed ${therapy.oil_required_ml} mL of ${therapy.oil_type}, but only ${invItem.stock_ml} mL remains in inventory.`,
        'error'
      );
      return {
        success: false,
        error_code: 'INVENTORY_SHORTAGE',
        message: `Cannot approve: Insufficient ${therapy.oil_type} (Available: ${invItem.stock_ml} mL, Needed: ${therapy.oil_required_ml} mL).`,
      };
    }

    // Atomic decrement
    const newStock = invItem.stock_ml - therapy.oil_required_ml;
    this.inventory[invIndex] = {
      ...invItem,
      stock_ml: newStock,
      last_restocked: new Date().toISOString().split('T')[0],
    };

    // Update booking
    this.bookings[bookingIndex] = {
      ...booking,
      status: 'Confirmed',
      oil_deducted: true,
      updated_at: new Date().toISOString(),
    };

    this.addAuditLog(
      'BOOKING_APPROVED',
      `Booking Confirmed: ${booking.booking_ref}`,
      `Reserved ${therapy.oil_required_ml} mL ${therapy.oil_type} for ${booking.client_name}. Stock remaining: ${newStock} mL.`,
      'success'
    );

    this.saveState();

    return {
      success: true,
      message: `Booking ${booking.booking_ref} approved! ${therapy.oil_required_ml} mL ${therapy.oil_type} deducted from inventory.`,
      remaining_stock_ml: newStock,
    };
  }

  /**
   * Reject / Cancel Booking
   */
  public async rejectBookingRPC(bookingId: string, reason: string): Promise<{ success: boolean; message: string }> {
    await new Promise((res) => setTimeout(res, 150));

    const bookingIndex = this.bookings.findIndex((b) => b.id === bookingId);
    if (bookingIndex === -1) {
      return { success: false, message: 'Booking not found.' };
    }

    const booking = this.bookings[bookingIndex];

    // If oil was already deducted and now cancelled, refund oil to inventory
    if (booking.oil_deducted) {
      const therapy = this.therapies.find((t) => t.id === booking.therapy_id);
      if (therapy) {
        const invIndex = this.inventory.findIndex((i) => i.item_name === therapy.oil_type);
        if (invIndex !== -1) {
          this.inventory[invIndex].stock_ml += therapy.oil_required_ml;
        }
      }
    }

    this.bookings[bookingIndex] = {
      ...booking,
      status: 'Rejected',
      rejection_reason: reason,
      oil_deducted: false,
      updated_at: new Date().toISOString(),
    };

    this.addAuditLog(
      'BOOKING_REJECTED',
      `Booking Rejected: ${booking.booking_ref}`,
      `Reason: ${reason}. Client: ${booking.client_name}.`,
      'warning'
    );

    this.saveState();
    return { success: true, message: `Booking ${booking.booking_ref} rejected.` };
  }

  /**
   * Restock Medicated Oil or Herbs
   */
  public restockItem(itemId: string, addMl: number) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      this.inventory[idx].stock_ml += addMl;
      this.inventory[idx].last_restocked = new Date().toISOString().split('T')[0];
      this.addAuditLog(
        'RESTOCK',
        `Inventory Restocked: ${this.inventory[idx].item_name}`,
        `Added +${addMl} mL. New balance: ${this.inventory[idx].stock_ml} mL.`,
        'success'
      );
      this.saveState();
    }
  }

  /**
   * Set Room Status (Operational / Maintenance)
   */
  public setRoomStatus(roomId: string, isOperational: boolean, status: ResourceRoom['maintenance_status']) {
    const idx = this.rooms.findIndex((r) => r.id === roomId);
    if (idx !== -1) {
      this.rooms[idx].is_operational = isOperational;
      this.rooms[idx].maintenance_status = status;
      this.addAuditLog(
        'RPC_CALL',
        `Room Status Updated: ${this.rooms[idx].room_name}`,
        `Now ${status} (Operational: ${isOperational}).`,
        'info'
      );
      this.saveState();
    }
  }

  /**
   * Set Therapist Status
   */
  public setTherapistStatus(therapistId: string, status: Therapist['status']) {
    const idx = this.therapists.findIndex((th) => th.id === therapistId);
    if (idx !== -1) {
      this.therapists[idx].status = status;
      this.addAuditLog(
        'RPC_CALL',
        `Therapist Status Changed: ${this.therapists[idx].name}`,
        `Status set to ${status}.`,
        'info'
      );
      this.saveState();
    }
  }

  /**
   * Set Inventory Stock directly (useful for Stress Tester / Simulator)
   */
  public setInventoryStock(itemId: string, exactStockMl: number) {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      this.inventory[idx].stock_ml = Math.max(0, exactStockMl);
      this.saveState();
    }
  }

  /**
   * Full CRUD: Update Inventory Item
   */
  public updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): boolean {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;
    
    this.inventory[idx] = {
      ...this.inventory[idx],
      ...updates,
      last_restocked: updates.last_restocked || new Date().toISOString().split('T')[0],
    };
    this.addAuditLog(
      'RESTOCK',
      `Inventory Updated: ${this.inventory[idx].item_name}`,
      `Stock: ${this.inventory[idx].stock_ml} mL | Min Threshold: ${this.inventory[idx].min_threshold_ml} mL | Batch: ${this.inventory[idx].batch_number}`,
      'info'
    );
    this.saveState();
    return true;
  }

  /**
   * Full CRUD: Add New Inventory Item
   */
  public addInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = {
      ...item,
      id: 'inv-' + Date.now(),
      last_restocked: item.last_restocked || new Date().toISOString().split('T')[0],
      price_per_liter: item.price_per_liter || 1800,
    };
    this.inventory.push(newItem);
    this.addAuditLog(
      'RESTOCK',
      `New Formulation Added: ${newItem.item_name}`,
      `Initial Stock: ${newItem.stock_ml} mL | Threshold: ${newItem.min_threshold_ml} mL`,
      'success'
    );
    this.saveState();
    return newItem;
  }

  /**
   * Full CRUD: Delete Inventory Item
   */
  public deleteInventoryItem(itemId: string): boolean {
    const idx = this.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;
    const name = this.inventory[idx].item_name;
    this.inventory.splice(idx, 1);
    this.addAuditLog(
      'RPC_CALL',
      `Item Removed from Inventory: ${name}`,
      `Item ID: ${itemId} was archived.`,
      'warning'
    );
    this.saveState();
    return true;
  }

  /**
   * Full CRUD: Update Treatment Room
   */
  public updateRoom(roomId: string, updates: Partial<ResourceRoom>): boolean {
    const idx = this.rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return false;
    this.rooms[idx] = {
      ...this.rooms[idx],
      ...updates,
    };
    this.addAuditLog(
      'RPC_CALL',
      `Room Config Updated: ${this.rooms[idx].room_name}`,
      `Status: ${this.rooms[idx].maintenance_status} | Operational: ${this.rooms[idx].is_operational}`,
      'info'
    );
    this.saveState();
    return true;
  }

  /**
   * Full CRUD: Add Treatment Room
   */
  public addRoom(room: Omit<ResourceRoom, 'id'>): ResourceRoom {
    const newRoom: ResourceRoom = {
      ...room,
      id: 'rm-' + Date.now(),
      droni_length_ft: room.droni_length_ft || 7.5,
      features: room.features || ['Handcrafted Wooden Droni Bed', 'Warm Oil Drainage Catchment'],
    };
    this.rooms.push(newRoom);
    this.addAuditLog(
      'RPC_CALL',
      `New Droni Suite Added: ${newRoom.room_name}`,
      `Wood: ${newRoom.droni_wood} | Code: ${newRoom.room_code}`,
      'success'
    );
    this.saveState();
    return newRoom;
  }

  /**
   * Full CRUD: Update Therapist
   */
  public updateTherapist(therapistId: string, updates: Partial<Therapist>): boolean {
    const idx = this.therapists.findIndex((th) => th.id === therapistId);
    if (idx === -1) return false;
    this.therapists[idx] = {
      ...this.therapists[idx],
      ...updates,
    };
    this.addAuditLog(
      'RPC_CALL',
      `Practitioner Record Updated: ${this.therapists[idx].name}`,
      `Status: ${this.therapists[idx].status} | Specialization: ${this.therapists[idx].specialization}`,
      'info'
    );
    this.saveState();
    return true;
  }
}

export const ayurEngine = new AyurSutraEngine();
