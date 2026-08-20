import React from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  UserCheck, 
  Cpu, 
  Database, 
  RotateCcw, 
  Droplet, 
  ShieldCheck
} from 'lucide-react';
import { ayurEngine } from '../services/engine';

export type ActiveTab = 'client' | 'receptionist' | 'therapist' | 'simulator' | 'sql';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  lowStockCount,
}) => {
  const handleReset = () => {
    if (window.confirm('Reset all AyurSutra bookings, inventory, and rooms to initial authentic seed data?')) {
      ayurEngine.resetToDefaults();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2D3A3A] text-white shadow-sm">
      {/* Micro Status Bar */}
      <div className="bg-[#232D2D] px-4 py-1 text-xs border-b border-white/5 flex items-center justify-between text-slate-300">
        <div className="hidden sm:flex items-center space-x-2 text-[11px]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-medium">PostgreSQL Multi-Variable Constraint Engine Active</span>
        </div>
        <div className="mx-auto sm:mx-0 flex items-center space-x-2 text-[11px]">
          <span className="font-serif font-bold text-[#8B9D83] tracking-wide">आयुर्वेदः सुखप्रदः</span>
          <span className="text-white/30">•</span>
          <span className="text-slate-300">AyurSutra Panchakarma Unit</span>
        </div>
        <div className="hidden sm:flex items-center space-x-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-300">
            <Droplet className="w-3 h-3 text-[#8B9D83]" />
            Stock Auto-Reserved
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            ACID Transaction
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none" 
            onClick={() => setActiveTab('client')}
          >
            <div className="w-9 h-9 bg-[#8B9D83] rounded-full flex items-center justify-center text-white font-serif font-bold text-base shadow-sm">
              A
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-serif font-bold tracking-tight text-white">
                  AyurSutra
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#8B9D83] font-semibold">
                  v2.6
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans -mt-0.5">
                Panchakarma Scheduling Engine
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('client')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'client'
                  ? 'bg-[#8B9D83] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Client Booking</span>
            </button>

            <button
              onClick={() => setActiveTab('receptionist')}
              className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'receptionist'
                  ? 'bg-[#8B9D83] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Receptionist Desk</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-400 text-slate-900">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('therapist')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'therapist'
                  ? 'bg-[#8B9D83] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Therapist View</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-[#8B9D83] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Constraint Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'sql'
                  ? 'bg-[#8B9D83] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>SQL & RPC Hub</span>
            </button>
          </nav>

          {/* Right Action Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {lowStockCount > 0 && (
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                <span>{lowStockCount} Low Stock</span>
              </div>
            )}

            <button
              onClick={handleReset}
              title="Reset state to initial authentic demo data"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#8B9D83]" />
              <span className="hidden sm:inline">Reset Seed</span>
            </button>
          </div>

        </div>

        {/* Mobile View Switcher Menu */}
        <div className="flex lg:hidden overflow-x-auto space-x-1 py-2 border-t border-white/10 scrollbar-none">
          {[
            { id: 'client', label: 'Client Booking', icon: Calendar },
            { id: 'receptionist', label: `Desk (${pendingCount})`, icon: LayoutDashboard },
            { id: 'therapist', label: 'Therapist', icon: UserCheck },
            { id: 'simulator', label: 'Simulator', icon: Cpu },
            { id: 'sql', label: 'SQL Hub', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 whitespace-nowrap rounded-lg text-xs font-medium ${
                  isActive
                    ? 'bg-[#8B9D83] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
