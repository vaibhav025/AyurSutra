import React from 'react';
import {
  FileText,
  ExternalLink,
  ShieldCheck,
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
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Patient overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InfoTile caption="Patient" value={booking.client_name} />
          <InfoTile caption="Prakriti" value={booking.prakriti || 'Vata-Pitta'} accent />
          <InfoTile caption="Status" value={<StatusBadge status={booking.status} />} />
          <InfoTile caption="Vaidya" value={therapist?.name || 'Unassigned'} />
        </div>

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
          {booking.medical_notes && (
            <p className="rounded-xl bg-mint/60 border border-sage/25 px-4 py-3 text-xs leading-relaxed text-forest-deep">
              <strong className="font-semibold">Clinical notes: </strong>
              {booking.medical_notes}
            </p>
          )}
        </section>

        {/* Document */}
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
          <a
            href={booking.report_url || '#'}
            target="_blank"
            rel="noreferrer"
            tabIndex={booking.report_url ? 0 : -1}
            aria-disabled={!booking.report_url}
            className="shrink-0"
          >
            <Button variant="secondary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              Open
            </Button>
          </a>
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
