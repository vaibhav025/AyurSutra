import React from 'react';
import { Leaf, ShieldCheck, LockKeyhole, ChevronDown } from 'lucide-react';
import { Button, Badge, Input, Field } from './ui';

export const Logo: React.FC<{ compact?: boolean; dark?: boolean }> = ({
  compact,
  dark,
}) => (
  <div className="flex items-center gap-2.5 select-none">
    <div className="relative w-9 h-9 rounded-xl bg-forest-deep flex items-center justify-center shadow-sm shrink-0">
      <Leaf className="w-[18px] h-[18px] text-sage" strokeWidth={2.2} />
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gold ring-2 ring-ivory" />
    </div>
    {!compact && (
      <div className={`leading-none ${dark ? 'text-white' : 'text-forest-deep'}`}>
        <p className="font-display text-[17px] font-semibold tracking-tight">
          AyurSutra
        </p>
        <p
          className={`text-[10px] font-medium tracking-wide mt-1 ${
            dark ? 'text-sage/90' : 'text-muted'
          }`}
        >
          Panchakarma Care OS
        </p>
      </div>
    )}
  </div>
);

interface LoginScreenProps {
  onLogin: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  loading,
  error,
  email,
  password,
  setEmail,
  setPassword,
}) => (
  <div className="app-bg min-h-screen flex items-stretch">
    {/* Left brand panel */}
    <section
      aria-hidden
      className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-forest-deep m-4 rounded-[28px] p-12 flex-col justify-between"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(640px 420px at 80% -10%, rgba(127,165,141,.35), transparent 60%), radial-gradient(520px 380px at -10% 100%, rgba(201,168,106,.14), transparent 55%)',
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.08]"
        viewBox="0 0 600 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M-50 650 Q200 500 320 300 T700 120" stroke="#7FA58D" strokeWidth="1.5" />
        <path d="M-50 720 Q220 570 360 370 T740 190" stroke="#7FA58D" strokeWidth="1.5" />
        <path d="M-50 580 Q180 430 280 230 T660 50" stroke="#C9A86A" strokeWidth="1" />
      </svg>

      <Logo dark />

      <div className="relative max-w-md">
        <Badge
          tone="brand"
          className="!bg-white/10 !text-sage !border-white/15 mb-6 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Panchakarma scheduling
          engine
        </Badge>
        <h2 className="font-display text-[38px] xl:text-[42px] leading-[1.15] font-semibold text-white tracking-tight">
          Structured care,
          <br />
          rooted in
          <span className="text-sage"> Ayurveda.</span>
        </h2>
        <p className="mt-4 text-sm text-white/65 leading-relaxed">
          Real-time practitioner, chamber and inventory coordination for modern
          Panchakarma clinics — in one calm workspace.
        </p>
        <ul className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            ['ACID', 'Atomic bookings'],
            ['3-Way', 'Constraint checks'],
            ['Live', 'Inventory sync'],
          ].map(([k, v]) => (
            <li
              key={k}
              className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-3.5 backdrop-blur-sm"
            >
              <p className="font-display text-sm font-semibold text-gold">{k}</p>
              <p className="text-[10px] text-white/55 mt-0.5">{v}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-[11px] text-white/40">
        © {new Date().getFullYear()} AyurSutra · Clinical-grade data protection
      </p>
    </section>

    {/* Right auth panel */}
    <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
      <div className="glass-strong w-full max-w-md rounded-[28px] p-8 sm:p-10">
        <div className="lg:hidden mb-8">
          <Logo />
        </div>

        <h1 className="font-display text-[28px] font-semibold text-forest-deep tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Continue your AyurSutra care journey.
        </p>

        <form onSubmit={onLogin} className="mt-8 space-y-4" noValidate={false}>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200/70 text-danger text-xs font-medium leading-relaxed"
            >
              {error}
            </div>
          )}

          <Field label="Email address" htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            icon={<LockKeyhole className="w-4 h-4" />}
            className="w-full !mt-6"
          >
            Sign in securely
          </Button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-success" />
          Your information is securely protected
        </p>

        <details className="group mt-6 rounded-xl border border-line bg-white/50 overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-muted cursor-pointer hover:text-forest-deep list-none">
            Demo environment accounts
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-3 pt-1 space-y-1 text-[11px] text-muted font-mono border-t border-line/60">
            <p>admin@ayursutra.com — Reception</p>
            <p>doctor@ayursutra.com — Practitioner</p>
            <p>patient@ayursutra.com — Patient</p>
          </div>
        </details>
      </div>
    </main>
  </div>
);
