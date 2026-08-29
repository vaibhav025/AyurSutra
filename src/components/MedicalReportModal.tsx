import React from 'react';
import {
  FileText,
  ExternalLink,
  ShieldCheck,
  Phone,
  Mail,
  FileWarning
} from 'lucide-react';
import { Booking } from '../types/ayursutra';
import { Modal, Button, StatusBadge } from './ui';

interface MedicalReportModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({
  booking,
  onClose,
}) => {
  if (!booking) return null;

  const fileName =
    booking.report_file_name ||
    `${booking.client_name.toLowerCase().replace(/\s+/g, '_')}_ayurvedic_dossier.pdf`;
  const therapy = booking.therapy;
  const therapist = booking.therapist;
  const room = booking.room;

  return (
    <Modal
      open
      onClose={onClose}
      title="Medical dossier"
      subtitle={`${booking.client_name} · ${booking.booking_ref}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Patient overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoTile caption="Patient" value={booking.client_name} />
          <InfoTile caption="Prakriti" value={booking.prakriti || 'Vata-Pitta'} accent />
          <InfoTile caption="Status" value={<StatusBadge status={booking.status} />} />
          <InfoTile caption="Vaidya" value={therapist?.name || 'Unassigned'} />
        </div>

        {/* NEW: Patient Contact & Notes */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Patient Contact & Notes
          </h4>
          <div className="rounded-xl bg-ivory border border-line p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Phone Number</p>
                  <p className="text-xs font-semibold text-charcoal truncate">{booking.client_phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Email Address</p>
                  <p className="text-xs font-semibold text-charcoal truncate">{booking.client_email || 'Not provided'}</p>
                </div>
              </div>
            </div>
            <div className="p-3.5 bg-mint/30 rounded-xl border border-sage/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-forest-deep flex items-center gap-1.5 mb-1.5">
                <FileWarning className="w-3.5 h-3.5" /> Medical Symptoms / Requests
              </p>
              <p className="text-xs text-charcoal leading-relaxed font-medium">
                {booking.medical_notes || 'No specific medical notes provided by the patient.'}
              </p>
            </div>
          </div>
        </section>

        {/* Dosha assessment */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Dosha balance assessment
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Vata', pct: 72, note: 'Elevated', tone: 'warning' },
              { name: 'Pitta', pct: 58, note: 'Moderate', tone: 'neutral' },
              { name: 'Kapha', pct: 34, note: 'Balanced', tone: 'success' },
            ].map((d) => (
              <div key={d.name} className="rounded-xl bg-ivory border border-line p-3.5 text-center">
                <p className="text-[11px] font-medium text-muted">{d.name}</p>
                <p className="mt-1 font-display text-lg font-semibold text-forest-deep">{d.pct}%</p>
                <p
                  className={`text-[10px] font-semibold mt-0.5 ${
                    d.tone === 'warning'
                      ? 'text-warning'
                      : d.tone === 'success'
                        ? 'text-success'
                        : 'text-muted'
                  }`}
                >
                  {d.note}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-sage-soft/70 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      d.tone === 'warning' ? 'bg-warning' : d.tone === 'success' ? 'bg-success' : 'bg-sage'
                    }`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Prescribed protocol */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Prescribed protocol & specifications
          </h4>
          <dl className="rounded-xl bg-ivory border border-line divide-y divide-line/70 px-4 text-xs">
            {[
              ['Therapy', `${therapy?.name ?? '—'} (${therapy?.sanskrit_name ?? ''})`],
              ['Formulation', `${therapy?.oil_type ?? '—'} · ${therapy?.oil_required_ml ?? '—'} mL`],
              ['Chamber', room ? `${room.room_name} · ${room.droni_wood}` : '—'],
              [
                'Schedule',
                new Date(booking.start_time).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 py-2.5">
                <dt className="text-muted shrink-0">{k}</dt>
                <dd className="font-semibold text-charcoal text-right truncate">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Document - Will only show 'Open' if report_url exists */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-line px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/60 text-danger flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-charcoal truncate">{fileName}</p>
              <p className="text-[11px] text-muted">PDF document · Supabase Storage</p>
            </div>
          </div>
          {booking.report_url ? (
            <a
              href={booking.report_url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              <Button variant="secondary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open
              </Button>
            </a>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              No File
            </Button>
          )}
        </div>

        {/* Footer note */}
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          Confidential · handled per clinical privacy protocol
        </p>
      </div>
    </Modal>
  );
};

const InfoTile: React.FC<{ caption: string; value: React.ReactNode; accent?: boolean }> = ({
  caption,
  value,
  accent,
}) => (
  <div className="rounded-xl bg-ivory border border-line px-3 py-2.5 min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{caption}</p>
    <div
      className={`mt-1 text-xs font-semibold truncate ${
        accent ? 'text-forest' : 'text-charcoal'
      }`}
    >
      {value || '—'}
    </div>
  </div>
);