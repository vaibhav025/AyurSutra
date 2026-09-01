import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Leaf, ArrowRight, ArrowLeft, Sparkles, Sun, Sunset, MoonStar, 
  CircleCheck, CalendarPlus, History, Calendar as CalendarIcon, X, Info,
  Target, AlertCircle, CheckCircle2, Star, Award, GraduationCap, CreditCard, ShieldCheck
} from 'lucide-react';
import { ayurEngine } from '../services/engine';
import type { Therapy, Therapist, ResourceRoom, BookingCreationRPCResponse, Booking } from '../types/ayursutra';
import { Button, Badge, Card, Field, Input, Select, Textarea, FilterChip, Modal } from './ui';
import { Stepper, StepPanel, TherapyCard, PractitionerCard, UploadZone } from './client/Parts';
import { supabase } from '../lib/supabaseClient';

const TIME_SLOTS = [
  { hour: 8, label: '08:00 AM', period: 'Morning Session' },
  { hour: 9, label: '09:00 AM', period: 'Morning Session' },
  { hour: 10, label: '10:00 AM', period: 'Mid-Morning Session' },
  { hour: 11, label: '11:00 AM', period: 'Mid-Morning Session' },
  { hour: 14, label: '02:00 PM', period: 'Afternoon Session' },
  { hour: 15, label: '03:00 PM', period: 'Afternoon Session' },
  { hour: 16, label: '04:00 PM', period: 'Evening Session' },
  { hour: 17, label: '05:00 PM', period: 'Evening Session' },
];

const slotGroup = (hour: number): 'Morning' | 'Afternoon' | 'Evening' =>
  hour < 12 ? 'Morning' : hour < 16 ? 'Afternoon' : 'Evening';

const GROUP_ICON = {
  Morning: <Sun className="w-3.5 h-3.5" />,
  Afternoon: <Sunset className="w-3.5 h-3.5" />,
  Evening: <MoonStar className="w-3.5 h-3.5" />
};

const calculateAge = (dobString: string): number => {
  if (!dobString) return 35; 
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const THERAPY_RICH_INFO: Record<string, { bestFor: string, treatmentDetails: string, before: string, benefits: string, after: string }> = {
  'In-Person Consultation': {
    bestFor: 'Initial assessment, chronic condition analysis, Nadi Pariksha (Pulse diagnosis), and personalized treatment planning.',
    treatmentDetails: 'A detailed one-on-one physical consultation with the Vaidya. Includes complete body constitution (Prakriti) assessment, dietary recommendations, and customized herbal prescriptions.',
    before: 'Bring any past medical reports (blood tests, scans) and avoid eating a heavy meal just before pulse diagnosis.',
    benefits: 'Get to the absolute root cause of your ailments with a customized, classical Ayurvedic healing roadmap.',
    after: 'Follow the prescribed diet, lifestyle modifications, and medication schedule exactly as guided by the Vaidya.'
  },
  'Shirodhara': {
    bestFor: 'General relaxation, stress management, and overall mind-body balance.',
    treatmentDetails: 'A gentle, continuous stream of warm oil or specialized liquid is poured over the forehead in a controlled manner while you rest comfortably. Sessions typically last 60–90 minutes based on your customized treatment plan.',
    before: 'Wear comfortable clothing and bring a hair wrap or old hat, as herbal oil will remain in your hair. Inform the practitioner of any health concerns or allergies, and avoid heavy meals prior to arrival.',
    benefits: 'Induces profound mental peace, stabilizes the nervous system, and promotes deep relaxation.',
    after: 'Rest quietly for a designated period. Follow all provided instructions regarding bathing, hair care, and daily activities.'
  },
  'Abhyanga': {
    bestFor: 'Stress, anxiety, insomnia, joint pain, muscle stiffness, fatigue, dry skin, and as a preparatory step for Panchakarma therapies.',
    treatmentDetails: 'A traditional full-body massage using warm herbal oils (such as sesame or coconut) applied with specific therapeutic strokes, followed by a warm-water bath to cleanse excess oil. The procedure takes 45–90 minutes and requires approximately 150ml of warm oil.',
    before: 'Wear clothing that accommodates oil application. Disclose any skin sensitivities or allergies, and avoid arriving on a full stomach.',
    benefits: 'Reduces physical pain, improves blood circulation, releases muscle tension, softens the skin, and flushes out bodily toxins.',
    after: 'Avoid cold water or air conditioning for at least 1 hour. Keep yourself hydrated and rest as recommended by the therapist.'
  },
  'Patra Pinda Sweda': {
    bestFor: 'Sciatica, IVDP disc bulge, osteoarthritis, knee pain, frozen shoulder, back pain, and cervical spondylosis.',
    treatmentDetails: 'A specialized sweating therapy using warm herbal bundles (pindas). These bundles—filled with medicinal leaves, coconut, and lemon—are massaged over the body for localized heat and stimulation. The session lasts 30–45 minutes.',
    before: 'Wear clothing that allows easy access to the targeted treatment areas. Inform the practitioner if you are sensitive to heat.',
    benefits: 'Provides rapid pain relief, reduces swelling and stiffness, improves joint mobility, and acts as an anti-aging treatment for joints.',
    after: 'A mandatory 1-hour rest is required. Strictly avoid air conditioning and cold water. Hydrate well and refrain from strenuous physical activity.'
  },
  'Nasya': {
    bestFor: 'Sinusitis, allergic rhinitis, migraines, hair fall, early greying, facial paralysis, tinnitus, insomnia, and stress.',
    treatmentDetails: 'Administration of medicated oils or herbal preparations directly through the nasal passages to target the head and neck regions. The procedure takes 15–30 minutes.',
    before: 'Ensure you do not have an acute nasal infection or severe irritation unless discussed with the practitioner. Avoid heavy meals immediately before treatment.',
    benefits: 'Clears sinus pathways, relieves migraines, improves scalp health, boosts memory and sleep quality, and offers facial rejuvenation.',
    after: 'Rest briefly and avoid immediate exposure to dust, smoke, or cold air.'
  },
  'Kati Basti': {
    bestFor: 'Chronic backache, lumbar spondylosis, disc prolapse, sciatica, ankylosing spondylitis, and lumbosacral strain.',
    treatmentDetails: 'A dough ring is placed on the lower back (lumbar region) and filled with comfortably warm medicated oil to provide localized, sustained healing. The session lasts 30–60 minutes. A course of 7–14 days is recommended for optimal results.',
    before: 'Wear loose clothing that allows access to the lower back. Note any heat sensitivities or skin allergies.',
    benefits: 'Delivers targeted relief for back pain and sciatica, strengthens the spine, improves flexibility, and reduces inflammation.',
    after: 'Rest, stay hydrated, and strictly avoid heavy lifting or strenuous physical exertion.'
  },
  'Janu Basti': {
    bestFor: 'Knee osteoarthritis, post-acute ligament tears, stiffness after injury, chondromalacia patella, and joint cracking.',
    treatmentDetails: 'A localized treatment where a dough ring is constructed around the knee joint and filled with warm medicated oil to deeply lubricate the tissues. Sessions last 30–40 minutes per knee.',
    before: 'Wear shorts or loose trousers that can be rolled up past the knee.',
    benefits: 'Provides immediate pain relief, reduces inflammation, deeply lubricates the joint capsule, aids in sports recovery, and improves walking mobility.',
    after: 'Rest briefly, hydrate, and avoid high-impact activities or long walks immediately afterward.'
  },
  'Udvartana': {
    bestFor: 'Overweight/obesity, cellulite, high cholesterol, diabetes, PCOS/hypothyroidism weight gain, body odor, and poor skin texture.',
    treatmentDetails: 'A therapeutic upward-stroking massage utilizing herbal powders. It can be performed dry (Ruksha) for weight loss or with oil (Snigdha) for sensitive skin. The session takes 30–60 minutes.',
    before: 'Hydrate well prior to arrival. Inform the practitioner of any open wounds, skin irritations, or allergies.',
    benefits: 'Promotes healthy weight and inch loss, exfoliates the skin, reduces cellulite, improves insulin sensitivity, and acts as an excellent pre-Panchakarma preparation.',
    after: 'Follow the specific bathing protocols provided by your therapist, drink plenty of water, and rest as needed.'
  },
  'Pizhichil': {
    bestFor: 'Paralysis, hemiplegia, muscular dystrophy, severe body pain, fibromyalgia, Parkinson\'s disease, osteoarthritis, stress, and sexual weakness.',
    treatmentDetails: 'A premium primary therapy (Pradhanakarma) combining oil pouring and massage. Warm medicated oil is continuously poured over the body while synchronized massage strokes are applied. The session lasts 45–90 minutes.',
    before: 'Wear easily changeable clothing and avoid heavy meals beforehand.',
    benefits: 'Highly effective for neurological recovery, total body pain relief, deep tissue rejuvenation, and improved mental and sexual health.',
    after: 'Rest quietly, hydrate adequately, and strictly avoid intense physical activity.'
  },
  'Takradhara': {
    bestFor: 'Insomnia, anxiety, stress, depression, migraines, psoriasis, eczema, high blood pressure, and burning sensations (Pitta imbalances).',
    treatmentDetails: 'A specialized cooling therapy where a continuous stream of medicated buttermilk is poured over the forehead or body. The treatment takes 30–60 minutes.',
    before: 'Eat a very light meal and be prepared for liquid contact with your hair and body.',
    benefits: 'Pacifies body heat (Pitta), clears skin conditions, improves sleep quality, stops Pitta-related hair fall, and lowers blood pressure.',
    after: 'Avoid all immediate sun exposure and cold drinks. Consume a light, non-spicy diet, sleep early, and avoid mobile screens for at least 1 hour. Daily sessions at the same time are highly recommended.'
  },
  'Ksheeradhara': {
    bestFor: 'Pitta-Vata headaches, high stress accompanied by body heat, facial palsy, generalized burning sensations, or for children/elderly individuals who cannot tolerate traditional oil Shirodhara.',
    treatmentDetails: 'A gentle, continuous stream of warm, medicated milk is poured over the forehead or targeted body areas. The session lasts 30–60 minutes.',
    before: 'Wear comfortable clothing and avoid eating a heavy meal right before your appointment.',
    benefits: 'Delivers deep cooling and nourishment, induces calm and restful sleep, rejuvenates the scalp, and enhances facial glow.',
    after: 'Rest, follow the prescribed hair care instructions, and hydrate well.'
  },
  'Netra Tarpana': {
    bestFor: 'Computer vision syndrome, dry eyes, eye strain, early cataracts, dark circles, eye pain, glaucoma support, and weak eye muscles.',
    treatmentDetails: 'A dough ring is created around the eyes to retain a specialized medicated preparation (typically therapeutic ghee) for an exact, supervised duration. The process takes 20–40 minutes.',
    before: 'Arrive with a clean face. Do not wear eye makeup, contact lenses, or any other eye products.',
    benefits: 'Relieves screen fatigue and dry eyes, clarifies vision, helps control myopia progression, reduces dark circles, and prevents ocular degeneration.',
    after: 'Avoid rubbing your eyes completely. Protect your eyes from harsh sunlight, excessive dust, and screens immediately following the treatment.'
  }
};

const THERAPIST_RICH_INFO: Record<string, { bio: string, highlights: string[], education: string }> = {
  'Vaidya Rajeshwari Sharma': {
    bio: 'Vaidya Rajeshwari is a highly respected Ayurvedic physician with deep expertise in Nadi Pariksha (Pulse Diagnosis). She specializes in complex neurological and autoimmune conditions, bringing a deeply compassionate and highly clinical approach to her Pradhanakarma treatments.',
    highlights: ['Expert in Nadi Pariksha (Pulse Diagnosis)', 'Specializes in Autoimmune & Neurological Disorders', 'Focuses on holistic mind-body integration'],
    education: 'BAMS, MD (Ayurveda) - Gujarat Ayurved University'
  },
  'Acharya Govind Menon': {
    bio: 'Hailing from a traditional lineage of Kerala Vaidyas, Acharya Govind is a master of Shirodhara and Marma Chikitsa. His rhythmic, synchronized therapeutic strokes and deep understanding of vital energy points make his sessions deeply transformative and restorative.',
    highlights: ['Authentic Kerala Panchakarma Tradition', 'Master of Marma Point Therapy', 'Focuses on severe stress, anxiety, and PTSD recovery'],
    education: 'BAMS - Kerala University of Health Sciences'
  },
  'Vaidya Priya Nambiar': {
    bio: 'Vaidya Priya combines classical Ayurvedic principles with modern anatomical understanding. She is renowned for her localized joint treatments like Janu Basti and Elakizhi, helping patients recover from sports injuries, arthritis, and chronic musculoskeletal pain.',
    highlights: ['Sports Injury & Mobility Recovery', 'Expert in localized Basti treatments (Janu/Kati)', 'Holistic joint health advocate'],
    education: 'BAMS - Rajiv Gandhi University of Health Sciences'
  },
  'Therapist Anand Kulkarni': {
    bio: 'Anand is a highly skilled Kaya Chikitsa practitioner known for his vigorous and highly effective Udvartana (weight loss) and Abhyanga massages. His treatments are designed to break down stubborn fat, improve lymphatic drainage, and detoxify the body at a cellular level.',
    highlights: ['Weight Management & Obesity Specialist', 'Deep Tissue & Lymphatic Drainage', 'Certified Ayurvedic Diet & Lifestyle Coach'],
    education: 'Diploma in Panchakarma Therapy & Kaya Chikitsa'
  }
};

const getRichInfo = (therapyName: string) => {
  const key = Object.keys(THERAPY_RICH_INFO).find(k => therapyName.toLowerCase().includes(k.toLowerCase()));
  return key ? THERAPY_RICH_INFO[key] : null;
};

const getTherapistRichInfo = (therapistName: string) => {
  const key = Object.keys(THERAPIST_RICH_INFO).find(k => therapistName.toLowerCase().includes(k.toLowerCase()));
  return key ? THERAPIST_RICH_INFO[key] : null;
};

interface ClientBookingPortalProps {
  onBookingSuccess?: () => void;
  onNavigateToDesk?: () => void;
}

export const ClientBookingPortal: React.FC<ClientBookingPortalProps> = ({
  onBookingSuccess,
  onNavigateToDesk,
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [therapies, setTherapies] = useState<Therapy[]>(() => ayurEngine.getTherapies());
  const [therapists, setTherapists] = useState<Therapist[]>(() => ayurEngine.getTherapists());
  const [rooms, setRooms] = useState<ResourceRoom[]>(() => ayurEngine.getRooms());
  const [allBookings, setAllBookings] = useState<Booking[]>(() => ayurEngine.getBookings());

  const [selectedTherapyId, setSelectedTherapyId] = useState('th-consult'); 
  const [selectedTherapistId, setSelectedTherapistId] = useState('tp-1');
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  
  const [infoModalTherapy, setInfoModalTherapy] = useState<Therapy | null>(null);
  const [infoModalTherapist, setInfoModalTherapist] = useState<Therapist | null>(null);

  // PAYMENT MODAL STATE
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);

  const [details, setDetails] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    dob: '',
    prakriti: 'Vata-Pitta',
    medicalNotes: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rpcResponse, setRpcResponse] = useState<BookingCreationRPCResponse | null>(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [step, setStep] = useState(1);

  // AUTO-LOAD PATIENT PROFILE & CUSTOM EVENTS
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const savedProfile = localStorage.getItem('ayursutra_patient_profile');
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setDetails(prev => ({ ...prev, ...profileData }));
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('full_name, email, phone, dob').eq('id', session.user.id).single();
          if (data) {
            setDetails(prev => ({ 
              ...prev, 
              clientName: prev.clientName || data.full_name || 'Guest', 
              clientEmail: prev.clientEmail || data.email || session.user.email || '',
              clientPhone: prev.clientPhone || data.phone || '',
              dob: prev.dob || data.dob || ''
            }));
          }
        }
      } catch (e) {
        console.warn('Auth fetch skipped in local mode');
      }
    };
    
    fetchUserData();

    const handleProfileUpdate = () => {
      const savedProfile = localStorage.getItem('ayursutra_patient_profile');
      if (savedProfile) setDetails(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
    };

    const handleTriggerPayment = (e: any) => {
      const bookingId = e.detail;
      const b = ayurEngine.getBookings().find(x => x.id === bookingId);
      if (b) {
        setActiveTab('history');
        handleInitiatePayment(b);
      }
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('triggerPayment', handleTriggerPayment);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('triggerPayment', handleTriggerPayment);
    };
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

  const selectedTherapy = useMemo(() => therapies.find((t) => t.id === selectedTherapyId) || therapies[0], [therapies, selectedTherapyId]);
  const selectedTherapist = useMemo(() => therapists.find((th) => th.id === selectedTherapistId) || therapists[0], [therapists, selectedTherapistId]);
  const allocatedRoomId = useMemo(() => rooms.find((r) => r.is_operational)?.id || 'rm-101', [rooms]);
  
  const targetStartTimeIso = useMemo(() => {
    if (selectedHour === null) return '';
    const d = new Date(selectedDate);
    d.setHours(selectedHour, 0, 0, 0);
    return d.toISOString();
  }, [selectedDate, selectedHour]);

  const filteredTherapies = useMemo(() => filterCategory === 'ALL' ? therapies : therapies.filter((t) => t.category === filterCategory), [therapies, filterCategory]);

  const canContinue = useMemo(() => {
    if (step === 1) return !!selectedTherapy;
    if (step === 2) return !!selectedTherapist && selectedTherapist.status !== 'On Leave';
    if (step === 3) return !!selectedDate && selectedHour !== null;
    return true;
  }, [step, selectedTherapy, selectedTherapist, selectedDate, selectedHour]);

  const getSlotStatus = (slotHour: number) => {
    const now = new Date();
    const slotTime = new Date(selectedDate);
    slotTime.setHours(slotHour, 0, 0, 0);

    if (slotTime <= now) {
      return { available: false, reason: 'Time Passed' };
    }

    if (selectedTherapist?.status === 'On Leave') {
      return { available: false, reason: 'Vaidya Unavailable' };
    }

    const isBooked = allBookings.some((b) => {
      if (b.therapist_id !== selectedTherapist?.id) return false;
      if (!['Pending', 'Confirmed', 'Scheduled', 'In Progress'].includes(b.status)) return false;
      
      const bTime = new Date(b.start_time);
      return bTime.getTime() === slotTime.getTime();
    });

    if (isBooked) {
      return { available: false, reason: 'Vaidya Booked' };
    }

    return { available: true, reason: '' };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsUploading(true);
    setTimeout(() => { 
      setUploadedFileName(file.name); 
      setIsUploading(false); 
    }, 600);
  };

  const handleBookSession = async () => {
    if (!details.clientName.trim() || !details.clientPhone.trim() || !details.dob) {
      alert("Please fill in your Full Name, Date of Birth, and Phone Number before booking.");
      return;
    }
    if (!targetStartTimeIso) return;

    setIsSubmitting(true);
    setRpcResponse(null);

    localStorage.setItem('ayursutra_patient_profile', JSON.stringify({
      clientName: details.clientName,
      clientPhone: details.clientPhone,
      clientEmail: details.clientEmail,
      prakriti: details.prakriti,
      dob: details.dob
    }));

    let finalReportUrl = undefined;
    let finalFileName = undefined;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('medical-reports')
          .upload(fileName, selectedFile);
          
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('medical-reports')
            .getPublicUrl(fileName);
          
          finalReportUrl = publicUrlData.publicUrl;
          finalFileName = selectedFile.name;
        }
      } catch (e) {}
    }

    const calculatedAge = calculateAge(details.dob);

    try {
      const response = await ayurEngine.createPanchakarmaBookingRPC({
        client_name: details.clientName,
        client_phone: details.clientPhone,
        client_email: details.clientEmail,
        prakriti: details.prakriti,
        client_age: calculatedAge,
        therapy_id: selectedTherapyId,
        therapist_id: selectedTherapistId,
        room_id: allocatedRoomId,
        start_time: targetStartTimeIso,
        report_url: finalReportUrl,
        report_file_name: finalFileName,
        medical_notes: details.medicalNotes,
      });

      setIsSubmitting(false);
      setRpcResponse(response);
      
      if (response.success) {
        setStep(5);
        if (onBookingSuccess) onBookingSuccess();
      }
    } catch (err: any) {
      console.error("Booking Error:", err);
      setIsSubmitting(false);
      alert("An unexpected error occurred while booking.");
    }
  };

  // --- RAZORPAY HANDLERS ---
  const handleInitiatePayment = (booking: Booking) => {
    setSelectedBookingForPayment(booking);
    setPaymentModalOpen(true);
  };

  // The fallback method if Razorpay fails or key is missing
  const processPaymentSuccess = async () => {
    if (!selectedBookingForPayment) return;
    try {
      // UPDATE STATUS TO 'Scheduled' INSTEAD OF 'Completed'
      await supabase.from('bookings').update({ status: 'Scheduled', updated_at: new Date().toISOString() }).eq('id', selectedBookingForPayment.id);
    } catch(e) {}
    
    // Refresh local engine state so UI catches the update
    ayurEngine.addAuditLog('RPC_CALL', `Payment Received: ${selectedBookingForPayment.booking_ref}`, `Payment successful. Session scheduled.`, 'success');
    
    // CLOSE PAYMENT MODAL & TRIGGER SUCCESS ANIMATION MODAL
    setPaymentModalOpen(false);
    setPaymentSuccess(true);
  };

  const executeRazorpayCheckout = async () => {
    if (!selectedBookingForPayment) return;
    
    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_MOCK_KEY_ID';

    const options = {
      key: razorpayKey,
      amount: (selectedBookingForPayment.therapy?.price || 500) * 100,
      currency: 'INR',
      name: 'AyurSutra Wellness',
      description: `Payment for ${selectedBookingForPayment.therapy?.name}`,
      image: 'https://i.ibb.co/L5Q1D0w/ayursutra-logo.png',
      handler: processPaymentSuccess,
      prefill: {
        name: details.clientName,
        email: details.clientEmail,
        contact: details.clientPhone
      },
      theme: {
        color: '#2C5E43'
      }
    };

    try {
      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch(e) {
      console.error("Razorpay Error:", e);
      alert("Could not initialize Razorpay. Use the Simulate Payment option for demo purposes.");
    }
  };

  const resetFlow = () => {
    setStep(1);
    setRpcResponse(null);
    setUploadedFileName(null);
    setSelectedFile(null);
    setSelectedHour(null);
    setActiveTab('book');
  };

  const summaryRows = (
    <>
      <SummaryRow label="Selection" value={selectedTherapy?.name} strong />
      <SummaryRow label="Practitioner" value={selectedTherapist?.name} />
      <SummaryRow 
        label="Schedule" 
        value={step >= 3 && targetStartTimeIso ? `${new Date(targetStartTimeIso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${TIME_SLOTS.find((s) => s.hour === selectedHour)?.label}` : 'Not selected'} 
      />
      <SummaryRow label="Duration" value={`${selectedTherapy?.duration_mins ?? 30} minutes`} />
    </>
  );

  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const displayFirstName = details.clientName ? details.clientName.split(' ')[0] : '';
  
  const richInfo = infoModalTherapy ? getRichInfo(infoModalTherapy.name) : null;
  const richTherapistInfo = infoModalTherapist ? getTherapistRichInfo(infoModalTherapist.name) : null;

  return (
    <div className="space-y-6 lg:space-y-8 relative">
      
      {/* 🚀 TICK ANIMATION SUCCESS MODAL 🚀 */}
      <AnimatePresence>
        {paymentSuccess && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Confetti background flair */}
              <div aria-hidden className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.15), transparent 70%)' }} />
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 250, damping: 15, delay: 0.1 }}
                className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-5 shadow-inner relative z-10"
              >
                <CheckCircle2 className="w-10 h-10" strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-2xl font-display font-bold text-forest-deep mb-2 relative z-10">Payment Successful!</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed relative z-10">
                Your booking for <span className="text-charcoal font-bold">{selectedBookingForPayment?.therapy?.name}</span> is now fully scheduled.
              </p>
              
              <Button
                size="lg"
                className="w-full relative z-10"
                onClick={() => {
                  setPaymentSuccess(false);
                  window.location.reload(); 
                }}
              >
                Done
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED PAYMENT MODAL */}
      <AnimatePresence>
        {paymentModalOpen && selectedBookingForPayment && !paymentSuccess && (
          <Modal open onClose={() => setPaymentModalOpen(false)} title="Secure Checkout" maxWidth="max-w-md">
            <div className="space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Booking Ref</p>
                    <p className="text-sm font-mono font-semibold text-charcoal">{selectedBookingForPayment.booking_ref}</p>
                  </div>
                  <Badge tone="success">Approved</Badge>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500 font-medium">Therapy</span>
                    <span className="text-sm font-semibold text-forest-deep text-right max-w-[60%]">{selectedBookingForPayment.therapy?.name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500 font-medium">Practitioner</span>
                    <span className="text-sm font-semibold text-charcoal text-right">{selectedBookingForPayment.therapist?.name}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500 font-medium">Schedule</span>
                    <span className="text-sm font-semibold text-charcoal text-right">
                      {new Date(selectedBookingForPayment.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(selectedBookingForPayment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-500 font-medium">Duration</span>
                    <span className="text-sm font-semibold text-charcoal text-right">{selectedBookingForPayment.therapy?.duration_mins} mins</span>
                  </div>

                  <div className="pt-4 mt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-slate-700">Total Payable</span>
                      <span className="text-2xl font-display font-bold text-forest-deep">₹{selectedBookingForPayment.therapy?.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg" className="w-full shadow-md hover:shadow-lg transition-all" icon={<CreditCard className="w-4 h-4" />} onClick={executeRazorpayCheckout}>
                  Proceed to Pay ₹{selectedBookingForPayment.therapy?.price}
                </Button>
                
                {/* HACKATHON PROTOTYPE BYPASS BUTTON */}
                <button 
                  onClick={processPaymentSuccess}
                  className="w-full text-center py-2 text-xs font-semibold text-slate-400 hover:text-forest transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Simulate Payment (Prototype Demo Bypass)
                </button>
              </div>

            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* RICH THERAPY INFO MODAL */}
      <AnimatePresence>
        {infoModalTherapy && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
            onClick={() => setInfoModalTherapy(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 sm:px-8 pb-5">
                <button onClick={() => setInfoModalTherapy(null)} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="inline-flex px-2.5 py-1 rounded-full bg-sage/20 text-forest-deep text-[10px] font-bold uppercase tracking-widest mb-3">
                  {infoModalTherapy.category}
                </div>
                <h2 className="text-3xl font-display font-bold text-forest-deep">{infoModalTherapy.name}</h2>
                <p className="text-sm text-sage italic mt-1">{infoModalTherapy.sanskrit_name}</p>
              </div>

              <div className="overflow-y-auto p-6 sm:px-8 space-y-6 pb-24">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Details
                  </h4>
                  <p className="text-sm text-charcoal leading-relaxed">{richInfo?.treatmentDetails || infoModalTherapy.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Duration</span>
                    <span className="font-semibold text-charcoal">{infoModalTherapy.duration_mins} Minutes</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Fee</span>
                    <span className="font-semibold text-charcoal">₹{infoModalTherapy.price}</span>
                  </div>
                </div>

                {richInfo && (
                  <div className="bg-blue-50/50 border border-blue-100/60 rounded-2xl p-5">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Best For
                    </h4>
                    <p className="text-sm text-blue-900/90 leading-relaxed font-medium">{richInfo.bestFor}</p>
                  </div>
                )}

                {richInfo && (
                  <div className="bg-emerald-50/50 border border-emerald-100/60 rounded-2xl p-5">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Key Benefits
                    </h4>
                    <p className="text-sm text-emerald-900/90 leading-relaxed font-medium">{richInfo.benefits}</p>
                  </div>
                )}

                {richInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-amber-50/50 border border-amber-100/60 rounded-2xl p-5">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Before Session
                      </h4>
                      <p className="text-sm text-amber-900/80 leading-relaxed">{richInfo.before}</p>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-100/60 rounded-2xl p-5">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> After Session
                      </h4>
                      <p className="text-sm text-purple-900/80 leading-relaxed">{richInfo.after}</p>
                    </div>
                  </div>
                )}

                {infoModalTherapy.oil_type && infoModalTherapy.oil_required_ml > 0 && infoModalTherapy.oil_type !== 'None' && (
                  <div className="bg-orange-50/50 border border-orange-100/60 rounded-2xl p-5">
                    <span className="block text-[11px] text-orange-800/60 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5" /> Medicated Formulation Requirement
                    </span>
                    <span className="font-semibold text-orange-900 text-sm mt-1 block">
                      {infoModalTherapy.oil_type} ({infoModalTherapy.oil_required_ml}mL)
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:px-8 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-end">
                <Button onClick={() => { setSelectedTherapyId(infoModalTherapy.id); setInfoModalTherapy(null); }}>
                  Select this service
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RICH THERAPIST INFO MODAL */}
      <AnimatePresence>
        {infoModalTherapist && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
            onClick={() => setInfoModalTherapist(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 sm:px-8 pb-6 flex items-start gap-5">
                <button onClick={() => setInfoModalTherapist(null)} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <img 
                  src={infoModalTherapist.avatar_url} 
                  alt={infoModalTherapist.name} 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-md border-4 border-white shrink-0 bg-sage-soft"
                />
                <div className="pt-2 pr-8">
                  <div className="inline-flex px-2.5 py-1 rounded-full bg-sage/20 text-forest-deep text-[10px] font-bold uppercase tracking-widest mb-2">
                    {infoModalTherapist.title}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-forest-deep leading-tight">
                    {infoModalTherapist.name}
                  </h2>
                  <p className="text-sm text-sage font-medium mt-1.5 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5" /> {infoModalTherapist.specialization}
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto p-6 sm:px-8 space-y-6 pb-24">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                    <Star className="w-5 h-5 text-amber-500 mx-auto mb-1.5 fill-current" />
                    <span className="block font-bold text-lg text-amber-900">{infoModalTherapist.rating}</span>
                    <span className="block text-[10px] text-amber-700/70 font-bold uppercase tracking-wider">Rating</span>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-center">
                    <Award className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                    <span className="block font-bold text-lg text-emerald-900">{infoModalTherapist.experience_years}+</span>
                    <span className="block text-[10px] text-emerald-700/70 font-bold uppercase tracking-wider">Years Exp.</span>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                    <span className="block font-bold text-lg text-blue-900">{infoModalTherapist.completed_sessions || '500+'}</span>
                    <span className="block text-[10px] text-blue-700/70 font-bold uppercase tracking-wider">Sessions</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">About Practitioner</h4>
                  <p className="text-sm text-charcoal leading-relaxed">{richTherapistInfo?.bio || 'Certified Ayurvedic practitioner dedicated to holistic healing and traditional Panchakarma protocols.'}</p>
                </div>

                {richTherapistInfo && (
                  <div className="bg-forest-deep/5 border border-forest/10 rounded-2xl p-5">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-forest-deep mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Expertise Highlights
                    </h4>
                    <ul className="space-y-2.5">
                      {richTherapistInfo.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-charcoal font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-sage mt-1.5 shrink-0" /> {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {richTherapistInfo && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" /> Education & Certifications
                    </h4>
                    <p className="text-sm text-charcoal font-medium">{richTherapistInfo.education}</p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:px-8 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-end">
                <Button onClick={() => { setSelectedTherapistId(infoModalTherapist.id); setInfoModalTherapist(null); }}>
                  Select Practitioner
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        
        <div className="flex bg-white/40 p-1.5 rounded-xl backdrop-blur-sm border border-white/50 shadow-inner shrink-0">
          <button onClick={() => setActiveTab('book')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'book' ? 'bg-white text-forest-deep shadow-sm' : 'text-muted hover:text-charcoal'}`}>
            <CalendarIcon className="w-4 h-4" /> Book Session
          </button>
          <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-forest-deep shadow-sm' : 'text-muted hover:text-charcoal'}`}>
            <History className="w-4 h-4" /> My Appointments
          </button>
        </div>
      </section>

      {activeTab === 'history' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
           {myBookings.length === 0 ? (
             <Card className="p-10 text-center bg-white/50 backdrop-blur-md border-dashed">
               <History className="w-10 h-10 text-sage mx-auto mb-3 opacity-50" />
               <p className="font-display font-semibold text-charcoal">No appointments found</p>
               <Button onClick={() => setActiveTab('book')} className="mt-4">Book your first session</Button>
             </Card>
           ) : (
             myBookings.map((b) => {
               if (b.status === 'Rejected') return null;

               return (
                 <Card key={b.id} className="p-5 sm:p-6 bg-white/60 backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                   <div className="flex flex-col sm:flex-row justify-between gap-4">
                     <div>
                       <div className="flex items-center gap-3 mb-2">
                         <h3 className="font-display font-semibold text-lg text-forest-deep">{b.therapy?.name}</h3>
                         <Badge tone={b.status === 'Scheduled' ? 'success' : b.status === 'Completed' ? 'neutral' : 'brand'}>{b.status}</Badge>
                       </div>
                       <p className="text-sm text-charcoal font-medium">
                         {new Date(b.start_time).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                     </div>
                     <div className="flex flex-col items-start sm:items-end justify-between gap-3">
                       <div className="text-left sm:text-right">
                         <p className="text-sm font-medium text-forest-deep">{b.therapist?.name}</p>
                         <p className="text-xs text-muted mt-1">Ref: {b.booking_ref}</p>
                       </div>
                       
                       {/* Razorpay Pay Now Button */}
                       {b.status === 'Confirmed' && (
                         <Button size="sm" onClick={() => handleInitiatePayment(b)} icon={<CreditCard className="w-3.5 h-3.5" />}>
                           Pay ₹{b.therapy?.price} Now
                         </Button>
                       )}
                     </div>
                   </div>
                 </Card>
               );
             })
           )}
        </motion.div>
      ) : (
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
                          <h2 className="font-display text-lg font-semibold text-forest-deep">Select your service</h2>
                          <p className="text-xs text-muted mt-0.5">Classical Panchakarma protocols & Consultations tailored to your constitution.</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {['ALL', 'Consultation', 'Purvakarma', 'Pradhanakarma'].map(cat => (
                             <FilterChip key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)}>{cat}</FilterChip>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                        {filteredTherapies.map((t) => (
                          <TherapyCard
                            key={t.id}
                            therapy={t}
                            selected={t.id === selectedTherapyId}
                            onSelect={() => setSelectedTherapyId(t.id)}
                            onInfoClick={() => setInfoModalTherapy(t)}
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
                            onInfoClick={() => setInfoModalTherapist(th)}
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
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedHour(null);
                          }}
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
                                const { available, reason } = getSlotStatus(slot.hour);
                                const active = selectedHour === slot.hour && available;
                                
                                return (
                                  <button
                                    key={slot.hour}
                                    type="button"
                                    role="radio"
                                    disabled={!available}
                                    aria-checked={active}
                                    onClick={() => available && setSelectedHour(slot.hour)}
                                    className={`min-h-[52px] rounded-xl border px-2 text-center transition-all duration-300 ${
                                      !available 
                                        ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                                        : active
                                          ? 'bg-forest text-white border-forest shadow-md -translate-y-0.5'
                                          : 'bg-white/40 hover:bg-white border-line hover:border-sage/40 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer'
                                    }`}
                                  >
                                    <span className={`block text-xs font-bold ${active ? '' : !available ? 'text-slate-400' : 'text-charcoal'}`}>
                                      {slot.label}
                                    </span>
                                    <span className={`block text-[9px] mt-0.5 font-medium ${active ? 'text-white/70' : !available ? 'text-red-400' : 'text-muted'}`}>
                                      {!available ? reason : slot.period}
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
                            <Field label="Date of Birth" htmlFor="c-dob" required>
                              <input
                                id="c-dob"
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                value={details.dob}
                                onChange={(e) => setDetails({ ...details, dob: e.target.value })}
                                className="w-full h-12 rounded-xl border border-line bg-white/50 backdrop-blur-md px-4 text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-3 focus:ring-sage/15 cursor-pointer shadow-sm transition-all hover:bg-white"
                              />
                            </Field>
                            <Field label="Phone number" htmlFor="c-phone" required>
                              <Input id="c-phone" type="tel" value={details.clientPhone} onChange={(e) => setDetails({ ...details, clientPhone: e.target.value })} placeholder="+91 98XXX XXXXX" className="bg-white/50 backdrop-blur-md" />
                            </Field>
                            <Field label="Email address" htmlFor="c-email">
                              <Input id="c-email" type="email" value={details.clientEmail} onChange={(e) => setDetails({ ...details, clientEmail: e.target.value })} placeholder="you@example.com" className="bg-white/50 backdrop-blur-md" />
                            </Field>
                            <div className="sm:col-span-2">
                              <Field label="Prakriti (dosha constitution)" htmlFor="c-prakriti">
                                <Select id="c-prakriti" value={details.prakriti} onChange={(e) => setDetails({ ...details, prakriti: e.target.value })} className="bg-white/50 backdrop-blur-md">
                                  <option>Vata-Pitta</option>
                                  <option>Pitta-Kapha</option>
                                  <option>Vata-Kapha</option>
                                  <option>Tridoshic</option>
                                  <option>Pure Vata</option>
                                  <option>Pure Pitta</option>
                                  <option>I don't know my prakriti</option>
                                </Select>
                              </Field>
                            </div>
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
                          onRemove={() => { setUploadedFileName(null); setSelectedFile(null); }}
                        />
                      </Card>

                      {rpcResponse && !rpcResponse.success && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 shadow-sm"
                        >
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-red-800">Booking Unsuccessful</h4>
                            <p className="text-xs font-medium text-red-700/90 mt-0.5 leading-relaxed">
                              {(rpcResponse as any).message || (rpcResponse as any).error || 'The selected time slot is unavailable, or there are insufficient resources to fulfill this request. Please choose another time.'}
                            </p>
                          </div>
                        </motion.div>
                      )}

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
                  <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(420px 260px at 50% -20%, rgba(127,165,141,.45), transparent 65%)' }} />
                  <span className="relative inline-flex w-16 h-16 rounded-full bg-white/10 border border-white/15 items-center justify-center backdrop-blur-md shadow-lg">
                    <CircleCheck className="w-8 h-8 text-sage" strokeWidth={2.2} />
                  </span>
                  <h2 className="relative mt-5 font-display text-2xl font-semibold text-white tracking-tight">Booking confirmed</h2>
                  <p className="relative mt-1.5 text-sm text-white/65 max-w-sm mx-auto leading-relaxed">
                    Your session request has been registered. Our reception team is preparing your chamber and fresh medicated formulations.
                  </p>
                </div>
                <div className="px-6 sm:px-8 py-6 space-y-4 bg-white/70">
                  <div className="flex items-center justify-between rounded-xl bg-mint/50 backdrop-blur-md border border-sage/25 px-4 py-3">
                    <span className="text-xs font-semibold text-forest">Booking reference</span>
                    <span className="font-mono text-sm font-bold text-forest-deep">{rpcResponse.booking_ref}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <SummaryRow label="Selection" value={rpcResponse.details?.therapy_name || selectedTherapy?.name} strong />
                    <SummaryRow label="Practitioner" value={rpcResponse.details?.therapist_name || selectedTherapist?.name} />
                    <SummaryRow label="Chamber" value={rpcResponse.details?.room_name || 'Assigned at check-in'} />
                    <SummaryRow label="Schedule" value={rpcResponse.details ? `${new Date(rpcResponse.details.start_time).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(rpcResponse.details.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''} />
                    <SummaryRow label="Medicated Formulation" value={`${rpcResponse.details?.oil_required_ml ?? selectedTherapy?.oil_required_ml} mL ${rpcResponse.details?.oil_type ?? selectedTherapy?.oil_type ?? ''}`} />
                    <SummaryRow label="Duration" value={`${selectedTherapy?.duration_mins} minutes`} />
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end border-t border-line mt-2">
                    <Button variant="secondary" onClick={resetFlow}>Book another session</Button>
                    <Button onClick={() => setActiveTab('history')} icon={<History className="w-4 h-4" />}>View My Appointments</Button>
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

const SummaryRow: React.FC<{ label: string; value?: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs text-muted shrink-0">{label}</span>
    <span className={`text-right truncate text-sm ${strong ? 'font-display font-semibold text-forest-deep' : 'font-medium text-charcoal'}`}>{value || '—'}</span>
  </div>
);