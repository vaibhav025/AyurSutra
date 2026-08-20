import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  UploadCloud, 
  FileText, 
  ArrowRight,
  Check,
  X,
  Heart,
  ShieldCheck,
  Leaf
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ayurEngine } from '../services/engine';
import { Therapy, Therapist, ResourceRoom, BookingCreationRPCResponse } from '../types/ayursutra';

interface ClientBookingPortalProps {
  onBookingSuccess?: () => void;
  onNavigateToDesk?: () => void;
}

export const ClientBookingPortal: React.FC<ClientBookingPortalProps> = ({
  onBookingSuccess,
  onNavigateToDesk,
}) => {
  // State from AyurSutra engine
  const [therapies, setTherapies] = useState<Therapy[]>(() => ayurEngine.getTherapies());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());

  // Form State
  const [selectedTherapyId, setSelectedTherapyId] = useState<string>('th-101');
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('tp-2');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState<number>(10); // 10:00 AM

  // Client Details & Medical Dossier
  const [clientName, setClientName] = useState('Dr. Siddharth Varma');
  const [clientPhone, setClientPhone] = useState('+91 98401 23456');
  const [clientEmail, setClientEmail] = useState('siddharth.varma@example.com');
  const [clientAge, setClientAge] = useState<number>(44);
  const [clientGender, setClientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [prakriti, setPrakriti] = useState<string>('Vata-Pitta');
  const [medicalNotes, setMedicalNotes] = useState('Experiencing cervical stiffness and cognitive stress. Requesting gentle warm herbal oleation.');

  // Mock Storage State
  const [uploadedFileName, setUploadedFileName] = useState<string>('siddharth_varma_nadi_analysis.pdf');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [rpcResponse, setRpcResponse] = useState<BookingCreationRPCResponse | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Subscribe to Engine changes
  useEffect(() => {
    return ayurEngine.subscribe(() => {
      setTherapies(ayurEngine.getTherapies());
      setTherapists(ayurEngine.getTherapists());
      setRooms(ayurEngine.getRooms());
    });
  }, []);

  const selectedTherapy = useMemo(
    () => therapies.find((t) => t.id === selectedTherapyId) || therapies[0],
    [therapies, selectedTherapyId]
  );

  const selectedTherapist = useMemo(
    () => therapists.find((th) => th.id === selectedTherapistId) || therapists[0],
    [therapists, selectedTherapistId]
  );

  // Automatically find an available operational room for the client behind the scenes
  const allocatedRoomId = useMemo(() => {
    const operationalRoom = rooms.find((r) => r.is_operational) || rooms[0];
    return operationalRoom?.id || 'rm-101';
  }, [rooms]);

  // Compute ISO start time
  const targetStartTimeIso = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(selectedHour, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate, selectedHour]);

  // Handle Mock Storage Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setUploadedFileName(file.name);
      setIsUploading(false);
    }, 600);
  };

  // Submit Treatment Request via PostgreSQL RPC function
  const handleBookSession = async () => {
    if (!clientName.trim()) {
      alert('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    setRpcResponse(null);

    const reportUrl = uploadedFileName 
      ? `https://ayursutra.supabase.co/storage/v1/object/public/medical-reports/${Date.now()}_${uploadedFileName}`
      : undefined;

    const response = await ayurEngine.createPanchakarmaBookingRPC({
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      client_age: clientAge,
      client_gender: clientGender,
      prakriti: prakriti,
      therapy_id: selectedTherapyId,
      therapist_id: selectedTherapistId,
      room_id: allocatedRoomId,
      start_time: targetStartTimeIso,
      report_url: reportUrl,
      report_file_name: uploadedFileName || undefined,
      medical_notes: medicalNotes,
    });

    setIsSubmitting(false);
    setRpcResponse(response);

    if (response.success) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8B9D83', '#2D3A3A', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // ignore if canvas unavailable
      }
      if (onBookingSuccess) onBookingSuccess();
    }
  };

  const timeSlots = [
    { hour: 8, label: '08:00 AM', period: 'Morning Oleation' },
    { hour: 9, label: '09:00 AM', period: 'Morning Oleation' },
    { hour: 10, label: '10:00 AM', period: 'Mid-Morning Session' },
    { hour: 11, label: '11:00 AM', period: 'Mid-Morning Session' },
    { hour: 14, label: '02:00 PM', period: 'Afternoon Rejuvenation' },
    { hour: 15, label: '03:00 PM', period: 'Afternoon Rejuvenation' },
    { hour: 16, label: '04:00 PM', period: 'Evening Rasayana' },
    { hour: 17, label: '05:00 PM', period: 'Evening Rasayana' },
  ];

  const filteredTherapies = useMemo(() => {
    if (filterCategory === 'ALL') return therapies;
    return therapies.filter((t) => t.category === filterCategory);
  }, [therapies, filterCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Patient Welcome Hero Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#8B9D83]/15 text-[#2D3A3A] text-xs font-semibold">
            <Leaf className="w-3.5 h-3.5 text-[#8B9D83]" />
            <span>Ayurvedic Holistic Healing Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            Schedule Your Panchakarma Treatment
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Experience traditional Vedic healing customized to your unique doshic constitution. Choose your therapy, preferred practitioner, and convenient time slot below.
          </p>
        </div>

        <div className="flex sm:flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 text-center min-w-[180px]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">AyurSutra Clinic</span>
          <span className="text-sm font-serif font-bold text-[#2D3A3A] mt-0.5">Certified Vaidyas</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online Intake Active
          </span>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Therapy Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: Select Therapy */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 1 of 3</span>
                <h2 className="text-lg font-serif font-bold text-slate-900">Select Classical Therapy</h2>
              </div>
              
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'Purvakarma', 'Pradhanakarma'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filterCategory === cat
                        ? 'bg-[#2D3A3A] text-white font-semibold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredTherapies.map((t) => {
                const isSelected = t.id === selectedTherapyId;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTherapyId(t.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'bg-[#8B9D83]/10 border-[#8B9D83] ring-1 ring-[#8B9D83] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#8B9D83] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="pr-5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {t.category}
                      </span>
                      <h3 className="font-serif font-bold text-slate-900 text-base mt-1.5">{t.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 italic">{t.sanskrit_name}</p>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {t.duration_mins} mins
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {t.dosha_target || 'Tridoshic Balance'}
                      </span>
                      <span className="font-bold text-slate-900">₹{t.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Date & Time Schedule + Practitioner Preference */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 2 of 3</span>
              <h2 className="text-lg font-serif font-bold text-slate-900">Choose Date & Practitioner</h2>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                Preferred Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83] focus:ring-1 focus:ring-[#8B9D83]"
              />
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Select Preferred Time Slot
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot) => {
                  const isSelected = selectedHour === slot.hour;
                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      onClick={() => setSelectedHour(slot.hour)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                        isSelected
                          ? 'bg-[#2D3A3A] text-white shadow-sm font-bold'
                          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span>{slot.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Practitioner Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8B9D83]" />
                Preferred Certified Vaidya / Practitioner
              </label>
              <select
                value={selectedTherapistId}
                onChange={(e) => setSelectedTherapistId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
              >
                {therapists.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.name} ({th.title} • {th.specialization.split('&')[0]}) - ⭐ {th.rating}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* STEP 3: Client Details & Health Dossier */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 3 of 3</span>
              <h2 className="text-lg font-serif font-bold text-slate-900">Your Health Profile & Intake</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Dr. Siddharth Varma"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91 98XXX XXXXX"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prakriti (Dosha Constitution)</label>
                <select
                  value={prakriti}
                  onChange={(e) => setPrakriti(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#8B9D83]"
                >
                  <option value="Vata-Pitta">Vata-Pitta (Primary)</option>
                  <option value="Pitta-Kapha">Pitta-Kapha</option>
                  <option value="Vata-Kapha">Vata-Kapha</option>
                  <option value="Tridoshic">Tridoshic (Balanced)</option>
                  <option value="Pure Vata">Pure Vata</option>
                  <option value="Pure Pitta">Pure Pitta</option>
                </select>
              </div>
            </div>

            {/* Health Symptoms */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Symptoms or Special Requests for Vaidya</label>
              <textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Mention any stiffness, digestion, stress, sleep patterns, or previous therapies..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#8B9D83]"
              />
            </div>

            {/* Medical Report Upload (Client Perspective) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8B9D83]" />
                  Upload Previous Ayurvedic or Diagnostic Report (Optional)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">PDF or Image</span>
              </label>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100/70 transition-colors">
                <input
                  type="file"
                  id="pdf-upload"
                  accept=".pdf,.png,.jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer block">
                  <UploadCloud className="w-6 h-6 text-[#8B9D83] mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-700">
                    Click to attach Nadi pulse scan, lab report, or prescription
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ensures our Vaidya prepares personalized herbal decoctions before your arrival
                  </p>
                </label>

                {isUploading && (
                  <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-[#8B9D83] font-medium">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-[#8B9D83] border-t-transparent animate-spin"></span>
                    <span>Uploading medical report securely...</span>
                  </div>
                )}

                {uploadedFileName && !isUploading && (
                  <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono font-medium">{uploadedFileName}</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFileName('')}
                      className="text-slate-400 hover:text-red-500 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Appointment Summary & Direct Booking (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#8B9D83]" />
                <h3 className="font-serif font-bold text-slate-900">Treatment Summary</h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Panchakarma Care
              </span>
            </div>

            {/* Treatment Details Overview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
              <div className="flex justify-between items-start text-slate-600">
                <span>Selected Protocol:</span>
                <span className="font-semibold text-slate-900 text-right">{selectedTherapy?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vedic Sanskrit Name:</span>
                <span className="italic text-slate-700">{selectedTherapy?.sanskrit_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Session Duration:</span>
                <span className="font-semibold text-slate-800">{selectedTherapy?.duration_mins} Minutes</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Assigned Vaidya:</span>
                <span className="font-semibold text-slate-800">{selectedTherapist?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Scheduled Timing:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(targetStartTimeIso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })},{' '}
                  {selectedHour}:00
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                <span className="font-medium text-slate-800">Treatment Fee:</span>
                <span className="font-bold text-lg text-[#2D3A3A]">₹{selectedTherapy?.price}</span>
              </div>
            </div>

            {/* Ayurvedic Clinical Guarantee */}
            <div className="p-3.5 rounded-lg bg-[#8B9D83]/10 border border-[#8B9D83]/20 text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-semibold text-[#2D3A3A]">
                <Heart className="w-4 h-4 text-[#8B9D83]" />
                <span>Personalized Vedic Care Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Upon submitting your request, our chief Ayurvedic reception desk verifies practitioner scheduling and prepares fresh medicated herbal formulations specifically for your session.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleBookSession}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-lg font-serif font-bold text-sm bg-[#8B9D83] hover:bg-[#7a8c72] text-white cursor-pointer active:scale-[0.98] transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>Confirming Treatment Request...</span>
                </>
              ) : (
                <>
                  <span>Request Panchakarma Treatment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Patient Feedback Alert */}
            {rpcResponse && (
              <div className={`p-4 rounded-xl border animate-in fade-in duration-300 ${
                rpcResponse.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-emerald-900">
                      {rpcResponse.success ? 'Treatment Request Received!' : 'Request Under Review'}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {rpcResponse.success
                        ? 'Your appointment has been registered. Our reception team is preparing your room and customized formulations.'
                        : 'Your preferred slot is being coordinated with our Vaidya team. You can check with the reception desk.'}
                    </p>
                    
                    {rpcResponse.booking_ref && (
                      <div className="pt-2 flex items-center justify-between">
                        <span className="font-mono text-[#2D3A3A] bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                          Ref: {rpcResponse.booking_ref}
                        </span>
                        {onNavigateToDesk && (
                          <button
                            onClick={onNavigateToDesk}
                            className="text-[#8B9D83] hover:text-[#2D3A3A] font-semibold underline text-[11px]"
                          >
                            View on Reception Desk →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
