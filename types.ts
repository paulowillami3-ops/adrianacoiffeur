
export type AppView =
  | 'LANDING'
  | 'HOME'
  | 'SELECT_CATEGORY'
  | 'SELECT_SERVICES'
  | 'SELECT_DATE_TIME'
  | 'CUSTOMER_INFO'
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
  | 'ADMIN_PROFESSIONALS'
  | 'SELECT_PROFESSIONAL'
  | 'ADMIN_PRODUCTS'
  | 'PRODUCTS'
  | 'ADMIN_WEEKLY_SCHEDULE'
  | 'CUSTOMER_LOGIN'
  | 'ADMIN_CLIENTS'
  | 'ADMIN_CLUB'
  | 'CLUB_LOGIN';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  benefits: string;
  qr_code_url?: string;
  pix_code?: string;
  is_active: boolean;
  monthly_limit: number; // Legacy global limit
  allowed_services?: string[]; // Legacy list
  service_limits?: Record<string, number>; // serviceId -> monthlyLimit
  service_components?: Record<string, string[]>; // comboId -> basicServiceIds
  display_order: number;
  created_at: string;
  price_on_evaluation?: boolean;
  discount_percentage?: number;
}

export interface UserSubscription {
  id: string;
  client_id: number;
  plan_id: number;
  status: 'PENDING' | 'ACTIVE' | 'INADIMPLENTE' | 'CANCELLED' | 'EXPIRED' | 'REJECTED' | 'APPROVED';
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
  categories?: string[];
  created_at?: string;
  authUserId?: string;
  email?: string;
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
  min_price?: number;
  max_price?: number;
  duration: number;
  imageUrl: string;
  category_id?: string;
  display_order: number;
  popular?: boolean;
  is_club_only?: boolean;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  services: Service[];
  date: string; // ISO string or simple YYYY-MM-DD
  time: string; // HH:mm
  totalPrice: number;
  finalPriceSet?: boolean; // true when admin explicitly defined a final price for price-range services
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  client_id?: number;
  professionalId?: string;
  professionalName?: string;
  clientSubscription?: {
    planName: string;
    isActive: boolean;
    allowedServices?: string[];
    serviceLimits?: Record<string, number>;
    serviceUsage?: Record<string, number>;
  };
  is_vip?: boolean;
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
    isActive: boolean;
    allowedServices?: string[];
    serviceLimits?: Record<string, number>;
    serviceUsage?: Record<string, number>;
  };
  birthDate?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'CUSTOMER' | 'BARBER';
  timestamp: Date;
}
