import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ClientBookingPortal } from './components/ClientBookingPortal';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { TherapistScheduleView } from './components/TherapistScheduleView';
import { ConstraintSimulator } from './components/ConstraintSimulator';
import { SqlSchemaViewer } from './components/SqlSchemaViewer';
import { ayurEngine } from './services/engine';
import { ShieldCheck, Database, Droplet } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('client');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

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

  return (
    <div className="min-h-screen bg-[#F8F9F8] text-slate-800 font-sans flex flex-col antialiased selection:bg-[#8B9D83]/30 selection:text-[#2D3A3A]">
      
      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        lowStockCount={lowStockCount}
      />

      {/* Main Applet Body */}
      <main className="flex-1">
        {activeTab === 'client' && (
          <ClientBookingPortal
            onNavigateToDesk={() => setActiveTab('receptionist')}
            onBookingSuccess={() => {}}
          />
        )}

        {activeTab === 'receptionist' && (
          <ReceptionistDashboard />
        )}

        {activeTab === 'therapist' && (
          <TherapistScheduleView />
        )}

        {activeTab === 'simulator' && (
          <ConstraintSimulator />
        )}

        {activeTab === 'sql' && (
          <SqlSchemaViewer />
        )}
      </main>

      {/* Professional Polish Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-[#8B9D83] flex items-center justify-center text-white text-xs font-bold font-serif">
              A
            </div>
            <span className="font-serif font-bold text-[#2D3A3A] text-sm">AyurSutra</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium">Panchakarma Scheduling Engine</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ACID Stored Procedure
            </span>
            <span className="text-slate-200">•</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Database className="w-3.5 h-3.5 text-[#8B9D83]" />
              Supabase Realtime & Storage
            </span>
            <span className="text-slate-200">•</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Droplet className="w-3.5 h-3.5 text-orange-500" />
              Inventory Auto-Hold
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            © 2026 AyurSutra Panchakarma OS • Professional Edition
          </p>
        </div>
      </footer>

    </div>
  );
}
