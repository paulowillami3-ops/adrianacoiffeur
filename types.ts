
export type AppView =
  | 'LANDING'
  | 'HOME'
  | 'SELECT_SERVICES'
  | 'SELECT_DATE_TIME'
  | 'REVIEW'
  | 'MY_APPOINTMENTS'
  | 'LOGIN'
  | 'ADMIN_DASHBOARD'
  | 'CHAT'
  | 'ADMIN_SERVICES'
  | 'ADMIN_CHAT_LIST'
  | 'ADMIN_BLOCK_SCHEDULE'
  | 'ADMIN_SETTINGS'
  | 'ADMIN_FINANCE'
  | 'ADMIN_TV'
  | 'SELECT_PLAN'
  | 'SUBSCRIPTION_PAYMENT'
  | 'ADMIN_SUBSCRIPTIONS'
  | 'ADMIN_MANAGE_PLANS';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  benefits: string;
  qr_code_url?: string;
  pix_code?: string;
  is_active: boolean;
  monthly_limit: number; // Legacy global limit
  allowed_services?: string[]; // Legacy list
  service_limits?: Record<string, number>; // serviceId -> monthlyLimit
  service_components?: Record<string, string[]>; // comboId -> basicServiceIds
  created_at: string;
}

export interface UserSubscription {
  id: string;
  client_id: number;
  plan_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  payment_proof_url?: string;
  created_at: string;
  approved_at?: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  time: string;
  reason: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  imageUrl: string;
  popular?: boolean;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  services: Service[];
  date: string; // ISO string or simple YYYY-MM-DD
  time: string; // HH:mm
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  clientSubscription?: {
    planName: string;
    cutsUsed: number;
    cutsLimit: number;
    isActive: boolean;
  };
}

export interface BookingState {
  customerName: string;
  customerPhone: string;
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  selectedPlan?: SubscriptionPlan;
  clientSubscription?: {
    planName: string;
    cutsUsed: number;
    cutsLimit: number;
    isActive: boolean;
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'CUSTOMER' | 'BARBER';
  timestamp: Date;
}
