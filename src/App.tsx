import React, { useState, useEffect } from 'react';
import { Leaf } from 'lucide-react';
import { LoginScreen } from './components/Login';
import { Shell } from './components/Shell';
import type { ActiveTab } from './components/SidebarNav';
import { ClientBookingPortal } from './components/ClientBookingPortal';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { TherapistScheduleView } from './components/TherapistScheduleView';
import { ConstraintSimulator } from './components/ConstraintSimulator';
import { SqlSchemaViewer } from './components/SqlSchemaViewer';
import { ayurEngine } from './services/engine';
import { supabase } from './lib/supabaseClient';

export default function App() {
  // Auth & Role State
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [activeTab, setActiveTab] = useState<ActiveTab>('client');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // 1. Setup Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) fetchRole(session.user.email);
      else setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) fetchRole(session.user.email);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Role assignment based on email (preserved behavior)
  const fetchRole = (email: string) => {
    let role = 'client'; // default
    if (email.includes('admin')) role = 'receptionist';
    if (email.includes('doctor')) role = 'therapist';

    setUserRole(role);

    if (role === 'receptionist') setActiveTab('receptionist');
    else if (role === 'therapist') setActiveTab('therapist');
    else setActiveTab('client');

    setAuthLoading(false);
  };

  // Metrics listener for shell badges
  useEffect(() => {
    const updateMetrics = () => {
      const bookings = ayurEngine.getBookings();
      const inventory = ayurEngine.getInventory();
      setPendingCount(bookings.filter((b) => b.status === 'Pending').length);
      setLowStockCount(
        inventory.filter((i) => i.stock_ml <= i.min_threshold_ml).length
      );
    };
    updateMetrics();
    return ayurEngine.subscribe(updateMetrics);
  }, []);

  // Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
    setAuthLoading(false);
  };

  // Loading state
  if (authLoading && !session) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-deep flex items-center justify-center shadow-lg">
            <Leaf className="w-6 h-6 text-sage animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted">
            Preparing your secure workspace…
          </p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!session || !userRole) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={authLoading}
        error={loginError}
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
      />
    );
  }

  // Authenticated app
  return (
    <Shell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      userRole={userRole}
      userEmail={session?.user?.email}
      pendingCount={pendingCount}
      lowStockCount={lowStockCount}
    >
      {activeTab === 'client' && userRole === 'client' && (
        <ClientBookingPortal onNavigateToDesk={() => setActiveTab('receptionist')} />
      )}
      {activeTab === 'receptionist' && userRole === 'receptionist' && (
        <ReceptionistDashboard />
      )}
      {activeTab === 'therapist' && userRole === 'therapist' && (
        <TherapistScheduleView />
      )}
      {activeTab === 'simulator' && userRole === 'receptionist' && (
        <ConstraintSimulator />
      )}
      {activeTab === 'sql' && userRole === 'receptionist' && <SqlSchemaViewer />}
    </Shell>
  );
}
