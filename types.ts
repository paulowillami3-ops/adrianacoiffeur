
export type AppView =
  | 'LANDING'
  | 'HOME'
  | 'SELECT_CATEGORY'
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
  | 'ADMIN_MANAGE_PLANS'
  | 'ADMIN_PROFESSIONALS'
  | 'SELECT_PROFESSIONAL'
  | 'ADMIN_PRODUCTS'
  | 'PRODUCTS';

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
  professional_id?: string;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  bio?: string;
  imageUrl?: string;
  color: string;
  isActive: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock_quantity: number;
  display_order: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  imageUrl: string;
  category_id?: string;
  display_order: number;
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
  client_id?: number;
  professionalId?: string;
  professionalName?: string;
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
  selectedCategory?: Category;
  selectedDate: string;
  selectedTime: string;
  selectedProfessional?: Professional;
  selectedPlan?: SubscriptionPlan;
  clientSubscription?: {
    planName: string;
    cutsUsed: number;
    cutsLimit: number;
    isActive: boolean;
  };
  birthDate?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'CUSTOMER' | 'BARBER';
  timestamp: Date;
}
