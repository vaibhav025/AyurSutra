import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, MapPin, Activity, FileText, CheckCircle2, 
  Play, Lock, Timer, X, Sparkles, User, Award, Star, Calendar as CalendarIcon,
  AlertCircle, Leaf, RotateCcw
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import { supabase } from '../lib/supabaseClient';
import type { Booking, Therapist } from '../types/ayursutra';
import { Button, Badge, Modal, Input } from './ui';

export const TherapistScheduleView: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [therapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('tp-1'); 
  
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({});
  const [sessionCompletedModal, setSessionCompletedModal] = useState<Booking | null>(null);
  const [commenceConfirmModal, setCommenceConfirmModal] = useState<Booking | null>(null);
  const [commenceInput, setCommenceInput] = useState('');

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setBookings(ayurEngine.getBookings());
    });
  }, []);

  const selectedTherapist = therapists.find(t => t.id === selectedTherapistId);
  
  const myBookings = useMemo(() => {
    return bookings.filter(b => 
      b.therapist_id === selectedTherapistId && 
      b.status !== 'Rejected' && 
      b.status !== 'Cancelled'
    );
  }, [bookings, selectedTherapistId]);
  
  const upcomingCount = myBookings.filter(b => ['Pending', 'Confirmed', 'Scheduled'].includes(b.status)).length;

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    myBookings.forEach(b => {
      const dateObj = new Date(b.start_time);
      dateObj.setHours(0, 0, 0, 0);
      const key = dateObj.toISOString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedKeys.map(k => ({
      dateStr: k,
      sessions: groups[k].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    }));
  }, [myBookings]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const next = { ...prev };
        let hasChanges = false;
        
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            hasChanges = true;
          }
        });
        
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Object.entries(activeTimers).forEach(([id, timeLeft]) => {
      if (timeLeft === 0) {
        setActiveTimers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        const booking = myBookings.find(b => b.id === id);
        if (booking) handleCompleteSession(booking);
      }
    });
  }, [activeTimers, myBookings]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const executeCommenceSession = async () => {
    if (!commenceConfirmModal) return;
    const booking = commenceConfirmModal;
    
    try {
      await supabase.from('bookings').update({ status: 'In Progress', updated_at: new Date().toISOString() }).eq('id', booking.id);
      
      const durationSecs = (booking.therapy?.duration_mins || 60) * 60;
      setActiveTimers(prev => ({ ...prev, [booking.id]: durationSecs }));
      
      const updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'In Progress' } : b);
      setBookings(updatedBookings);
      ayurEngine.addAuditLog('RPC_CALL', `Session Commenced`, `${booking.therapy?.name} started for ${booking.client_name}`, 'info');
      
      setCommenceConfirmModal(null);
      setCommenceInput('');
    } catch (e) {
      console.error("Failed to start session", e);
    }
  };

  const handleCompleteSession = async (booking: Booking) => {
    try {
      await supabase.from('bookings').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', booking.id);
      
      setActiveTimers(prev => {
        const next = { ...prev };
        delete next[booking.id];
        return next;
      });
      
      const updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'Completed' } : b);
      setBookings(updatedBookings);
      
      setSessionCompletedModal(booking);
      ayurEngine.addAuditLog('RPC_CALL', `Session Completed`, `${booking.therapy?.name} completed successfully.`, 'success');
    } catch (e) {
      console.error("Failed to complete session", e);
    }
  };

  const handleRevertSession = async (booking: Booking) => {
    try {
      // SETTING TO 'Scheduled' BREAKS THE PAYMENT LOOP FOR PATIENTS!
      await supabase.from('bookings').update({ status: 'Scheduled', updated_at: new Date().toISOString() }).eq('id', booking.id);
      const updatedBookings = bookings.map(b => b.id === booking.id ? { ...b, status: 'Scheduled' } : b);
      setBookings(updatedBookings);
      ayurEngine.addAuditLog('RPC_CALL', `Session Reverted`, `Therapist undid completion for ${booking.client_name}.`, 'warning');
    } catch (e) {
      console.error("Failed to revert session", e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 relative pb-20">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-forest-deep">My Schedule</h1>
        <Badge tone="brand" className="self-start sm:self-auto bg-red-500 text-white border-none shadow-sm shadow-red-500/20">Live Sync</Badge>
      </div>

      {selectedTherapist && (
        <div className="bg-forest-deep rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
          <div aria-hidden className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.4), transparent 50%)' }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
            <div className="flex items-center gap-5">
              <img src={selectedTherapist.avatar_url} alt={selectedTherapist.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 object-cover shadow-lg bg-forest" />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl font-display font-bold">{selectedTherapist.name}</h2>
                  <Badge tone="success" className="bg-emerald-500/20 text-emerald-300 border-none uppercase tracking-widest text-[9px]">{selectedTherapist.status}</Badge>
                </div>
                <p className="text-sm text-sage-soft max-w-md leading-relaxed opacity-90">{selectedTherapist.title} · {selectedTherapist.specialization}</p>
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-bold mb-1.5 px-1">Switch practitioner view</p>
              <select 
                value={selectedTherapistId}
                onChange={(e) => setSelectedTherapistId(e.target.value)}
                className="w-full bg-forest text-white border-none rounded-xl px-4 py-2.5 text-sm font-semibold outline-none cursor-pointer hover:bg-forest/80 transition-colors"
              >
                {therapists.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {t.status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Experience</p>
              <p className="text-xl sm:text-2xl font-display font-bold">{selectedTherapist.experience_years} yrs</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Sessions Done</p>
              <p className="text-xl sm:text-2xl font-display font-bold">{selectedTherapist.completed_sessions}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Rating</p>
              <p className="text-xl sm:text-2xl font-display font-bold flex items-center justify-center gap-1.5">
                <Star className="w-4 h-4 text-gold fill-current" /> {selectedTherapist.rating} / 5
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-gold/80 mb-1">Upcoming Slots</p>
              <p className="text-xl sm:text-2xl font-display font-bold text-gold">{upcomingCount}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        {groupedBookings.length === 0 ? (
          <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-10 rounded-3xl text-center shadow-sm">
            <CalendarIcon className="w-12 h-12 text-sage opacity-50 mx-auto mb-4" />
            <h3 className="text-lg font-display font-bold text-forest-deep mb-1">No sessions assigned</h3>
            <p className="text-sm text-slate-500">Your agenda is clear for now.</p>
          </div>
        ) : (
          groupedBookings.map((group) => {
            const groupDate = new Date(group.dateStr);
            return (
              <div key={group.dateStr} className="mb-10 last:mb-0 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-sage/20 sticky top-0 bg-app-bg/80 backdrop-blur-md z-10 py-2">
                  <CalendarIcon className="w-5 h-5 text-forest" />
                  <h3 className="text-xl font-display font-bold text-forest-deep">
                    {groupDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <Badge tone="neutral" className="ml-auto bg-white shadow-sm border-slate-200">
                    {group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {group.sessions.map((session) => {
                    const sessionStartTime = new Date(session.start_time);
                    const isCompleted = session.status === 'Completed';
                    const isInProgress = session.status === 'In Progress';
                    const isScheduled = session.status === 'Scheduled';
                    const isAwaitingApprovalOrPayment = ['Pending', 'Confirmed'].includes(session.status);
                    
                    return (
                      <motion.div 
                        key={session.id}
                        layout
                        className={`bg-white/70 backdrop-blur-2xl border p-5 sm:p-6 rounded-3xl shadow-sm transition-all duration-300
                          ${isCompleted ? 'border-emerald-100 bg-emerald-50/30 opacity-80' : isInProgress ? 'border-sage shadow-md ring-2 ring-sage/20' : 'border-white'}
                        `}
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          
                          <div className="w-full md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/60 pb-4 md:pb-0 md:pr-4 flex flex-row md:flex-col items-center justify-between md:justify-start gap-2">
                            <div className="text-left md:text-right w-full">
                              <p className="text-lg font-display font-bold text-forest-deep">{sessionStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              <p className="text-xs font-semibold text-slate-400 mt-0.5">{session.therapy?.duration_mins} min duration</p>
                            </div>
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 self-end">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            ) : (
                              <div className={`w-3 h-3 rounded-full md:mt-2 self-end ${isInProgress ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-slate-300'}`} />
                            )}
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-display font-bold text-forest-deep">{session.client_name}</h3>
                              <Badge tone="neutral" className="bg-white border-slate-200 text-slate-600 shadow-sm">{session.prakriti}</Badge>
                              <Badge tone={isCompleted ? 'neutral' : isScheduled ? 'success' : 'brand'}>{session.status}</Badge>
                            </div>
                            
                            <p className="text-xs text-slate-500 font-medium">Ref {session.booking_ref} · {session.client_phone}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                                  <Activity className="w-3.5 h-3.5" /> Protocol
                                </p>
                                <p className="text-sm font-semibold text-forest-deep">{session.therapy?.name}</p>
                                <p className="text-[11px] text-slate-500 italic truncate mt-0.5">{session.therapy?.sanskrit_name}</p>
                              </div>
                              
                              <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                                  <Leaf className="w-3.5 h-3.5" /> Medicated Formulation
                                </p>
                                <p className="text-sm font-semibold text-forest-deep truncate">{session.therapy?.oil_type}</p>
                                {session.therapy?.oil_required_ml ? (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{session.therapy?.oil_required_ml} mL pre-heated</p>
                                ) : null}
                              </div>

                              <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                                  <MapPin className="w-3.5 h-3.5" /> Chamber
                                </p>
                                <p className="text-sm font-semibold text-forest-deep">{session.room?.room_name || 'TBD'}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{session.room?.droni_wood || 'Standard Setup'}</p>
                              </div>
                            </div>

                            {session.medical_notes && (
                              <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3 flex items-start gap-2">
                                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-900/80 font-medium leading-relaxed">{session.medical_notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="w-full md:w-48 shrink-0 flex flex-col justify-end pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200/60 md:pl-4">
                            {isCompleted ? (
                              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100 w-full h-full flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-1 text-emerald-600">
                                   <CheckCircle2 className="w-5 h-5" />
                                   <span className="text-xs font-bold uppercase tracking-widest">Completed</span>
                                </div>
                                <button 
                                  onClick={() => handleRevertSession(session)} 
                                  className="text-[10px] font-semibold text-slate-500 hover:text-forest flex items-center gap-1.5 underline decoration-slate-300 hover:decoration-forest underline-offset-2 transition-colors mr-auto"
                                >
                                   <RotateCcw className="w-3.5 h-3.5" /> Undo completion
                                </button>
                              </div>
                            ) : isInProgress ? (
                              <div className="space-y-3 w-full">
                                <div className="bg-forest rounded-xl p-4 text-center border border-forest-deep shadow-inner relative overflow-hidden">
                                  <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                                  <p className="text-[10px] font-bold text-sage uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                    <Timer className="w-3.5 h-3.5" /> Time Remaining
                                  </p>
                                  <p className="text-3xl font-display font-bold text-white tracking-tight tabular-nums">
                                    {formatTime(activeTimers[session.id] || 0)}
                                  </p>
                                </div>
                                <Button 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md hover:shadow-lg transition-all" 
                                  icon={<CheckCircle2 className="w-4 h-4" />}
                                  onClick={() => handleCompleteSession(session)}
                                >
                                  Finish Early
                                </Button>
                              </div>
                            ) : isScheduled ? (
                              <div className="w-full h-full flex items-end">
                                <Button 
                                  className="w-full h-12 bg-forest hover:bg-forest-deep text-white shadow-md hover:-translate-y-0.5 transition-all"
                                  icon={<Play className="w-4 h-4" />}
                                  onClick={() => setCommenceConfirmModal(session)}
                                >
                                  Commence
                                </Button>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col justify-center text-center p-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                                <span className="text-xs font-semibold text-slate-500">Awaiting payment or reception approval.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {commenceConfirmModal && (
          <Modal open onClose={() => { setCommenceConfirmModal(null); setCommenceInput(''); }} title="Verify Commencement" maxWidth="max-w-sm">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to start the <span className="font-bold text-forest-deep">{commenceConfirmModal.therapy?.name}</span> session for <span className="font-bold text-forest-deep">{commenceConfirmModal.client_name}</span>. The timer will begin immediately.
              </p>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <p className="text-xs text-amber-800 font-medium mb-2">To confirm and prevent accidental starts, please type <strong>YES</strong> below:</p>
                <Input 
                  value={commenceInput}
                  onChange={(e) => setCommenceInput(e.target.value)}
                  placeholder="Type YES"
                  className="bg-white uppercase"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setCommenceConfirmModal(null); setCommenceInput(''); }}>Cancel</Button>
                <Button 
                  disabled={commenceInput.trim().toUpperCase() !== 'YES'}
                  onClick={executeCommenceSession}
                  icon={<Play className="w-4 h-4" />}
                >
                  Start Session
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sessionCompletedModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            >
              <div aria-hidden className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15), transparent 70%)' }} />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15, delay: 0.1 }}
                className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-inner relative z-10"
              >
                <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-2xl font-display font-bold text-forest-deep mb-2 relative z-10">Session Completed!</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed relative z-10">
                <span className="text-charcoal font-bold">{sessionCompletedModal.therapy?.name}</span> for <span className="text-charcoal font-bold">{sessionCompletedModal.client_name}</span> has been successfully logged. The clinic inventory and monthly calendar have been updated.
              </p>
              
              <Button
                size="lg"
                className="w-full relative z-10"
                onClick={() => setSessionCompletedModal(null)}
              >
                Done
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};