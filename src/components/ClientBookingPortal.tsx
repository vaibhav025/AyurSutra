import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sun,
  Sunset,
  MoonStar,
  CircleCheck,
  CalendarPlus,
  History,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import type { Therapy, Therapist, ResourceRoom, BookingCreationRPCResponse, Booking } from '../types/ayursutra';
import { Button, Badge, Card, Field, Input, Select, Textarea, FilterChip } from './ui';
import {
  Stepper,
  StepPanel,
  TherapyCard,
  PractitionerCard,
  UploadZone,
} from './client/Parts';
import { supabase } from '../lib/supabaseClient'; // ADDED SUPABASE IMPORT

interface ClientBookingPortalProps {
  onBookingSuccess?: () => void;
  onNavigateToDesk?: () => void;
}

const TIME_SLOTS = [
  { hour: 8, label: '08:00 AM', period: 'Morning Oleation' },
  { hour: 9, label: '09:00 AM', period: 'Morning Oleation' },
  { hour: 10, label: '10:00 AM', period: 'Mid-Morning Session' },
  { hour: 11, label: '11:00 AM', period: 'Mid-Morning Session' },
  { hour: 14, label: '02:00 PM', period: 'Afternoon Rejuvenation' },
  { hour: 15, label: '03:00 PM', period: 'Afternoon Rejuvenation' },
  { hour: 16, label: '04:00 PM', period: 'Evening Rasayana' },
  { hour: 17, label: '05:00 PM', period: 'Evening Rasayana' },
];

const slotGroup = (hour: number): 'Morning' | 'Afternoon' | 'Evening' =>
  hour < 12 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Evening';

const GROUP_ICON = {
  Morning: <Sun className="w-3.5 h-3.5" />,
  Afternoon: <Sunset className="w-3.5 h-3.5" />,
  Evening: <MoonStar className="w-3.5 h-3.5" />,
};

export const ClientBookingPortal: React.FC<ClientBookingPortalProps> = ({
  onBookingSuccess,
  onNavigateToDesk,
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');

  // Engine state
  const [therapies, setTherapies] = useState<Therapy[]>(() => ayurEngine.getTherapies());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [allBookings, setAllBookings] = useState<Booking[]>(() => ayurEngine.getBookings());

  // Form state - INIT AS EMPTY, LOADED DYNAMICALLY
  const [selectedTherapyId, setSelectedTherapyId] = useState('th-101');
  const [selectedTherapistId, setSelectedTherapistId] = useState('tp-2');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState(10);
  
  const [details, setDetails] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    prakriti: 'Vata-Pitta',
    medicalNotes: '',
  });

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rpcResponse, setRpcResponse] = useState<BookingCreationRPCResponse | null>(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [step, setStep] = useState(1);

  // --- NEW: FETCH ACTUAL USER PROFILE FROM DATABASE ON LOAD ---
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', session.user.id)
          .single();
          
        if (data) {
          setDetails(prev => ({
            ...prev,
            clientName: data.full_name || 'Guest',
            clientEmail: data.email || session.user.email || '',
          }));
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapies(ayurEngine.getTherapies());
      setTherapists(ayurEngine.getTherapists());
      setRooms(ayurEngine.getRooms());
      setAllBookings(ayurEngine.getBookings());
    });
  }, []);

  const myBookings = useMemo(() => {
    return allBookings
      .filter(b => b.client_email === details.clientEmail)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [allBookings, details.clientEmail]);

  const selectedTherapy = useMemo(
    () => therapies.find((t) => t.id === selectedTherapyId) || therapies[0],
    [therapies, selectedTherapyId]
  );
  const selectedTherapist = useMemo(
    () => therapists.find((th) => th.id === selectedTherapistId) || therapists[0],
    [therapists, selectedTherapistId]
  );
  const allocatedRoomId = useMemo(() => {
    const operationalRoom = rooms.find((r) => r.is_operational) || rooms[0];
    return operationalRoom?.id || 'rm-101';
  }, [rooms]);

  const targetStartTimeIso = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(selectedHour, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate, selectedHour]);

  const filteredTherapies = useMemo(
    () =>
      filterCategory === 'ALL'
        ? therapies
        : therapies.filter((t) => t.category === filterCategory),
    [therapies, filterCategory]
  );

  const canContinue = useMemo(() => {
    if (step === 1) return !!selectedTherapy;
    if (step === 2) return !!selectedTherapist && selectedTherapist.status !== 'On Leave';
    if (step === 3) return !!selectedDate && !!selectedHour;
    return true;
  }, [step, selectedTherapy, selectedTherapist, selectedDate, selectedHour]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setUploadedFileName(file.name);
      setIsUploading(false);
    }, 600);
  };

  const handleBookSession = async () => {
    if (!details.clientName.trim()) return;
    setIsSubmitting(true);
    setRpcResponse(null);

    const reportUrl = uploadedFileName
      ? `https://ayursutra.supabase.co/storage/v1/object/public/medical-reports/${Date.now()}_${uploadedFileName}`
      : undefined;

    const response = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: details.clientName,
      client_phone: details.clientPhone,
      client_email: details.clientEmail,
      prakriti: details.prakriti,
      therapy_id: selectedTherapyId,
      therapist_id: selectedTherapistId,
      room_id: allocatedRoomId,
      start_time: targetStartTimeIso,
      report_url: reportUrl,
      report_file_name: uploadedFileName || undefined,
      medical_notes: details.medicalNotes,
    });

    setIsSubmitting(false);
    if (response.success) {
      setRpcResponse(response);
      setStep(5);
      if (onBookingSuccess) onBookingSuccess();
    } else {
      setRpcResponse(response);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setRpcResponse(null);
    setUploadedFileName(null);
    setActiveTab('book');
  };

  const summaryRows = (
    <>
      <SummaryRow label="Treatment" value={selectedTherapy?.name} strong />
      <SummaryRow label="Practitioner" value={selectedTherapist?.name} />
      <SummaryRow
        label="Schedule"
        value={
          step >= 3
            ? `${new Date(targetStartTimeIso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${TIME_SLOTS.find((s) => s.hour === selectedHour)?.label}`
            : 'Not selected'
        }
      />
      <SummaryRow label="Duration" value={`${selectedTherapy?.duration_mins ?? 60} minutes`} />
    </>
  );

  // Dynamic Greeting Variables
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const displayFirstName = details.clientName ? details.clientName.split(' ')[0] : '';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting hero */}
      <section className="bg-white/50 backdrop-blur-xl border border-white/40 p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sage">
            <Leaf className="w-3.5 h-3.5" /> Patient portal
          </p>
          <h1 className="mt-2 font-display text-[28px] sm:text-[34px] leading-tight font-semibold text-forest-deep tracking-tight">
            Good {timeOfDay}{displayFirstName ? `, ${displayFirstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted max-w-xl leading-relaxed">
            Your path to balanced wellbeing continues here. Book your next session or view your history.
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-white/40 p-1.5 rounded-xl backdrop-blur-sm border border-white/50 shadow-inner shrink-0">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'book' ? 'bg-white text-forest-deep shadow-sm' : 'text-muted hover:text-charcoal'}`}
          >
            <CalendarIcon className="w-4 h-4" /> Book Session
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-forest-deep shadow-sm' : 'text-muted hover:text-charcoal'}`}
          >
            <History className="w-4 h-4" /> My Appointments
          </button>
        </div>
      </section>

      {activeTab === 'history' ? (
        /* MY APPOINTMENTS VIEW */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
           {myBookings.length === 0 ? (
             <Card className="p-10 text-center bg-white/50 backdrop-blur-md border-dashed">
               <History className="w-10 h-10 text-sage mx-auto mb-3 opacity-50" />
               <p className="font-display font-semibold text-charcoal">No appointments found</p>
               <Button onClick={() => setActiveTab('book')} className="mt-4">Book your first session</Button>
             </Card>
           ) : (
             myBookings.map((b) => (
               <Card key={b.id} className="p-5 sm:p-6 bg-white/60 backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                 <div className="flex flex-col sm:flex-row justify-between gap-4">
                   <div>
                     <div className="flex items-center gap-3 mb-2">
                       <h3 className="font-display font-semibold text-lg text-forest-deep">{b.therapy?.name}</h3>
                       <Badge tone={b.status === 'Confirmed' ? 'success' : b.status === 'Completed' ? 'neutral' : 'brand'}>{b.status}</Badge>
                     </div>
                     <p className="text-sm text-charcoal font-medium">
                       {new Date(b.start_time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                   <div className="text-left sm:text-right">
                     <p className="text-sm font-medium text-forest-deep">{b.therapist?.name}</p>
                     <p className="text-xs text-muted mt-1">Ref: {b.booking_ref}</p>
                   </div>
                 </div>
               </Card>
             ))
           )}
        </motion.div>
      ) : (
        /* ORIGINAL BOOKING FLOW */
        <>
          {step <= 4 && (
            <Card className="px-5 py-4 overflow-x-auto bg-white/70 backdrop-blur-md border-white/50 shadow-sm">
              <Stepper current={step} />
            </Card>
          )}

          <div className={step <= 4 ? 'grid grid-cols-1 xl:grid-cols-12 gap-6' : ''}>
            <div className={step <= 4 ? 'xl:col-span-8 space-y-6' : 'mx-auto max-w-2xl w-full'}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <StepPanel key="s1" stepKey={1}>
                    <Card className="p-5 sm:p-6 space-y-5 bg-white/60 backdrop-blur-xl shadow-lg border-white/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg font-semibold text-forest-deep">Select your therapy</h2>
                          <p className="text-xs text-muted mt-0.5">Classical Panchakarma protocols tailored to your constitution.</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['ALL', 'Purvakarma', 'Pradhanakarma'].map(cat => (
                             <FilterChip key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)}>
                               {cat}
                             </FilterChip>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1 -mr-1">
                        {filteredTherapies.map((t) => (
                          <TherapyCard
                            key={t.id}
                            therapy={t}
                            selected={t.id === selectedTherapyId}
                            onSelect={() => setSelectedTherapyId(t.id)}
                          />
                        ))}
                      </div>
                    </Card>
                  </StepPanel>
                )}

                {step === 2 && (
                  <StepPanel key="s2" stepKey={2}>
                    <Card className="p-5 sm:p-6 space-y-5 bg-white/60 backdrop-blur-xl shadow-lg border-white/40">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-forest-deep">Choose your practitioner</h2>
                        <p className="text-xs text-muted mt-0.5">Certified Vaidyas matched to your therapy protocol.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {therapists.map((th) => (
                          <PractitionerCard
                            key={th.id}
                            therapist={th}
                            selected={th.id === selectedTherapistId}
                            onSelect={() => setSelectedTherapistId(th.id)}
                          />
                        ))}
                      </div>
                    </Card>
                  </StepPanel>
                )}

                {step === 3 && (
                  <StepPanel key="s3" stepKey={3}>
                    <Card className="p-5 sm:p-6 space-y-6 bg-white/60 backdrop-blur-xl shadow-lg border-white/40">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-forest-deep">Pick date &amp; time</h2>
                        <p className="text-xs text-muted mt-0.5">Sessions are aligned with clinic oleation windows.</p>
                      </div>

                      <Field label="Preferred date" htmlFor="booking-date">
                        <input
                          id="booking-date"
                          type="date"
                          value={selectedDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full h-12 rounded-xl border border-line bg-white/50 backdrop-blur-md px-4 text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-3 focus:ring-sage/15 cursor-pointer shadow-sm transition-all hover:bg-white"
                        />
                      </Field>

                      {(['Morning', 'Afternoon', 'Evening'] as const).map((group) => {
                        const slots = TIME_SLOTS.filter((s) => slotGroup(s.hour) === group);
                        if (!slots.length) return null;
                        return (
                          <div key={group}>
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted mb-2.5">
                              {GROUP_ICON[group]} {group}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup">
                              {slots.map((slot) => {
                                const active = selectedHour === slot.hour;
                                return (
                                  <button
                                    key={slot.hour}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setSelectedHour(slot.hour)}
                                    className={`min-h-[52px] rounded-xl border px-2 text-center cursor-pointer transition-all duration-300 ${
                                      active
                                        ? 'bg-forest text-white border-forest shadow-md -translate-y-0.5'
                                        : 'bg-white/40 hover:bg-white border-line hover:border-sage/40 hover:-translate-y-0.5 hover:shadow-sm'
                                    }`}
                                  >
                                    <span className={`block text-xs font-bold ${active ? '' : 'text-charcoal'}`}>
                                      {slot.label}
                                    </span>
                                    <span className={`block text-[10px] mt-0.5 ${active ? 'text-white/70' : 'text-muted'}`}>
                                      {slot.period}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </Card>
                  </StepPanel>
                )}

                {step === 4 && (
                  <StepPanel key="s4" stepKey={4}>
                    <div className="space-y-6">
                      <Card className="p-5 sm:p-6 space-y-5 bg-white/60 backdrop-blur-xl shadow-lg border-white/40">
                        <h2 className="font-display text-lg font-semibold text-forest-deep">Your details</h2>
                        <fieldset className="space-y-4">
                          <legend className="text-[11px] font-bold uppercase tracking-widest text-sage mb-3">Personal details</legend>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Full name" htmlFor="c-name" required>
                              <Input id="c-name" value={details.clientName} onChange={(e) => setDetails({ ...details, clientName: e.target.value })} placeholder="e.g. Siddharth Varma" className="bg-white/50 backdrop-blur-md" />
                            </Field>
                            <Field label="Phone number" htmlFor="c-phone">
                              <Input id="c-phone" type="tel" value={details.clientPhone} onChange={(e) => setDetails({ ...details, clientPhone: e.target.value })} placeholder="+91 98XXX XXXXX" className="bg-white/50 backdrop-blur-md" />
                            </Field>
                            <Field label="Email address" htmlFor="c-email">
                              <Input id="c-email" type="email" value={details.clientEmail} onChange={(e) => setDetails({ ...details, clientEmail: e.target.value })} placeholder="you@example.com" className="bg-white/50 backdrop-blur-md" />
                            </Field>
                            <Field label="Prakriti (dosha constitution)" htmlFor="c-prakriti">
                              <Select id="c-prakriti" value={details.prakriti} onChange={(e) => setDetails({ ...details, prakriti: e.target.value })} className="bg-white/50 backdrop-blur-md">
                                <option>Vata-Pitta</option>
                                <option>Pitta-Kapha</option>
                                <option>Vata-Kapha</option>
                                <option>Tridoshic</option>
                                <option>Pure Vata</option>
                                <option>Pure Pitta</option>
                              </Select>
                            </Field>
                          </div>
                        </fieldset>
                        <fieldset className="space-y-2">
                          <legend className="text-[11px] font-bold uppercase tracking-widest text-sage mb-1">Medical notes</legend>
                          <Textarea
                            aria-label="Symptoms or special requests"
                            rows={3}
                            value={details.medicalNotes}
                            onChange={(e) => setDetails({ ...details, medicalNotes: e.target.value })}
                            placeholder="Mention stiffness, digestion, stress..."
                            className="bg-white/50 backdrop-blur-md"
                          />
                        </fieldset>
                      </Card>

                      <Card className="p-5 sm:p-6 space-y-3 bg-white/60 backdrop-blur-xl shadow-lg border-white/40">
                        <h3 className="font-display text-base font-semibold text-forest-deep">Medical documents</h3>
                        <p className="text-xs text-muted">Helps your Vaidya prepare personalized herbal formulations.</p>
                        <UploadZone
                          fileName={uploadedFileName}
                          uploading={isUploading}
                          onFile={handleFileUpload}
                          onRemove={() => setUploadedFileName(null)}
                        />
                      </Card>
                    </div>
                  </StepPanel>
                )}
              </AnimatePresence>

              {step <= 4 && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="ghost"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    disabled={step === 1}
                    icon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  {step < 4 ? (
                    <Button
                      size="lg"
                      disabled={!canContinue}
                      onClick={() => canContinue && setStep((s) => Math.min(4, s + 1))}
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      loading={isSubmitting}
                      onClick={handleBookSession}
                      icon={<CalendarPlus className="w-4 h-4" />}
                    >
                      Request booking
                    </Button>
                  )}
                </div>
              )}
            </div>

            {step <= 4 && (
              <aside className="hidden xl:block xl:col-span-4">
                <div className="sticky top-24 bg-white/60 backdrop-blur-2xl border border-white/60 rounded-2xl p-6 shadow-xl space-y-5 transition-all duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <p className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest-deep">
                      <Sparkles className="w-4 h-4 text-gold" /> Booking summary
                    </p>
                    <Badge tone="brand">Panchakarma</Badge>
                  </div>
                  <div className="space-y-3">{summaryRows}</div>
                  <div className="pt-3 border-t border-line flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-forest-deep">Treatment fee</span>
                    <span className="font-display text-xl font-semibold text-forest-deep">
                      ₹{selectedTherapy?.price ?? 0}
                    </span>
                  </div>
                </div>
              </aside>
            )}
          </div>

          {/* STEP 5 · CONFIRMATION */}
          {step === 5 && rpcResponse?.success && (
            <StepPanel key="s5" stepKey={5}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                className="max-w-2xl mx-auto"
              >
                <Card className="overflow-hidden rounded-3xl shadow-2xl border-white/50 backdrop-blur-md">
                <div className="bg-forest-deep relative px-8 py-10 text-center overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-50"
                    style={{
                      background:
                        'radial-gradient(420px 260px at 50% -20%, rgba(127,165,141,.45), transparent 65%)',
                    }}
                  />
                  <span className="relative inline-flex w-16 h-16 rounded-full bg-white/10 border border-white/15 items-center justify-center backdrop-blur-md shadow-lg">
                    <CircleCheck className="w-8 h-8 text-sage" strokeWidth={2.2} />
                  </span>
                  <h2 className="relative mt-5 font-display text-2xl font-semibold text-white tracking-tight">
                    Booking confirmed
                  </h2>
                  <p className="relative mt-1.5 text-sm text-white/65 max-w-sm mx-auto leading-relaxed">
                    Your session request has been registered. Our reception team is preparing your chamber and fresh medicated formulations.
                  </p>
                </div>

                <div className="px-6 sm:px-8 py-6 space-y-4 bg-white/70">
                  <div className="flex items-center justify-between rounded-xl bg-mint/50 backdrop-blur-md border border-sage/25 px-4 py-3">
                    <span className="text-xs font-semibold text-forest">Booking reference</span>
                    <span className="font-mono text-sm font-bold text-forest-deep">
                      {rpcResponse.booking_ref}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <SummaryRow label="Treatment" value={rpcResponse.details?.therapy_name || selectedTherapy?.name} strong />
                    <SummaryRow label="Practitioner" value={rpcResponse.details?.therapist_name || selectedTherapist?.name} />
                    <SummaryRow label="Chamber" value={rpcResponse.details?.room_name || 'Assigned at check-in'} />
                    <SummaryRow
                      label="Schedule"
                      value={
                        rpcResponse.details
                          ? `${new Date(rpcResponse.details.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(rpcResponse.details.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ''
                      }
                    />
                    <SummaryRow label="Medicated oil" value={`${rpcResponse.details?.oil_required_ml ?? selectedTherapy?.oil_required_ml} mL ${rpcResponse.details?.oil_type ?? selectedTherapy?.oil_type ?? ''}`} />
                    <SummaryRow label="Duration" value={`${selectedTherapy?.duration_mins} minutes`} />
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end border-t border-line mt-2">
                    <Button variant="secondary" onClick={resetFlow}>
                      Book another session
                    </Button>
                    <Button onClick={() => setActiveTab('history')} icon={<History className="w-4 h-4" />}>
                      View My Appointments
                    </Button>
                  </div>
                </div>
                </Card>
              </motion.div>
            </StepPanel>
          )}
        </>
      )}
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value?: React.ReactNode; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs text-muted shrink-0">{label}</span>
    <span
      className={`text-right truncate text-sm ${
        strong ? 'font-display font-semibold text-forest-deep' : 'font-medium text-charcoal'
      }`}
    >
      {value || '—'}
    </span>
  </div>
);