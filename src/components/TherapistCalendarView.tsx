import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Clock, User, FileText, 
  CheckCircle2, X, MapPin, Activity, Calendar as CalendarIcon, Sparkles, RotateCcw
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import { supabase } from '../lib/supabaseClient';
import type { Booking, Therapist } from '../types/ayursutra';
import { Button, Badge } from './ui';

const toDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const TherapistCalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [therapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('tp-1');
  const [selectedSession, setSelectedSession] = useState<Booking | null>(null);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setBookings(ayurEngine.getBookings());
    });
  }, []);

  const myBookings = useMemo(() => {
    return bookings.filter(b => 
      b.therapist_id === selectedTherapistId && 
      b.status !== 'Rejected' && 
      b.status !== 'Cancelled'
    );
  }, [bookings, selectedTherapistId]);

  const monthlyStats = useMemo(() => {
    const currentMonthBookings = myBookings.filter(b => {
      const d = new Date(b.start_time);
      return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
    
    return {
      completed: currentMonthBookings.filter(b => b.status === 'Completed').length,
      pending: currentMonthBookings.filter(b => ['Pending', 'Confirmed', 'Scheduled', 'In Progress'].includes(b.status)).length
    };
  }, [myBookings, currentMonth]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    return days;
  }, [currentMonth, daysInMonth, firstDayOfMonth]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const selectedDateStr = toDateString(selectedDate);
  
  const dailySessions = useMemo(() => {
    return myBookings
      .filter(b => b.start_time.startsWith(selectedDateStr))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [myBookings, selectedDateStr]);

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      await supabase.from('bookings').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', bookingId);
      
      const updatedBookings = bookings.map(b => b.id === bookingId ? { ...b, status: 'Completed' } : b);
      setBookings(updatedBookings);
      setSelectedSession(prev => prev ? { ...prev, status: 'Completed' } : null);
      
      ayurEngine.addAuditLog('RPC_CALL', `Session Completed`, `Therapist marked booking as completed.`, 'success');
    } catch (e) {
      console.warn("Failed to update status", e);
    }
  };

  const handleRevertSession = async (booking: Booking) => {
    try {
      // SETTING TO 'Scheduled' TO BREAK THE PAYMENT LOOP
      await supabase.from('bookings').update({ status: 'Scheduled', updated_at: new Date().toISOString() }).eq('id', booking.id);
      
      const updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'Scheduled' } : b);
      setBookings(updatedBookings);
      setSelectedSession(prev => prev ? { ...prev, status: 'Scheduled' } : null);
      
      ayurEngine.addAuditLog('RPC_CALL', `Session Reverted`, `Therapist undid completion for ${booking.client_name}.`, 'warning');
    } catch (e) {
      console.warn("Failed to revert session", e);
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto space-y-6">
      
      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sage mb-1">
            <CalendarIcon className="w-3.5 h-3.5" /> Interactive View
          </p>
          <h1 className="font-display text-2xl font-bold text-forest-deep">Monthly Calendar</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Viewing as:</span>
          <select 
            value={selectedTherapistId}
            onChange={(e) => setSelectedTherapistId(e.target.value)}
            className="bg-white/60 border border-white backdrop-blur-md text-sm font-semibold text-forest-deep rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-sage/30 shadow-sm cursor-pointer"
          >
            {therapists.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        <div className="lg:col-span-7 xl:col-span-8 bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.05)] rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-mint/40 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-display font-bold text-forest-deep flex items-center gap-2">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="hidden sm:flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">{monthlyStats.completed} Completed</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest border border-amber-100">{monthlyStats.pending} Pending</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2.5 rounded-full bg-white/60 hover:bg-white text-forest border border-white/40 shadow-sm transition-all hover:scale-105">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={nextMonth} className="p-2.5 rounded-full bg-white/60 hover:bg-white text-forest border border-white/40 shadow-sm transition-all hover:scale-105">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex sm:hidden items-center gap-2 mb-6">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">{monthlyStats.completed} Completed</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest border border-amber-100">{monthlyStats.pending} Pending</span>
          </div>

          <div className="relative z-10 grid grid-cols-7 gap-2 sm:gap-3 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-sage/80 pb-2">
                {day}
              </div>
            ))}
          </div>

          <div className="relative z-10 grid grid-cols-7 gap-2 sm:gap-3">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[100px] rounded-2xl bg-white/10" />;
              
              const dateStr = toDateString(date);
              const isSelected = selectedDateStr === dateStr;
              const isToday = toDateString(new Date()) === dateStr;
              
              const dayBookings = myBookings.filter(b => b.start_time.startsWith(dateStr));
              
              return (
                <motion.button
                  key={dateStr}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDate(date)}
                  className={`relative min-h-[80px] sm:min-h-[100px] rounded-2xl p-2 sm:p-3 flex flex-col items-center sm:items-start transition-all duration-300 border text-left
                    ${isSelected 
                      ? 'bg-forest text-white border-forest shadow-lg shadow-forest/20' 
                      : isToday 
                        ? 'bg-white/80 border-sage text-forest-deep shadow-sm' 
                        : 'bg-white/30 border-white/40 text-charcoal hover:bg-white/60'
                    }
                  `}
                >
                  <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-white' : 'text-forest-deep'}`}>
                    {date.getDate()}
                  </span>
                  
                  {dayBookings.length > 0 && (
                    <div className="mt-auto w-full flex flex-col gap-1 sm:gap-1.5 pt-2">
                      <span className={`block sm:hidden text-[9px] font-bold text-center ${isSelected ? 'text-mint' : 'text-sage'}`}>
                        {dayBookings.length}
                      </span>
                      <div className="hidden sm:flex flex-col gap-1 w-full">
                        {dayBookings.slice(0, 3).map((b, i) => (
                          <div 
                            key={i} 
                            className={`w-full h-1.5 rounded-full ${b.status === 'Completed' ? 'bg-emerald-400' : isSelected ? 'bg-white/40' : 'bg-forest/30'}`}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className={`text-[9px] font-bold ${isSelected ? 'text-white/70' : 'text-sage'} pl-0.5`}>+{dayBookings.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-3xl p-6 sm:p-7 flex flex-col h-[calc(100vh-8rem)]">
            <div className="mb-6 pb-4 border-b border-sage/20 shrink-0">
              <h3 className="text-xl font-display font-bold text-forest-deep mb-1">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-xs font-semibold text-sage uppercase tracking-wider">
                {dailySessions.length} {dailySessions.length === 1 ? 'Session' : 'Sessions'} Scheduled
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {dailySessions.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <Sparkles className="w-10 h-10 mb-3" />
                    <p className="text-sm font-medium">No sessions booked for this day.</p>
                  </motion.div>
                ) : (
                  dailySessions.map((session, idx) => {
                    const isCompleted = session.status === 'Completed';
                    const isScheduled = session.status === 'Scheduled';
                    
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                          ${isCompleted 
                            ? 'bg-emerald-50/50 border-emerald-100' 
                            : 'bg-white/80 border-white shadow-sm'
                          }
                        `}
                      >
                        <div className={`absolute -left-1.5 top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isCompleted ? 'bg-emerald-400' : 'bg-gold'}`} />
                        
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-1.5 text-forest font-bold text-sm bg-white/50 px-2 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <Badge tone={isCompleted ? 'neutral' : isScheduled ? 'success' : 'brand'}>
                            {session.status}
                          </Badge>
                        </div>

                        <h4 className="font-display font-bold text-lg text-forest-deep mb-1">{session.client_name}</h4>
                        <p className="text-sm text-charcoal font-medium mb-3">{session.therapy?.name}</p>
                        
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {session.room?.room_name || 'Room TBD'}</span>
                          <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {session.prakriti}</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedSession && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-forest-deep/40 backdrop-blur-sm"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-2xl border border-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-br from-forest to-forest-deep p-6 sm:px-8 relative overflow-hidden shrink-0">
                <div aria-hidden className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent)]" />
                <button onClick={() => setSelectedSession(null)} className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <Badge tone={selectedSession.status === 'Completed' ? 'neutral' : selectedSession.status === 'Scheduled' ? 'success' : 'brand'} className="mb-3 bg-white/20 text-white border-none backdrop-blur-md">
                  {selectedSession.status}
                </Badge>
                <h2 className="text-3xl font-display font-bold text-white mb-1">{selectedSession.client_name}</h2>
                <p className="text-mint font-medium text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 
                  {new Date(selectedSession.start_time).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {new Date(selectedSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="p-6 sm:px-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Therapy</span>
                    <span className="font-bold text-forest-deep">{selectedSession.therapy?.name}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Chamber</span>
                    <span className="font-bold text-forest-deep">{selectedSession.room?.room_name || 'TBD'}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Prakriti</span>
                    <span className="font-bold text-forest-deep flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-sage" /> {selectedSession.prakriti}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Contact</span>
                    <span className="font-bold text-forest-deep">{selectedSession.client_phone}</span>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100/60 rounded-2xl p-5">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Medical Notes & Instructions
                  </h4>
                  <p className="text-sm text-amber-900/90 leading-relaxed font-medium">
                    {selectedSession.medical_notes || 'No specific notes provided by the patient.'}
                  </p>
                </div>

                {selectedSession.report_url && (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-100 bg-blue-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900">Medical Document</p>
                        <p className="text-xs text-blue-700/70 truncate max-w-[200px]">{selectedSession.report_file_name}</p>
                      </div>
                    </div>
                    <a href={selectedSession.report_url} target="_blank" rel="noreferrer" className="text-xs font-bold bg-white text-blue-600 px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all">
                      View File
                    </a>
                  </div>
                )}
              </div>

              <div className="p-6 sm:px-8 border-t border-slate-100 bg-white/80 shrink-0 flex items-center gap-3">
                {selectedSession.status === 'Completed' && (
                  <button 
                    onClick={() => handleRevertSession(selectedSession)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-forest flex items-center gap-1.5 underline decoration-slate-300 hover:decoration-forest underline-offset-2 transition-colors mr-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Undo completion
                  </button>
                )}
                
                <div className="flex justify-end gap-3 ml-auto">
                  <Button variant="secondary" onClick={() => setSelectedSession(null)}>Close</Button>
                  {selectedSession.status !== 'Completed' && (
                    <Button 
                      onClick={() => handleMarkCompleted(selectedSession.id)}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 shadow-lg border-none"
                    >
                      Mark as Completed
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};