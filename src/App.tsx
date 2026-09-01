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
import { TherapistCalendarView } from './components/TherapistCalendarView';
import { ayurEngine } from './services/engine';
import { supabase } from './lib/supabaseClient';

export default function App() {
  // Auth & Role State
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState<ActiveTab>('client');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // 1. Setup Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchRoleFromDatabase(session.user.id);
      else setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchRoleFromDatabase(session.user.id);
      else {
        setUserRole(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch REAL Role from Supabase Database profiles table
  const fetchRoleFromDatabase = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const role = data.role || 'client';
        setUserRole(role);

        // Auto-route based on actual database role
        if (role === 'receptionist') setActiveTab('receptionist');
        else if (role === 'therapist') setActiveTab('therapist');
        else setActiveTab('client');
      } else {
        // Fallback default if profile row hasn't populated yet
        setUserRole('client');
        setActiveTab('client');
      }
    } catch (err) {
      console.error("Error fetching user profile role:", err);
      setUserRole('client');
    } finally {
      setAuthLoading(false);
    }
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

  // Login screen (handled by LoginScreen component which includes Sign Up & Role Selector)
  if (!session || !userRole) {
    return <LoginScreen />;
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
      {/* ADDED CALENDAR ROUTING PROPERLY */}
      {activeTab === 'calendar' && userRole === 'therapist' && (
        <TherapistCalendarView />
      )}
      {activeTab === 'simulator' && userRole === 'receptionist' && (
        <ConstraintSimulator />
      )}
      {activeTab === 'sql' && userRole === 'receptionist' && <SqlSchemaViewer />}
    </Shell>
  );
}