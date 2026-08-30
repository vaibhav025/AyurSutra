export type PanchakarmaCategory = 'Purvakarma' | 'Pradhanakarma' | 'Paschatkarma' | 'Consultation' | string;

export interface Therapy {
  id: string;
  name: string;
  sanskrit_name: string;
  category: PanchakarmaCategory;
  description: string;
  duration_mins: number;
  price: number;
  oil_required_ml: number;
  oil_type: string;
  dosha_target?: string;
  benefits?: string[];
  contraindications?: string[];
  icon_name?: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
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
  room_type?: string;
  droni_wood: string;
  droni_length_ft: number;
  is_operational: boolean;
  maintenance_status: string;
  features: string[];
}

export interface Therapist {
  id: string;
  name: string;
  title: string;
  specialization: string;
  experience_years: number;
  gender?: string;
  status: string;
  avatar_url: string;
  rating: number;
  completed_sessions: number;
}

export interface Booking {
  id: string;
  booking_ref: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_age?: number;
  client_gender?: string;
  prakriti: string;
  therapy_id: string;
  therapist_id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: 'Pending' | 'Confirmed' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled' | 'Denied' | string;
  report_url?: string;
  report_file_name?: string;
  medical_notes?: string;
  oil_deducted: boolean;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  therapy?: Therapy;
  therapist?: Therapist;
  room?: ResourceRoom;
}

export interface ConstraintValidationResult {
  can_book: boolean;
  therapist_available: boolean;
  room_available: boolean;
  inventory_sufficient: boolean;
  required_oil_ml: number;
  current_stock_ml: number;
  oil_name: string;
  therapist_conflict_reason?: string;
  room_conflict_reason?: string;
  inventory_conflict_reason?: string;
  conflicting_booking?: Booking;
}

export interface BookingCreationRPCResponse {
  success: boolean;
  booking_id?: string;
  booking_ref?: string;
  message: string;
  error_code?: string;
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
}

export interface RealtimeAuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  title: string;
  details: string;
  severity: 'info' | 'success' | 'warning' | 'error' | string;
  payload?: any;
}