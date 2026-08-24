import React, { useState } from 'react';
import { Leaf, ShieldCheck, LockKeyhole, ChevronDown, UserPlus, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button, Badge, Input, Field } from './ui';
import { supabase } from '../lib/supabaseClient';

export const Logo: React.FC<{ compact?: boolean; dark?: boolean }> = ({ compact, dark }) => (
  <div className="flex items-center gap-2.5 select-none">
    <div className="relative w-9 h-9 rounded-xl bg-forest-deep flex items-center justify-center shadow-sm shrink-0">
      <Leaf className="w-[18px] h-[18px] text-sage" strokeWidth={2.2} />
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gold ring-2 ring-ivory" />
    </div>
    {!compact && (
      <div className={`leading-none ${dark ? 'text-white' : 'text-forest-deep'}`}>
        <p className="font-display text-[17px] font-semibold tracking-tight">AyurSutra</p>
        <p className={`text-[10px] font-medium tracking-wide mt-1 ${dark ? 'text-sage/90' : 'text-muted'}`}>Panchakarma Care OS</p>
      </div>
    )}
  </div>
);

export const LoginScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false); // New OTP state
  const [showPassword, setShowPassword] = useState(false); // New Eye Button state
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('client');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (awaitingOtp) {
        // --- STEP 3: VERIFY OTP ---
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup'
        });
        
        if (verifyError) throw verifyError;

        // OTP Success! Insert profile in DB
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, email, full_name: fullName, role }
          ]);
          if (profileError) throw profileError;
        }
      } 
      else if (isSignUp) {
        // --- STEP 1: SEND OTP (Sign Up) ---
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
        setAwaitingOtp(true); // Switch UI to OTP screen
      } 
      else {
        // --- STEP 2: NORMAL SIGN IN ---
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg min-h-screen flex items-stretch">
      {/* Left Brand Panel */}
      <section aria-hidden className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-forest-deep m-4 rounded-[28px] p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(640px 420px at 80% -10%, rgba(127,165,141,.35), transparent 60%), radial-gradient(520px 380px at -10% 100%, rgba(201,168,106,.14), transparent 55%)' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 600 800" fill="none" preserveAspectRatio="xMidYMid slice">
          <path d="M-50 650 Q200 500 320 300 T700 120" stroke="#7FA58D" strokeWidth="1.5" />
          <path d="M-50 720 Q220 570 360 370 T740 190" stroke="#7FA58D" strokeWidth="1.5" />
        </svg>
        <Logo dark />
        <div className="relative max-w-md">
          <Badge tone="brand" className="!bg-white/10 !text-sage !border-white/15 mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Panchakarma scheduling engine
          </Badge>
          <h2 className="font-display text-[38px] xl:text-[42px] leading-[1.15] font-semibold text-white tracking-tight">
            Structured care,<br />rooted in<span className="text-sage"> Ayurveda.</span>
          </h2>
        </div>
        <p className="relative text-[11px] text-white/40">© {new Date().getFullYear()} AyurSutra · Clinical-grade data protection</p>
      </section>

      {/* Right Auth Panel */}
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="glass-strong w-full max-w-md rounded-[28px] p-8 sm:p-10 relative">
          <div className="lg:hidden mb-8"><Logo /></div>

          {awaitingOtp ? (
             // --- OTP SCREEN UI ---
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h1 className="font-display text-[28px] font-semibold text-forest-deep tracking-tight">Check your email</h1>
              <p className="mt-1.5 text-sm text-muted">We've sent a 6-digit verification code to <strong>{email}</strong>.</p>
              
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {error && <div role="alert" className="p-3 rounded-xl bg-red-50 text-danger text-xs font-medium">{error}</div>}
                <Field label="Verification Code" htmlFor="otp" required>
                  <Input 
                    id="otp" 
                    type="text" 
                    placeholder="Enter 6-digit code" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    maxLength={6} 
                    className="tracking-[0.5em] text-center font-mono text-lg"
                    required 
                  />
                </Field>
                <Button type="submit" size="lg" loading={loading} icon={<KeyRound className="w-4 h-4" />} className="w-full !mt-6">
                  Verify & Continue
                </Button>
                <button type="button" onClick={() => setAwaitingOtp(false)} className="w-full mt-4 text-xs font-semibold text-muted hover:text-forest-deep transition-colors">
                  Wrong email? Go back
                </button>
              </form>
            </div>
          ) : (
            // --- LOGIN / SIGN UP UI ---
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="font-display text-[28px] font-semibold text-forest-deep tracking-tight transition-all">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                {isSignUp ? 'Join AyurSutra to manage your care journey.' : 'Continue your AyurSutra care journey.'}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {error && <div role="alert" className="p-3 rounded-xl bg-red-50 text-danger text-xs font-medium">{error}</div>}

                {isSignUp && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Field label="Full name" htmlFor="signup-name" required>
                      <Input id="signup-name" type="text" placeholder="Siddharth Varma" value={fullName} onChange={(e) => setFullName(e.target.value)} required={isSignUp} />
                    </Field>
                    <Field label="I am a..." htmlFor="signup-role" required>
                      <div className="relative">
                        <select id="signup-role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-12 rounded-xl border border-line bg-white/50 px-4 text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-3 focus:ring-sage/15 cursor-pointer appearance-none">
                          <option value="client">Patient / Client</option>
                          <option value="therapist">Vaidya / Doctor</option>
                          <option value="receptionist">Receptionist / Admin</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      </div>
                    </Field>
                  </div>
                )}

                <Field label="Email address" htmlFor="login-email" required>
                  <Input id="login-email" type="email" autoComplete="email" placeholder="you@clinic.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </Field>

                <Field label="Password" htmlFor="login-password" required>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete={isSignUp ? "new-password" : "current-password"} 
                      placeholder="Enter your password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      minLength={6} 
                      className="pr-12" // Add padding so text doesn't overlap eye icon
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-forest-deep transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <Button type="submit" size="lg" loading={loading} icon={isSignUp ? <UserPlus className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />} className="w-full !mt-6">
                  {isSignUp ? 'Send Verification Code' : 'Sign in securely'}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-xs font-semibold text-muted hover:text-forest-deep transition-colors">
                  {isSignUp ? 'Already have an account? Sign in' : 'New to AyurSutra? Create an account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};