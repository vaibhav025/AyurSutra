import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Cpu,
  Database,
  Calendar,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { Logo } from './Login';
import { supabase } from '../lib/supabaseClient';

export type ActiveTab = 'client' | 'receptionist' | 'therapist' | 'simulator' | 'sql';

export interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
}

export function navForRole(role: string | null): NavItem[] {
  if (role === 'receptionist')
    return [
      { id: 'receptionist', label: 'Reception Desk', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
      { id: 'simulator', label: 'Constraint Simulator', icon: <Cpu className="w-[18px] h-[18px]" /> },
      { id: 'sql', label: 'SQL & RPC Hub', icon: <Database className="w-[18px] h-[18px]" /> },
    ];
  if (role === 'therapist')
    return [{ id: 'therapist', label: 'My Schedule', icon: <UserCheck className="w-[18px] h-[18px]" /> }];
  return [{ id: 'client', label: 'Book Treatment', icon: <Calendar className="w-[18px] h-[18px]" /> }];
}

const ROLE_LABEL: Record<string, string> = {
  client: 'Patient',
  receptionist: 'Reception',
  therapist: 'Practitioner',
};

export const SidebarContent: React.FC<{
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  userRole: string;
  userEmail?: string;
  pendingCount: number;
  onNavigate?: () => void;
  variant?: 'desktop' | 'mobile';
}> = ({ activeTab, setActiveTab, userRole, userEmail, pendingCount, onNavigate, variant = 'desktop' }) => {
  const nav = navForRole(userRole);
  const initials = (userEmail || 'U').split('@')[0].slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
        <Logo dark />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Primary">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-sage/60">
          Workspace
        </p>
        {nav.map((item) => {
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onNavigate?.();
              }}
              aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 px-3 h-11 rounded-xl text-sm font-medium cursor-pointer ${
                active
                  ? 'text-forest-deep'
                  : 'text-slate-300/80 hover:text-white hover:bg-white/5'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`nav-active-${variant}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-sage-soft shadow-sm"
                />
              )}
              <span className="relative z-10 flex items-center gap-3 w-full">
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.id === 'receptionist' && pendingCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-warning text-white text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
          <span className="w-9 h-9 shrink-0 rounded-full bg-forest flex items-center justify-center text-xs font-bold text-sage ring-1 ring-sage/30">
            {initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-xs font-semibold text-white truncate">
              {ROLE_LABEL[userRole] || 'Member'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/15 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
