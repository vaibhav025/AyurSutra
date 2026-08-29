import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Clock3 } from 'lucide-react';
import {
  SidebarContent,
  navForRole,
  type ActiveTab,
} from './SidebarNav';

interface ShellProps {
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  userRole: string;
  userEmail?: string;
  pendingCount: number;
  lowStockCount: number;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  userEmail,
  pendingCount,
  lowStockCount,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = navForRole(userRole);

  return (
    <div className="app-bg min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[264px] shrink-0 flex-col bg-forest-deep">
        <SidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          userEmail={userEmail}
          pendingCount={pendingCount}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="lg:hidden fixed inset-0 z-50 bg-forest-deep/50 backdrop-blur-sm"
            onMouseDown={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute left-0 top-0 h-full w-[280px] bg-forest-deep flex flex-col shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Navigation"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute top-4 right-4 z-10 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userRole={userRole}
                userEmail={userEmail}
                pendingCount={pendingCount}
                onNavigate={() => setMobileOpen(false)}
                variant="mobile"
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 glass border-b border-line">
          <div className="max-w-[1400px] mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="lg:hidden w-10 h-10 -ml-1.5 inline-flex items-center justify-center rounded-xl text-forest-deep hover:bg-sage-soft/60 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <p className="font-display text-sm sm:text-base font-semibold text-forest-deep truncate">
                {nav.find((n) => n.id === activeTab)?.label ?? 'AyurSutra'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {lowStockCount > 0 && (
                <span
                  title={`${lowStockCount} inventory items below threshold`}
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#C9A86A]/10 border border-gold/25 text-[11px] font-semibold text-[#8a6f3c]"
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  {lowStockCount} stock alerts
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-mint border border-sage/25 text-[11px] font-semibold text-forest">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          {children}
        </main>

        <footer className="border-t border-line py-5 px-4 sm:px-8">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted">
            <span>AyurSutra · Panchakarma Care OS  · Made by CodeCrunchers</span>
            <span>PostgreSQL engine · ACID compliant</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
