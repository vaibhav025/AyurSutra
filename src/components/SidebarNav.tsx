import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Cpu,
  Database,
  Calendar,
  CalendarDays,
  UserCheck,
  LogOut,
  Bell,
  CheckCircle2,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Logo } from './Login';
import { supabase } from '../lib/supabaseClient';
import { ProfileSettingsModal } from './ProfileSettingsModal';
import { ayurEngine } from '../services/engine';
import { Modal, Button } from './ui';
import type { Booking } from '../types/ayursutra';

// ADDED 'calendar' TO ACTIVE TAB
export type ActiveTab = 'client' | 'receptionist' | 'therapist' | 'calendar' | 'simulator' | 'sql';

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
    return [
      { id: 'therapist', label: 'My Schedule', icon: <UserCheck className="w-[18px] h-[18px]" /> },
      // NEW CALENDAR BUTTON FOR VAIDYA
      { id: 'calendar', label: 'Schedule Calendar', icon: <CalendarDays className="w-[18px] h-[18px]" /> }
    ];
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  
  const nav = navForRole(userRole);
  const initials = (userEmail || 'U').split('@')[0].slice(0, 2).toUpperCase();

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setBookings(ayurEngine.getBookings());
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const myNotifications = bookings
    .filter(b => b.client_email === userEmail && (b.status === 'Confirmed' || b.status === 'Rejected'))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const hasUnread = myNotifications.length > 0;

  const handlePayFromNotif = (bookingId: string) => {
    setIsNotifModalOpen(false);
    setActiveTab('client');
    window.dispatchEvent(new CustomEvent('triggerPayment', { detail: bookingId }));
  };

  return (
    <>
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
        <Logo dark />
        {userRole === 'client' && (
          <button 
            onClick={() => setIsNotifModalOpen(true)} 
            className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-forest-deep shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              </>
            )}
          </button>
        )}
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
        <div className="flex items-center justify-between gap-1 px-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-colors">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
            title="Open Profile Settings"
          >
            <span className="w-9 h-9 shrink-0 rounded-full bg-forest flex items-center justify-center text-xs font-bold text-sage ring-1 ring-sage/30 group-hover:bg-forest-deep transition-colors">
              {initials}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-semibold text-white truncate group-hover:text-mint transition-colors">
                {ROLE_LABEL[userRole] || 'Member'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/15 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isProfileModalOpen && (
        <ProfileSettingsModal onClose={() => setIsProfileModalOpen(false)} />
      )}

      {typeof document !== 'undefined' && createPortal(
        <div className="relative z-[99999]">
          <AnimatePresence>
            {isNotifModalOpen && (
              <Modal open onClose={() => setIsNotifModalOpen(false)} title="Updates & Alerts" maxWidth="max-w-md">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {myNotifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">You have no new updates.</p>
                    </div>
                  ) : (
                    myNotifications.map(b => (
                      <div key={b.id} className={`p-4 rounded-2xl border ${b.status === 'Confirmed' ? 'bg-mint/30 border-sage/30' : 'bg-red-50 border-red-100'}`}>
                        <div className="flex items-start gap-3">
                          {b.status === 'Confirmed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          )}
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className={`text-sm font-bold ${b.status === 'Confirmed' ? 'text-forest-deep' : 'text-red-900'}`}>
                                {b.status === 'Confirmed' ? 'Booking Approved!' : 'Booking Declined'}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {new Date(b.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <p className={`text-xs mt-1 leading-relaxed ${b.status === 'Confirmed' ? 'text-forest/80' : 'text-red-700/80'}`}>
                              {b.status === 'Confirmed' 
                                ? `Your slot for ${b.therapy?.name} on ${new Date(b.start_time).toLocaleDateString()} is locked. Please complete the payment of ₹${b.therapy?.price} to secure it.`
                                : `We couldn't confirm ${b.therapy?.name}. Reason: ${b.rejection_reason || 'Schedule conflict'}. Please book another slot.`
                              }
                            </p>

                            {b.status === 'Confirmed' && (
                              <div className="mt-3 pt-3 border-t border-sage/20 flex justify-end">
                                <Button size="sm" onClick={() => handlePayFromNotif(b.id)} icon={<CreditCard className="w-3.5 h-3.5" />}>
                                  Pay ₹{b.therapy?.price} Now
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Modal>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  );
};