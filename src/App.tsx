import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ClientBookingPortal } from './components/ClientBookingPortal';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { TherapistScheduleView } from './components/TherapistScheduleView';
import { ConstraintSimulator } from './components/ConstraintSimulator';
import { SqlSchemaViewer } from './components/SqlSchemaViewer';
import { ayurEngine } from './services/engine';
import { supabase } from './lib/supabaseClient';
import { ShieldCheck, Database, Droplet, LockKeyhole } from 'lucide-react';

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) fetchRole(session.user.email);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. HACKATHON SHORTCUT: Assign roles based on email instead of missing profiles table
  const fetchRole = (email: string) => {
    let role = 'client'; // default
    if (email.includes('admin')) role = 'receptionist';
    if (email.includes('doctor')) role = 'therapist';

    setUserRole(role);
    
    // Automatically switch to correct tab based on role
    if (role === 'receptionist') setActiveTab('receptionist');
    else if (role === 'therapist') setActiveTab('therapist');
    else setActiveTab('client');
    
    setAuthLoading(false);
  };

  // Metrics listener for Navbar
  useEffect(() => {
    const updateMetrics = () => {
      const bookings = ayurEngine.getBookings();
      const inventory = ayurEngine.getInventory();
      setPendingCount(bookings.filter((b) => b.status === 'Pending').length);
      setLowStockCount(inventory.filter((i) => i.stock_ml <= i.min_threshold_ml).length);
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

  // --- RENDER LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#2D3A3A] text-white font-serif text-xl">Loading AyurSutra Security...</div>;

  if (!session || !userRole) {
    return (
      <div className="min-h-screen bg-[#F8F9F8] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-[#2D3A3A] p-6 text-center text-white">
            <div className="w-12 h-12 bg-[#8B9D83] rounded-full flex items-center justify-center mx-auto mb-3 font-serif font-bold text-xl shadow-md">A</div>
            <h2 className="text-2xl font-serif font-bold">AyurSutra Login</h2>
            <p className="text-xs text-slate-300 mt-1">Secure Identity Verification</p>
          </div>
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-semibold">{loginError}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#8B9D83]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#8B9D83]" />
            </div>
            <button type="submit" disabled={authLoading} className="w-full py-2.5 rounded-lg font-serif font-bold text-sm bg-[#8B9D83] text-white hover:bg-[#7a8c72] transition-colors flex items-center justify-center gap-2 mt-4">
              <LockKeyhole className="w-4 h-4" /> Secure Login
            </button>
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-mono">
              <p>Demo Accounts:</p>
              <p>• admin@ayursutra.com (Receptionist)</p>
              <p>• doctor@ayursutra.com (Therapist)</p>
              <p>• patient@ayursutra.com (Client)</p>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP IF AUTHENTICATED ---
  return (
    <div className="min-h-screen bg-[#F8F9F8] text-slate-800 font-sans flex flex-col antialiased selection:bg-[#8B9D83]/30 selection:text-[#2D3A3A]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingCount} lowStockCount={lowStockCount} userRole={userRole} />

      <main className="flex-1">
        {activeTab === 'client' && userRole === 'client' && <ClientBookingPortal onNavigateToDesk={() => setActiveTab('receptionist')} />}
        {activeTab === 'receptionist' && userRole === 'receptionist' && <ReceptionistDashboard />}
        {activeTab === 'therapist' && userRole === 'therapist' && <TherapistScheduleView />}
        {activeTab === 'simulator' && userRole === 'receptionist' && <ConstraintSimulator />}
        {activeTab === 'sql' && userRole === 'receptionist' && <SqlSchemaViewer />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <span className="font-serif font-bold text-[#2D3A3A] text-sm">AyurSutra</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ACID Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}