import ReloadPrompt from './src/ReloadPrompt';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppView, Service, BookingState, Appointment, ChatMessage, SubscriptionPlan, Professional, Category, Product } from './types';
import { supabase } from './src/supabase';
import { format, addDays } from 'date-fns';
import { SuccessOverlay, IOSNotification, ProtectedRoute } from './src/components';
import { 
  CustomerLoginScreen, 
  HomeScreen, 
  SelectCategoryScreen, 
  SelectDateTimeScreen, 
  ReviewScreen, 
  LoginScreen,
  SelectServicesScreen,
  CustomerInfoScreen,
  SelectProfessionalScreen,
  MyAppointmentsScreen,
  ChatScreen,
  AdminChatListScreen,
  AdminDashboard,
  AdminFinanceScreen,
  AdminSettingsScreen,
  AdminClientsScreen,
  AdminTVScreen,
  AdminServicesScreen,
  AdminClubManagementScreen,
  AdminProfessionalsScreen,
  AdminProductsScreen,
  SelectPlanScreen,
  AdminSubscriptionsScreen,
  AdminManagePlansScreen,
  ProductShowcaseScreen,
  LandingScreen,
  SubscriptionPaymentScreen
} from './src/screens';

// --- Global Route Configuration ---
const ROUTES_MAP: Record<AppView, string> = {
  LANDING: '/',
  HOME: '/home',
  SELECT_CATEGORY: '/agendar/categoria',
  SELECT_SERVICES: '/agendar/servicos',
  SELECT_PROFESSIONAL: '/agendar/profissional',
  SELECT_DATE_TIME: '/agendar/data-hora',
  CUSTOMER_INFO: '/cliente',
  REVIEW: '/agendar/revisar',
  MY_APPOINTMENTS: '/agendamentos',
  LOGIN: '/login',
  ADMIN_DASHBOARD: '/admin',
  CHAT: '/chat',
  ADMIN_SERVICES: '/admin/servicos',
  ADMIN_CHAT_LIST: '/admin/chat',
  ADMIN_BLOCK_SCHEDULE: '/admin/bloqueios',
  ADMIN_SETTINGS: '/admin/configuracoes',
  ADMIN_FINANCE: '/admin/financeiro',
  ADMIN_TV: '/admin/tv',
  SELECT_PLAN: '/assinaturas/planos',
  SUBSCRIPTION_PAYMENT: '/assinaturas/pagamento',
  ADMIN_PROFESSIONALS: '/admin/equipe',
  ADMIN_PRODUCTS: '/admin/produtos',
  PRODUCTS: '/produtos',
  ADMIN_WEEKLY_SCHEDULE: '/admin/horarios',
  CUSTOMER_LOGIN: '/entrar',
  ADMIN_CLIENTS: '/admin/clientes',
  ADMIN_CLUB: '/admin/clube'
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUserRole, setCurrentUserRole] = useState<'CUSTOMER' | 'BARBER'>('CUSTOMER');
  const [authLoading, setAuthLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [showPastHistory, setShowPastHistory] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationState, setNotificationState] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [booking, setBooking] = useState<BookingState>({
    customerName: '',
    customerPhone: '',
    selectedServices: [],
    selectedCategory: undefined,
    selectedDate: '',
    selectedTime: '',
    selectedProfessional: undefined,
  });

  const prevAppCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const lastChatDataStringRef = useRef<string | null>(null);
  const lastAppointmentsDataStringRef = useRef<string | null>(null);
  const prevUnreadCountRef = useRef(0);

  // Helper to change views
  const setView = useCallback((v: AppView) => {
    navigate(ROUTES_MAP[v] || '/');
  }, [navigate]);

  // Derive current view from URL for legacy logic compatibility
  const view = useMemo(() => {
    const entry = Object.entries(ROUTES_MAP).find(([, v]) => v === location.pathname);
    return (entry ? entry[0] : 'LANDING') as AppView;
  }, [location.pathname]);

  // Auth & Session Management
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserRole('BARBER');
        const lastView = localStorage.getItem('last_admin_view') as AppView;
        if (window.location.pathname === '/' || window.location.pathname === '/login') {
          setView(lastView?.startsWith('ADMIN_') ? lastView : 'ADMIN_DASHBOARD');
        }
      }
      setAuthLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentUserRole('BARBER');
        localStorage.setItem('admin_auth', 'true');
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserRole('CUSTOMER');
        localStorage.removeItem('admin_auth');
        localStorage.removeItem('last_admin_view');
        setView('LANDING');
      }
    });

    const savedPhone = localStorage.getItem('customer_phone');
    const savedName = localStorage.getItem('customer_name');
    if (savedPhone) {
      setBooking(prev => ({ ...prev, customerPhone: savedPhone, customerName: savedName || prev.customerName }));
    }

    return () => { subscription.unsubscribe(); };
  }, [setView]);

  // Data Fetching
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('service_categories').select('*').order('display_order', { ascending: true });
    if (data) {
      const mapped = data.map((c: any) => ({ ...c, id: String(c.id) }));
      setCategories(mapped);
    }
  }, []);

  const fetchServicesList = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('display_order', { ascending: true });
    if (data) setServices(data.map((s: any) => ({ ...s, id: String(s.id), imageUrl: s.image_url })));
  }, []);

  const fetchProfessionals = useCallback(async () => {
    const { data } = await supabase.from('professionals').select('*, category_professionals(category_id)').order('created_at', { ascending: true });
    if (data) setProfessionals(data.map((p: any) => ({ ...p, imageUrl: p.image_url, isActive: p.is_active, authUserId: p.auth_user_id, email: p.email, categories: p.category_professionals?.map((cp: any) => String(cp.category_id)) })));
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('display_order', { ascending: true });
    if (data) setProducts(data.map((p: any) => ({ ...p, imageUrl: p.image_url, isActive: p.is_active })));
  }, []);

  const fetchBlockedSlots = useCallback(async () => {
    const { data } = await supabase.from('blocked_slots').select('*').order('date', { ascending: true }).order('time', { ascending: true });
    if (data) setBlockedSlots(data);
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (currentUserRole === 'CUSTOMER' && !booking.customerPhone) { setAppointments([]); return; }

    const normalizedPhone = booking.customerPhone.replace(/\D/g, '');
    const today = format(new Date(), 'yyyy-MM-dd');
    const limitDate = showPastHistory ? format(addDays(new Date(), -30), 'yyyy-MM-dd') : today;

    let query = supabase.from('appointments').select(`*, services:appointment_services(service:services(*)), clients${currentUserRole === 'CUSTOMER' ? '!inner' : ''}(id, name, phone, user_subscriptions(*, subscription_plans(*)))`).order('appointment_date', { ascending: true }).order('appointment_time', { ascending: true });

    if (currentUserRole === 'CUSTOMER') {
      query = query.eq('clients.phone', normalizedPhone);
      if (!showPastHistory) query = query.gte('appointment_date', format(addDays(new Date(), -90), 'yyyy-MM-dd'));
    } else {
      query = query.gte('appointment_date', limitDate);
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('is_read', false).eq('sender_type', 'CUSTOMER').then(({ count }) => setUnreadCount(count || 0));
    }

    const { data } = await query;
    if (data) {
      const mapped = data.map((a: any) => {
        const client = a.clients;
        const activeSub = client?.user_subscriptions?.find((s: any) => s.status === 'APPROVED');
        return {
          id: String(a.id),
          date: a.appointment_date,
          time: a.appointment_time?.slice(0, 5) || '',
          status: a.status,
          totalPrice: a.total_price,
          finalPriceSet: a.final_price_set ?? false,
          customerName: client?.name || 'Cliente',
          customerPhone: client?.phone || '',
          services: a.services && a.services.length > 0 
            ? a.services.map((s: any) => s.service ? ({ ...s.service, imageUrl: s.service.image_url || null }) : null).filter(Boolean)
            : [{ name: 'Serviço não especificado', duration: 30, price: 0 }],
          professionalId: a.professional_id,
          clientSubscription: activeSub ? { planName: activeSub.subscription_plans.name, isActive: true } : undefined
        };
      });

      if (JSON.stringify(mapped) !== lastAppointmentsDataStringRef.current) {
        if (currentUserRole === 'BARBER' && !isFirstLoadRef.current && mapped.length > prevAppCountRef.current) {
          if (Notification.permission === 'granted') new Notification("Novo Agendamento!");
          new Audio('/notification.mp3').play().catch(() => {});
        }
        setAppointments(mapped);
        lastAppointmentsDataStringRef.current = JSON.stringify(mapped);
        prevAppCountRef.current = mapped.length;
        isFirstLoadRef.current = false;
      }
    }
  }, [currentUserRole, booking.customerPhone, showPastHistory]);

  const onRefreshAll = useCallback(async () => {
    await Promise.all([
      fetchCategories(),
      fetchServicesList(),
      fetchProfessionals(),
      fetchProducts(),
      fetchBlockedSlots(),
      fetchAppointments()
    ]);
  }, [fetchCategories, fetchServicesList, fetchProfessionals, fetchProducts, fetchBlockedSlots, fetchAppointments]);

  // Initial Data Load
  useEffect(() => {
    onRefreshAll();
  }, [onRefreshAll]);

  // Realtime Subscriptions
  useEffect(() => {
    const channel = supabase.channel('realtime-db').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchAppointments()).subscribe();
    const interval = setInterval(fetchAppointments, 30000); // 30s
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [fetchAppointments]);

  // Unread Count Handler
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      setNotificationState({ visible: true, message: 'Você tem uma nova mensagem de cliente!' });
      new Audio('/notification.mp3').play().catch(() => {});
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Administrative Handlers
  const handleLogout = useCallback(() => {
    setCurrentUserRole('CUSTOMER');
    setBooking(prev => ({ ...prev, customerName: '', customerPhone: '', clientSubscription: undefined }));
    localStorage.removeItem('admin_auth');
    supabase.auth.signOut();
    setView('LANDING');
  }, [setView]);

  const [selectedChatClient, setSelectedChatClient] = useState<{ id: string, name: string } | null>(null);

  const handleSendMessage = async (text: string, identity?: { name: string, phone: string }) => {
    const phone = identity?.phone || booking.customerPhone;
    const name = identity?.name || booking.customerName;
    const normalizedPhone = phone.replace(/\D/g, '');
    let cId = selectedChatClient?.id;

    if (!cId) {
      const { data: client } = await supabase.from('clients').select('id').eq('phone', normalizedPhone).single();
      if (client) cId = client.id;
      else {
        const { data: newClient } = await supabase.from('clients').insert({ name, phone: normalizedPhone }).select().single();
        if (newClient) cId = newClient.id;
      }
    }

    if (cId) {
      await supabase.from('chat_messages').insert({ client_id: cId, sender_type: currentUserRole, message_text: text, sent_at: new Date().toISOString() });
    }
  };

  const handleFinishBooking = async () => {
    const phoneDigits = booking.customerPhone.replace(/\D/g, '');
    const { data: client } = await supabase.from('clients').select('id').eq('phone', phoneDigits).single();
    let cId = client?.id;

    if (!cId) {
      const { data: newClient } = await supabase.from('clients').insert({ name: booking.customerName, phone: phoneDigits }).select().single();
      cId = newClient?.id;
    }

    if (!cId) return alert('Ambiente offline ou erro ao processar cliente');

    const totalPrice = booking.selectedServices.reduce((sum, s) => {
      const basePrice = (s.min_price !== undefined && s.min_price !== null) ? s.min_price : s.price;
      return sum + basePrice;
    }, 0);

    const { data: newApp, error } = await supabase.from('appointments').insert({
      client_id: cId,
      professional_id: booking.selectedProfessional?.id,
      appointment_date: booking.selectedDate,
      appointment_time: booking.selectedTime,
      total_price: totalPrice,
      status: 'PENDING'
    }).select().single();

    if (!error && newApp) {
      // Link services
      const serviceLinks = booking.selectedServices.map(s => ({
        appointment_id: newApp.id,
        service_id: s.id
      }));
      
      const { error: serviceError } = await supabase.from('appointment_services').insert(serviceLinks);
      
      if (serviceError) {
        console.error('Erro ao vincular serviços:', serviceError);
      }

      localStorage.setItem('customer_phone', phoneDigits);
      localStorage.setItem('customer_name', booking.customerName);
      setShowSuccess(true);
      setBooking(prev => ({ ...prev, selectedServices: [], selectedDate: '', selectedTime: '' }));
      fetchAppointments();
      setTimeout(() => { setShowSuccess(false); setView('MY_APPOINTMENTS'); }, 3000);
    } else if (error) {
      alert('Erro ao agendar: ' + error.message);
    }
  };

  // View Persister
  useEffect(() => {
    if (view.startsWith('ADMIN_')) localStorage.setItem('last_admin_view', view);
  }, [view]);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-white font-display transition-colors duration-300">
      {showSuccess && <SuccessOverlay />}
      <IOSNotification visible={notificationState.visible} message={notificationState.message} onClose={() => setNotificationState(p => ({ ...p, visible: false }))} />
      
      <AnimatePresence mode="wait">
        <Routes location={location}>
          {/* Public & Customer Routes */}
          <Route path={ROUTES_MAP.LANDING} element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><LandingScreen onStart={() => setView('HOME')} onAdmin={() => setView('LOGIN')} /></motion.div>} />
          <Route path={ROUTES_MAP.HOME} element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}><HomeScreen onAgendar={() => { fetchCategories(); setView('SELECT_CATEGORY'); }} onChat={() => setView('CHAT')} onPerfil={() => setView('CUSTOMER_LOGIN')} onMais={handleLogout} onAssinatura={() => setView('SELECT_PLAN')} onProducts={() => setView('PRODUCTS')} /></motion.div>} />
          <Route path={ROUTES_MAP.SELECT_CATEGORY} element={<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}><SelectCategoryScreen categories={categories} booking={booking} setBooking={setBooking} onNext={() => { fetchServicesList(); setView('SELECT_SERVICES'); }} onBack={() => setView('HOME')} /></motion.div>} />
          <Route path={ROUTES_MAP.SELECT_SERVICES} element={<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}><SelectServicesScreen booking={booking} setBooking={setBooking} onNext={() => setView('SELECT_PROFESSIONAL')} onBack={() => setView('SELECT_CATEGORY')} services={services} /></motion.div>} />
          <Route path={ROUTES_MAP.SELECT_PROFESSIONAL} element={<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}><SelectProfessionalScreen booking={booking} setBooking={setBooking} onNext={() => setView('SELECT_DATE_TIME')} onBack={() => setView('SELECT_SERVICES')} professionals={professionals} /></motion.div>} />
          <Route path={ROUTES_MAP.SELECT_DATE_TIME} element={<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}><SelectDateTimeScreen booking={booking} setBooking={setBooking} onNext={() => setView('CUSTOMER_INFO')} onBack={() => setView('SELECT_PROFESSIONAL')} /></motion.div>} />
          <Route path={ROUTES_MAP.CUSTOMER_INFO} element={<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}><CustomerInfoScreen booking={booking} setBooking={setBooking} onNext={() => setView('REVIEW')} onBack={() => setView('SELECT_DATE_TIME')} /></motion.div>} />
          <Route path={ROUTES_MAP.REVIEW} element={<motion.div initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}><ReviewScreen booking={booking} onConfirm={handleFinishBooking} onBack={() => setView('CUSTOMER_INFO')} /></motion.div>} />
          <Route path={ROUTES_MAP.MY_APPOINTMENTS} element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}><MyAppointmentsScreen appointments={appointments} showPastHistory={showPastHistory} setShowPastHistory={setShowPastHistory} onBack={() => setView('HOME')} onNew={() => setView('SELECT_SERVICES')} onRefresh={fetchAppointments} /></motion.div>} />
          <Route path={ROUTES_MAP.PRODUCTS} element={<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} transition={{ duration: 0.3 }}><ProductShowcaseScreen products={products} onBack={() => setView('HOME')} /></motion.div>} />
          <Route path={ROUTES_MAP.CHAT} element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}><ChatScreen messages={chatMessages} onSendMessage={handleSendMessage} onRegister={identity => setBooking(prev => ({ ...prev, ...identity }))} currentUserRole={currentUserRole} customerIdentity={{ name: booking.customerName, phone: booking.customerPhone }} chatClientId={selectedChatClient?.id} onBack={() => setView(currentUserRole === 'BARBER' ? 'ADMIN_CHAT_LIST' : 'HOME')} /></motion.div>} />
          <Route path={ROUTES_MAP.CUSTOMER_LOGIN} element={<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }}><CustomerLoginScreen onLogin={p => { localStorage.setItem('customer_phone', p); setBooking(prev => ({ ...prev, customerPhone: p })); setView('MY_APPOINTMENTS'); }} onBack={() => setView('HOME')} /></motion.div>} />
          <Route path={ROUTES_MAP.SELECT_PLAN} element={<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.4 }}><SelectPlanScreen onBack={() => setView('HOME')} onSelect={p => { setBooking(prev => ({ ...prev, selectedPlan: p })); setView('SUBSCRIPTION_PAYMENT'); }} /></motion.div>} />
          <Route path={ROUTES_MAP.SUBSCRIPTION_PAYMENT} element={<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.4 }}><SubscriptionPaymentScreen plan={booking.selectedPlan!} onBack={() => setView('SELECT_PLAN')} onSubmit={async (proof, phone, name) => {
              const p = phone.replace(/\D/g, ''); const { data: client } = await supabase.from('clients').select('id').eq('phone', p).single();
              let cid = client?.id; if (client) await supabase.from('clients').update({ name }).eq('id', cid); else { const { data: nc } = await supabase.from('clients').insert({ name, phone: p }).select().single(); cid = nc?.id; }
              if (cid) { const { error } = await supabase.from('user_subscriptions').insert({ client_id: cid, plan_id: booking.selectedPlan!.id, payment_proof_url: proof, status: 'PENDING' }); if (!error) { alert('Sucesso! Aguarde aprovação.'); setView('HOME'); } }
            }} /></motion.div>} />
          
          {/* Admin Routes */}
          <Route path={ROUTES_MAP.LOGIN} element={<LoginScreen onLogin={() => setView('ADMIN_DASHBOARD')} onBack={() => setView('LANDING')} />} />
          <Route path={ROUTES_MAP.ADMIN_DASHBOARD} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminDashboard ownerId="adriana" appointments={appointments} services={services} professionals={professionals} blockedSlots={blockedSlots} unreadCount={unreadCount} onNavigate={setView} onRefresh={onRefreshAll} onLogout={handleLogout} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_PROFESSIONALS} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminProfessionalsScreen onBack={() => setView('ADMIN_DASHBOARD')} categories={categories} professionals={professionals} onRefresh={onRefreshAll} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_SERVICES} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminServicesScreen onBack={() => setView('ADMIN_DASHBOARD')} services={services} categories={categories} onRefresh={onRefreshAll} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_SETTINGS} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminSettingsScreen onBack={() => setView('ADMIN_DASHBOARD')} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_FINANCE} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminFinanceScreen onBack={() => setView('ADMIN_DASHBOARD')} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_TV} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminTVScreen appointments={appointments} onRefresh={fetchAppointments} onBack={() => setView('ADMIN_DASHBOARD')} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_PRODUCTS} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminProductsScreen onBack={() => setView('ADMIN_DASHBOARD')} products={products} onRefresh={onRefreshAll} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_CHAT_LIST} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminChatListScreen onBack={() => setView('ADMIN_DASHBOARD')} onSelectChat={(id, name) => { setSelectedChatClient({ id, name }); setView('CHAT'); }} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_CLUB} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminClubManagementScreen onBack={() => setView('ADMIN_DASHBOARD')} /></ProtectedRoute>} />
          <Route path={ROUTES_MAP.ADMIN_CLIENTS} element={<ProtectedRoute authLoading={authLoading} currentUserRole={currentUserRole}><AdminClientsScreen onBack={() => setView('ADMIN_DASHBOARD')} onChat={(id, name) => { setSelectedChatClient({ id, name }); setView('CHAT'); }} /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      <ReloadPrompt />
    </div>
  );
};

export default App;
