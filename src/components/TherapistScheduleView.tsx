import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle, 
  Play, 
  Layers
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import { Booking, Therapist } from '../types/ayursutra';
import { MedicalReportModal } from './MedicalReportModal';

export const TherapistScheduleView: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(() => therapists[1]?.id || 'tp-2');
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [selectedReportBooking, setSelectedReportBooking] = useState<Booking | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapists(ayurEngine.getTherapists());
      setBookings(ayurEngine.getBookings());
    });
  }, []);

  const currentTherapist = therapists.find((th) => th.id === selectedTherapistId) || therapists[0];

  // Fetch confirmed slots for this therapist
  const therapistBookings = bookings.filter(
    (b) => b.therapist_id === selectedTherapistId && ['Confirmed', 'Pending'].includes(b.status)
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const handleStartSession = (bookingId: string) => {
    setActiveSessionId(bookingId);
    ayurEngine.addAuditLog(
      'RPC_CALL',
      `Session Commenced by ${currentTherapist.name}`,
      `Patient session in progress. Warm medicated oil stream initiated.`,
      'info'
    );
  };

  const handleCompleteSession = (bookingId: string) => {
    setActiveSessionId(null);
    ayurEngine.addAuditLog(
      'RPC_CALL',
      `Session Completed by ${currentTherapist.name}`,
      `Panchakarma session successfully completed and recorded.`,
      'success'
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Vaidya Profile Card (Professional Polish Dark Card) */}
      <div className="bg-[#2D3A3A] text-white rounded-xl p-6 sm:p-7 shadow-md space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <img
              src={currentTherapist?.avatar_url}
              alt={currentTherapist?.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#8B9D83] shadow-sm"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#8B9D83]/20 text-[#8B9D83] border border-[#8B9D83]/30">
                  {currentTherapist?.status}
                </span>
                <span className="text-xs text-slate-300 font-mono">⭐ {currentTherapist?.rating} / 5.0</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                {currentTherapist?.name}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentTherapist?.title} • {currentTherapist?.specialization}
              </p>
            </div>
          </div>

          {/* Practitioner Switcher Dropdown */}
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] text-slate-300 mb-1 font-medium">
              Switch Practitioner View:
            </label>
            <select
              value={selectedTherapistId}
              onChange={(e) => setSelectedTherapistId(e.target.value)}
              className="w-full sm:w-60 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B9D83]"
            >
              {therapists.map((th) => (
                <option key={th.id} value={th.id} className="text-slate-900">
                  {th.name} ({th.specialization.split('&')[0]})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Practitioner Quick Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-center">
          <div className="p-2.5 rounded-lg bg-white/5">
            <p className="text-[11px] text-slate-300">Experience</p>
            <p className="text-sm font-bold text-white">{currentTherapist?.experience_years} Years</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5">
            <p className="text-[11px] text-slate-300">Total Treated</p>
            <p className="text-sm font-bold text-white">{currentTherapist?.completed_sessions} Patients</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5">
            <p className="text-[11px] text-slate-300">Today's Sessions</p>
            <p className="text-sm font-bold text-[#8B9D83]">{therapistBookings.length} Slots</p>
          </div>
        </div>

      </div>

      {/* Today's Schedule Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-sm space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#8B9D83]" />
            <h2 className="text-lg font-serif font-bold text-slate-900">
              Today's Panchakarma Treatment Schedule
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
            {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {therapistBookings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle className="w-8 h-8 text-[#8B9D83] mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No scheduled sessions for this practitioner today</p>
            <p className="text-xs text-slate-400 mt-1">
              New bookings will appear dynamically as receptionist confirms them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {therapistBookings.map((b, idx) => {
              const isSessionActive = activeSessionId === b.id;
              const therapy = b.therapy;
              const room = b.room;

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isSessionActive
                      ? 'bg-[#8B9D83]/10 border-[#8B9D83] ring-1 ring-[#8B9D83] shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Session Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-serif font-bold text-slate-900">
                            {b.client_name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {b.prakriti || 'Vata-Pitta'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Ref: {b.booking_ref} • {b.client_phone}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-mono font-bold text-slate-800 block">
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] text-slate-400">{therapy?.duration_mins} Minutes Session</span>
                    </div>
                  </div>

                  {/* Therapy & Chamber Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Therapy Protocol</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{therapy?.name}</span>
                      <span className="text-[11px] text-slate-500 italic">{therapy?.sanskrit_name}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Medicated Oil & Volume</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{therapy?.oil_type}</span>
                      <span className="text-[11px] font-mono font-medium text-slate-700">{therapy?.oil_required_ml} mL Pre-heated</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Droni Chamber Suite</span>
                      <span className="font-semibold text-slate-800 mt-0.5 block">{room?.room_name}</span>
                      <span className="text-[11px] text-slate-500">{room?.droni_wood}</span>
                    </div>
                  </div>

                  {/* Client Medical Instructions */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700 block mb-0.5">Vaidya Pre-Treatment Notes:</span>
                    <p className="text-slate-600 italic">
                      "{b.medical_notes || 'Focus oleation on upper back and cervical vertebrae. Keep warm steam cabinet ready for 10 mins swedana post-therapy.'}"
                    </p>
                  </div>

                  {/* Action Bar: View Report + Start/Finish */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    
                    {/* View Report Button */}
                    <button
                      onClick={() => setSelectedReportBooking(b)}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-[#8B9D83]" />
                      <span>Open Medical Dossier PDF</span>
                    </button>

                    {/* Start / Finish Controls */}
                    <div className="flex items-center space-x-2">
                      {isSessionActive ? (
                        <button
                          onClick={() => handleCompleteSession(b.id)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm flex items-center space-x-1.5 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Session Completed</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartSession(b.id)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2D3A3A] hover:bg-[#1E2525] shadow-sm flex items-center space-x-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Commence Session</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Medical Report Dossier Modal */}
      <MedicalReportModal
        booking={selectedReportBooking}
        onClose={() => setSelectedReportBooking(null)}
      />

    </div>
  );
};
