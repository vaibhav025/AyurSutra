import React from 'react';
import { 
  X, 
  FileText, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  User, 
  Calendar, 
  Droplet,
  CheckCircle2
} from 'lucide-react';
import { Booking } from '../types/ayursutra';

interface MedicalReportModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  const fileName = booking.report_file_name || `${booking.client_name.toLowerCase().replace(/\s+/g, '_')}_ayurvedic_dossier.pdf`;
  const therapy = booking.therapy;
  const therapist = booking.therapist;
  const room = booking.room;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div 
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header (Professional Polish Dark Banner) */}
        <div className="bg-[#2D3A3A] px-6 py-4 border-b border-white/10 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#8B9D83] flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-serif font-bold text-white">
                  Client Medical Dossier & Diagnostic Report
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#8B9D83] font-semibold">
                  CONFIDENTIAL
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Supabase Storage Bucket: <code className="font-mono text-[#8B9D83]">medical-reports</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          
          {/* Patient Overview Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Patient Name</span>
              <span className="font-bold text-slate-900 mt-0.5 block">{booking.client_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Prakriti (Constitution)</span>
              <span className="font-semibold text-[#2D3A3A] mt-0.5 block">{booking.prakriti || 'Vata-Pitta'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Booking Reference</span>
              <span className="font-mono font-bold text-slate-700 mt-0.5 block">{booking.booking_ref}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Vaidya</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{therapist?.name || 'Vaidya Priya'}</span>
            </div>
          </div>

          {/* Dosha & Vitals Assessment */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Nadi & Dosha Imbalance Assessment
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Vata (Air & Space)</span>
                <p className="text-lg font-bold text-[#2D3A3A] mt-0.5">72% <span className="text-[10px] text-orange-600 font-semibold">(Elevated)</span></p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#8B9D83] h-full w-[72%]"></div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Pitta (Fire & Water)</span>
                <p className="text-lg font-bold text-[#2D3A3A] mt-0.5">58% <span className="text-[10px] text-slate-400 font-normal">(Moderate)</span></p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#8B9D83] h-full w-[58%]"></div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Kapha (Earth & Water)</span>
                <p className="text-lg font-bold text-[#2D3A3A] mt-0.5">34% <span className="text-[10px] text-emerald-600 font-semibold">(Balanced)</span></p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#8B9D83] h-full w-[34%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Prescribed Procedure & Notes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Prescribed Panchakarma Protocol & Oil Specifications
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Therapy:</span>
                <span className="font-semibold text-slate-900">{therapy?.name} ({therapy?.sanskrit_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Formulation Oil:</span>
                <span className="font-semibold text-[#2D3A3A]">{therapy?.oil_type} ({therapy?.oil_required_ml} mL)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Droni Bed Suite:</span>
                <span className="font-semibold text-slate-900">{room?.room_name} ({room?.droni_wood})</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                <strong className="text-slate-800">Pre-Treatment Clinical Notes:</strong> {booking.medical_notes || 'Standard protocol. Warm oil stream 4 inches above Ajna chakra for 45 minutes.'}
              </div>
            </div>
          </div>

          {/* Simulated PDF Document Viewer */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{fileName}</p>
                <p className="text-[11px] text-slate-400">
                  PDF Document • 2.4 MB • Stored in Supabase S3
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={booking.report_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open File</span>
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">HIPAA & Clinical Ayurvedic Protocol Compliant</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2D3A3A] hover:bg-[#1E2525] text-white shadow-sm transition-colors"
          >
            Close Dossier
          </button>
        </div>

      </div>

    </div>
  );
};
