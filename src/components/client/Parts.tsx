import React from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Clock,
  Star,
  UploadCloud,
  FileText,
  X,
} from 'lucide-react';
import type { Therapy, Therapist } from '../../types/ayursutra';

/* ---------------- Stepper ---------------- */

export const BOOKING_STEPS = [
  'Treatment',
  'Practitioner',
  'Schedule',
  'Your Details',
] as const;

export const Stepper: React.FC<{ current: number }> = ({ current }) => (
  <ol
    className="flex items-center gap-0 overflow-x-auto scrollbar-none"
    aria-label="Booking progress"
  >
    {BOOKING_STEPS.map((label, i) => {
      const n = i + 1;
      const done = current > n;
      const active = current === n;
      return (
        <li key={label} className="flex items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-current={active ? 'step' : undefined}
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold border transition-colors ${
                done
                  ? 'bg-forest text-white border-forest'
                  : active
                    ? 'bg-white text-forest-deep border-sage ring-3 ring-sage/20'
                    : 'bg-white/70 text-muted border-line'
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : n}
            </span>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                active ? 'text-forest-deep' : 'text-muted'
              }`}
            >
              {label}
            </span>
          </div>
          {i < BOOKING_STEPS.length - 1 && (
            <span
              aria-hidden
              className={`mx-3 w-10 sm:w-14 h-px ${done ? 'bg-forest' : 'bg-line'}`}
            />
          )}
        </li>
      );
    })}
  </ol>
);

/* ---------------- Step transition wrapper ---------------- */

export const StepPanel: React.FC<{ stepKey: number; children: React.ReactNode }> = ({
  stepKey,
  children,
}) => (
  <motion.div
    key={stepKey}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
  >
    {children}
  </motion.div>
);

/* ---------------- Therapy card ---------------- */

export const TherapyCard: React.FC<{
  therapy: Therapy;
  selected: boolean;
  onSelect: () => void;
}> = ({ therapy: t, selected, onSelect }) => (
  <motion.button
    type="button"
    onClick={onSelect}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.985 }}
    aria-pressed={selected}
    className={`relative w-full text-left p-4 sm:p-5 rounded-2xl border cursor-pointer transition-colors ${
      selected
        ? 'bg-mint border-forest/50 shadow-[0_8px_30px_rgba(23,63,53,0.12)]'
        : 'surface surface-hover hover:border-sage/40'
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <span className="inline-flex px-2 py-0.5 rounded-full bg-sage-soft/70 border border-sage/25 text-[10px] font-bold uppercase tracking-wider text-forest">
        {t.category}
      </span>
      {selected && (
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-[22px] h-[22px] shrink-0 rounded-full bg-forest text-white flex items-center justify-center shadow-sm"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </motion.span>
      )}
    </div>

    <h3 className="mt-2.5 font-display text-[15px] font-semibold text-forest-deep leading-snug">
      {t.name}
    </h3>
    <p className="text-xs italic text-sage font-medium">{t.sanskrit_name}</p>
    <p className="mt-2 text-xs text-muted leading-relaxed line-clamp-2">
      {t.description}
    </p>

    <div className="mt-3 pt-3 border-t border-line/70 flex items-center justify-between gap-2 text-[11px]">
      <span className="inline-flex items-center gap-1 text-muted font-medium">
        <Clock className="w-3.5 h-3.5" /> {t.duration_mins} min
      </span>
      <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-success font-semibold">
        {t.dosha_target || 'Tridoshic'}
      </span>
      <span className="font-display text-sm font-semibold text-charcoal">
        ₹{t.price}
      </span>
    </div>
  </motion.button>
);

/* ---------------- Practitioner card ---------------- */

export const PractitionerCard: React.FC<{
  therapist: Therapist;
  selected: boolean;
  onSelect: () => void;
}> = ({ therapist: th, selected, onSelect }) => (
  <motion.button
    type="button"
    onClick={onSelect}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.985 }}
    aria-pressed={selected}
    disabled={th.status === 'On Leave'}
    className={`relative w-full text-left p-4 rounded-2xl border cursor-pointer transition-colors disabled:opacity-55 disabled:cursor-not-allowed ${
      selected
        ? 'bg-mint border-forest/50 shadow-[0_8px_30px_rgba(23,63,53,0.12)]'
        : 'surface surface-hover hover:border-sage/40'
    }`}
  >
    <div className="flex items-center gap-3">
      <img
        src={th.avatar_url}
        alt=""
        loading="lazy"
        className="w-12 h-12 rounded-full object-cover bg-sage-soft ring-2 ring-white"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-forest-deep truncate">
            {th.name}
          </p>
          {selected && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-forest text-white flex items-center justify-center">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted truncate">{th.title}</p>
        <p className="mt-0.5 text-[11px] font-medium text-sage truncate">
          {th.specialization}
        </p>
      </div>
    </div>
    <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px]">
      <span className="inline-flex items-center gap-1 font-semibold text-warning">
        <Star className="w-3.5 h-3.5 fill-current" /> {th.rating}
      </span>
      <span className="text-muted">{th.experience_years} yrs experience</span>
      <span
        className={`font-semibold ${
          th.status === 'Available' ? 'text-success' : 'text-warning'
        }`}
      >
        {th.status}
      </span>
    </div>
  </motion.button>
);

/* ---------------- Upload zone ---------------- */

export const UploadZone: React.FC<{
  fileName: string | null;
  uploading: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}> = ({ fileName, uploading, onFile, onRemove }) => (
  <div className="rounded-2xl border-2 border-dashed border-sage/35 bg-mint/40 hover:bg-mint/70 transition-colors p-5 text-center">
    <input
      type="file"
      id="medical-upload"
      accept=".pdf,.png,.jpg"
      onChange={onFile}
      className="sr-only"
    />
    <label htmlFor="medical-upload" className="cursor-pointer block">
      <UploadCloud className="w-6 h-6 mx-auto text-forest" />
      <p className="mt-1.5 text-xs font-semibold text-forest-deep">
        Upload medical report
      </p>
      <p className="text-[11px] text-muted mt-0.5">PDF or image · optional</p>
    </label>

    {uploading && (
      <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-forest">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-forest border-t-transparent animate-spin" />
        Uploading securely…
      </p>
    )}

    {fileName && !uploading && (
      <motion.span
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-white border border-line shadow-sm text-[11px] font-medium text-charcoal max-w-full"
      >
        <FileText className="w-3.5 h-3.5 text-success shrink-0" />
        <span className="truncate max-w-[180px]">{fileName}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove file"
          className="shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-red-50 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </motion.span>
    )}
  </div>
);
