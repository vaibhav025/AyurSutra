import React from 'react';
import { X, Search, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ============================== BUTTONS ============================== */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-forest text-white hover:bg-forest-deep shadow-sm hover:shadow-md disabled:bg-sage/60',
  secondary:
    'bg-white/80 backdrop-blur border border-line text-forest-deep hover:bg-mint hover:border-sage/40',
  ghost: 'text-muted hover:text-forest-deep hover:bg-sage-soft/50',
  danger:
    'bg-danger text-white hover:brightness-95 shadow-sm disabled:opacity-50',
  gold: 'bg-gold text-charcoal hover:brightness-105 shadow-sm',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className = '',
  children,
  disabled,
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center font-semibold tracking-tight cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    {...props}
  >
    {loading ? (
      <span
        aria-hidden
        className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
      />
    ) : (
      icon
    )}
    {children}
  </button>
);

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  className = '',
  children,
  ...props
}) => (
  <button
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/70 border border-line text-muted hover:text-forest-deep hover:bg-mint hover:border-sage/30 cursor-pointer ${className}`}
    {...props}
  >
    {children}
  </button>
);

/* ============================== BADGES ============================== */

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'gold';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-muted border-slate-200/70',
  success: 'bg-emerald-50 text-success border-emerald-200/70',
  warning: 'bg-amber-50 text-warning border-amber-200/70',
  danger: 'bg-red-50 text-danger border-red-200/70',
  info: 'bg-sky-50 text-info border-sky-200/70',
  brand: 'bg-mint text-forest border-sage/25',
  gold: 'bg-[#C9A86A]/10 text-[#8a6f3c] border-gold/30',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'neutral', className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight whitespace-nowrap ${badgeTones[tone]} ${className}`}
  >
    {children}
  </span>
);

const statusToneMap: Record<string, BadgeTone> = {
  Pending: 'warning',
  Confirmed: 'info',
  'In Progress': 'brand',
  Completed: 'success',
  Cancelled: 'neutral',
  Rejected: 'danger',
  Available: 'success',
  'In Session': 'warning',
  'On Leave': 'neutral',
  Operational: 'success',
  Sanitizing: 'info',
  Maintenance: 'warning',
  Inspection: 'warning',
};

export const StatusBadge: React.FC<{ status?: string; className?: string }> = ({
  status,
  className,
}) => (
  <Badge tone={statusToneMap[status || ''] ?? 'neutral'} className={className}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
    {status}
  </Badge>
);

/* ============================== FIELDS ============================== */

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = '',
}) => (
  <div className={className}>
    <label
      htmlFor={htmlFor}
      className="flex items-center justify-between mb-1.5 text-xs font-semibold text-forest-deep"
    >
      <span>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      {hint && !error && (
        <span className="font-normal text-muted text-[11px]">{hint}</span>
      )}
    </label>
    {children}
    {error && <p className="mt-1 text-[11px] font-medium text-danger">{error}</p>}
  </div>
);

const fieldBase =
  'w-full rounded-xl border bg-white/80 text-sm text-charcoal placeholder:text-muted/60 focus:outline-none focus:border-sage focus:ring-3 focus:ring-sage/15 disabled:opacity-50 disabled:cursor-not-allowed';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = '',
  ...props
}) => (
  <input className={`${fieldBase} border-line h-11 px-3.5 ${className}`} {...props} />
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className = '', rows = 3, ...props }) => (
  <textarea
    rows={rows}
    className={`${fieldBase} border-line px-3.5 py-2.5 leading-relaxed resize-none ${className}`}
    {...props}
  />
);

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement>
> = ({ className = '', children, ...props }) => (
  <div className={`relative ${className.includes('w-full') ? 'w-full' : ''}`}>
    <select
      className={`${fieldBase} border-line h-11 pl-3.5 pr-10 cursor-pointer appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
    />
  </div>
);

export const SearchInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { containerClassName?: string }
> = ({ containerClassName = '', className = '', ...props }) => (
  <div className={`relative ${containerClassName}`}>
    <Search
      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      aria-hidden
    />
    <input
      type="search"
      className={`${fieldBase} border-line h-11 pl-10 pr-4 ${className}`}
      {...props}
    />
  </div>
);

/* ============================== FILTER CHIP ============================== */

export const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}> = ({ active, onClick, count, children }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer border ${
      active
        ? 'bg-forest-deep text-white border-forest-deep shadow-sm'
        : 'bg-white/70 text-muted border-line hover:border-sage/40 hover:text-forest-deep'
    }`}
  >
    {children}
    {count !== undefined && (
      <span
        className={`px-1.5 min-w-5 py-px rounded-full text-[10px] font-bold ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

/* ============================== CARDS ============================== */

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }
> = ({ hover, className = '', children, ...props }) => (
  <div
    className={`surface ${hover ? 'surface-hover transition-all duration-200' : ''} rounded-2xl ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`glass rounded-2xl ${className}`} {...props}>
    {children}
  </div>
);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  tone?: 'brand' | 'warning' | 'danger' | 'info' | 'gold';
  onClick?: () => void;
  active?: boolean;
}

const statTones: Record<string, string> = {
  brand: 'bg-mint text-forest border-sage/20',
  warning: 'bg-amber-50 text-warning border-amber-200/50',
  danger: 'bg-red-50 text-danger border-red-200/50',
  info: 'bg-sky-50 text-info border-sky-200/50',
  gold: 'bg-[#C9A86A]/10 text-[#8a6f3c] border-gold/25',
};

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  tone = 'brand',
  onClick,
  active,
}: StatCardProps) {
  return (
    <Card
      hover={!!onClick}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick()
          : undefined
      }
      className={`p-5 flex items-start justify-between gap-4 ${
        active ? 'ring-2 ring-sage border-sage/40' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
          {label}
        </p>
        <p className="mt-1.5 font-display text-[26px] leading-8 font-semibold text-forest-deep truncate">
          {value}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted truncate">{subtitle}</p>
        )}
      </div>
      <div
        className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${statTones[tone]}`}
      >
        {icon}
      </div>
    </Card>
  );
}

/* ============================== HEADERS ============================== */

export const SectionHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ icon, title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-line">
    <div className="flex items-start gap-3">
      {icon && (
        <div className="w-9 h-9 shrink-0 rounded-xl bg-mint border border-sage/20 text-forest flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-display text-lg font-semibold text-forest-deep tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted mt-0.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-sage mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] sm:text-[34px] leading-tight font-semibold text-forest-deep tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

/* ============================== MODAL ============================== */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidth = 'max-w-lg', children }) =>
  createPortalSafe(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-forest-deep/45 backdrop-blur-[6px]"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={`glass-strong w-full ${maxWidth} rounded-3xl overflow-hidden`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
              <div>
                <h3 className="font-display text-base font-semibold text-forest-deep">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-muted mt-0.5">{subtitle}</p>
                )}
              </div>
              <IconButton label="Close dialog" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    open
  );

function createPortalSafe(node: React.ReactNode, _open: boolean) {
  return node;
}

/* ============================== EMPTY STATE ============================== */

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="py-14 px-6 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-mint border border-sage/20 text-sage flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">
      {icon}
    </div>
    <p className="mt-4 font-display text-[15px] font-semibold text-forest-deep">
      {title}
    </p>
    {description && (
      <p className="mt-1 text-xs text-muted max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

/* ============================== SKELETONS ============================== */

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden
    className={`animate-pulse rounded-lg bg-gradient-to-r from-sage-soft/60 via-sage-soft to-sage-soft/60 bg-[length:200%_100%] ${className}`}
  />
);

export const SkeletonRows: React.FC<{ rows?: number; className?: string }> = ({
  rows = 4,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`} role="status" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="surface rounded-2xl p-4 flex items-center gap-4">
        <Skeleton className="w-10 h-10 !rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-2/3" />
        </div>
        <Skeleton className="h-7 w-20 !rounded-full" />
      </div>
    ))}
  </div>
);

/* ============================== AVATAR ============================== */

export const Avatar: React.FC<{
  src?: string;
  name: string;
  size?: number;
  ring?: boolean;
}> = ({ src, name, size = 40, ring }) => (
  <img
    src={src}
    alt={name}
    width={size}
    height={size}
    loading="lazy"
    className={`rounded-full object-cover bg-sage-soft ${
      ring ? 'ring-2 ring-sage ring-offset-2 ring-offset-transparent' : ''
    }`}
    style={{ width: size, height: size }}
  />
);

/* ============================== MISC ============================== */

export const SelectedCheck: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <motion.span
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.18, ease: 'backOut' }}
    className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-forest text-white shadow-sm ${className}`}
  >
    <Check className="w-3.5 h-3.5" strokeWidth={3} />
  </motion.span>
);

export const KeyValue: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 text-sm">
    <span className="text-muted text-xs shrink-0">{label}</span>
    <span className="font-medium text-charcoal text-right truncate">{children}</span>
  </div>
);
