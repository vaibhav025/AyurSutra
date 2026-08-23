import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  Clock,
  FileText,
  CheckCircle2,
  Play,
  Star,
  MapPin,
  Droplets,
  ChevronDown,
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import type { Booking, Therapist } from '../types/ayursutra';
import { MedicalReportModal } from './MedicalReportModal';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  EmptyState,
  Avatar,
} from './ui';

export const TherapistScheduleView: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>(
    () => therapists[1]?.id || 'tp-2'
  );
  const [bookings, setBookings] = useState<Booking[]>(() => ayurEngine.getBookings());
  const [selectedReportBooking, setSelectedReportBooking] = useState<Booking | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapists(ayurEngine.getTherapists());
      setBookings(ayurEngine.getBookings());
    });
  }, []);

  const currentTherapist =
    therapists.find((th) => th.id === selectedTherapistId) || therapists[0];

  // Confirmed + pending slots for this therapist (preserved)
  const therapistBookings = bookings
    .filter(
      (b) =>
        b.therapist_id === selectedTherapistId &&
        ['Confirmed', 'Pending'].includes(b.status)
    )
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const handleStartSession = (bookingId: string) => {
    setActiveSessionId(bookingId);
    ayurEngine.addAuditLog(
      'RPC_CALL',
      `Session Commenced by ${currentTherapist.name}`,
      'Patient session in progress. Warm medicated oil stream initiated.',
      'info'
    );
  };

  const handleCompleteSession = (bookingId: string) => {
    setActiveSessionId(null);
    ayurEngine.addAuditLog(
      'RPC_CALL',
      `Session Completed by ${currentTherapist.name}`,
      'Panchakarma session successfully completed and recorded.',
      'success'
    );
  };

  const hourNow = new Date().getHours();

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow={new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        title="My schedule"
        description="Today's treatment timeline with chamber assignments and pre-treatment notes."
      />

      {/* Practitioner header card */}
      <Card className="p-5 sm:p-6 bg-forest-deep border-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar src={currentTherapist?.avatar_url} name={currentTherapist?.name ?? ''} size={56} ring />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-semibold text-white truncate">
                  {currentTherapist?.name}
                </h2>
                <span className="inline-flex px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-sage backdrop-blur-sm">
                  {currentTherapist?.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/60 truncate">
                {currentTherapist?.title} · {currentTherapist?.specialization}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label htmlFor="therapist-switch" className="block text-[11px] font-medium text-sage mb-1.5">
              Switch practitioner view
            </label>
            <div className="relative">
              <select
                id="therapist-switch"
                value={selectedTherapistId}
                onChange={(e) => setSelectedTherapistId(e.target.value)}
                className="w-full sm:w-64 h-11 rounded-xl bg-white/10 border border-white/15 pl-3 pr-10 text-xs font-medium text-white focus:outline-none focus:border-sage cursor-pointer appearance-none"
              >
                {therapists.map((th) => (
                  <option key={th.id} value={th.id} className="text-charcoal">
                    {th.name} · {th.status}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="w-4 h-4 text-sage absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <dl className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Experience', `${currentTherapist?.experience_years} yrs`],
            ['Sessions done', `${currentTherapist?.completed_sessions}`],
            ['Rating', `${currentTherapist?.rating} / 5`],
            ["Today's slots", `${therapistBookings.length}`],
          ].map(([k, v], i) => (
            <div key={k} className={`rounded-xl bg-white/[0.05] border border-white/[0.07] py-3 ${i === 3 ? 'text-gold' : 'text-white'}`}>
              <dt className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{k}</dt>
              <dd className="mt-1 font-display text-lg font-semibold inline-flex items-center gap-1">
                {(k === 'Rating') && <Star className="w-3.5 h-3.5 fill-current" />}
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Timeline */}
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-forest-deep">
            <CalendarDays className="w-4 h-4 text-forest" /> Today's treatments
          </h2>
          <Badge tone="brand">{therapistBookings.length} sessions</Badge>
        </div>

        {therapistBookings.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="Your schedule is clear"
            description="New sessions will appear here as soon as reception confirms them."
          />
        ) : (
          <ol className="relative space-y-4 before:absolute before:left-[124px] before:top-2 before:bottom-2 before:w-px before:bg-line">
            {therapistBookings.map((b) => {
              const isSessionActive = activeSessionId === b.id;
              const therapy = b.therapy;
              const room = b.room;
              const startHour = new Date(b.start_time).getHours();
              const isPast = startHour < hourNow && !isSessionActive;

              return (
                <li key={b.id} className="relative flex gap-4">
                  {/* Time marker */}
                  <div className="w-[104px] shrink-0 pt-4 text-right">
                    <p className={`font-mono text-sm font-bold ${isSessionActive ? 'text-forest' : isPast ? 'text-muted' : 'text-charcoal'}`}>
                      {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-muted">{therapy?.duration_mins} min</p>
                  </div>

                  {/* Node */}
                  <span
                    aria-hidden
                    className={`relative z-10 mt-6 w-2.5 h-2.5 shrink-0 rounded-full ring-4 ${
                      isSessionActive
                        ? 'bg-forest ring-sage-soft'
                        : isPast
                          ? 'bg-muted/40 ring-ivory'
                          : 'bg-sage ring-ivory'
                    }`}
                  />

                  {/* Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex-1 rounded-2xl border p-4 sm:p-5 transition-colors ${
                      isSessionActive
                        ? 'bg-mint border-forest/40 shadow-[0_8px_30px_rgba(23,63,53,0.10)]'
                        : 'surface'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/70">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-base font-semibold text-charcoal truncate">{b.client_name}</h3>
                          {b.prakriti && <Badge tone="brand">{b.prakriti}</Badge>}
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">Ref {b.booking_ref} · {b.client_phone}</p>
                      </div>
                      {isSessionActive && (
                        <Badge tone="success" className="animate-pulse shrink-0">
                          <Play className="w-3 h-3 fill-current" /> In progress
                        </Badge>
                      )}
                    </div>

                    <div className="my-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <DetailTile icon={<Droplets className="w-3.5 h-3.5" />} caption="Protocol" title={therapy?.name} sub={therapy?.sanskrit_name} />
                      <DetailTile icon={<Clock className="w-3.5 h-3.5" />} caption="Medicated oil" title={therapy?.oil_type} sub={`${therapy?.oil_required_ml} mL pre-heated`} />
                      <DetailTile icon={<MapPin className="w-3.5 h-3.5" />} caption="Chamber" title={room?.room_name} sub={room?.droni_wood} />
                    </div>

                    {b.medical_notes && (
                      <p className="rounded-xl bg-ivory border border-line px-3.5 py-2.5 text-xs text-muted leading-relaxed italic">
                        “{b.medical_notes}”
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-line/70 flex flex-wrap items-center justify-between gap-3">
                      <Button variant="secondary" size="sm" onClick={() => setSelectedReportBooking(b)} icon={<FileText className="w-4 h-4" />}>
                        Medical dossier
                      </Button>
                      <div className="flex items-center gap-2">
                        {isSessionActive ? (
                          <Button size="sm" onClick={() => handleCompleteSession(b.id)} icon={<CheckCircle2 className="w-4 h-4" />}>
                            Mark complete
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStartSession(b.id)}
                            icon={<Play className="w-3.5 h-3.5 fill-current" />}
                          >
                            Commence session
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <MedicalReportModal booking={selectedReportBooking} onClose={() => setSelectedReportBooking(null)} />
    </div>
  );
};

const DetailTile: React.FC<{
  icon: React.ReactNode;
  caption?: string;
  title?: string;
  sub?: string;
}> = ({ icon, caption, title, sub }) => (
  <div className="rounded-xl bg-ivory border border-line p-3">
    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
      {icon}
      {caption}
    </p>
    <p className="mt-1 font-semibold text-charcoal truncate">{title}</p>
    <p className="text-[11px] text-muted truncate italic">{sub}</p>
  </div>
);
