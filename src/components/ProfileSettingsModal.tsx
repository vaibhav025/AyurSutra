import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Phone, Calendar, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Modal, Button, Input, Field } from './ui';

interface ProfileSettingsModalProps {
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    newPassword: '',
  });

  // Load existing data on mount
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check local storage fallback for DOB/Phone if not in DB
      const localProfile = localStorage.getItem('ayursutra_patient_profile');
      const parsedLocal = localProfile ? JSON.parse(localProfile) : {};

      setFormData({
        fullName: profile?.full_name || parsedLocal.clientName || '',
        email: user.email || parsedLocal.clientEmail || '',
        phone: profile?.phone || parsedLocal.clientPhone || '',
        dob: profile?.dob || parsedLocal.dob || '',
        newPassword: '',
      });
    };
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active user session.');

      // 1. Update Supabase Auth (Email & Password if changed)
      const authUpdates: any = {};
      if (formData.email !== user.email) authUpdates.email = formData.email;
      if (formData.newPassword) authUpdates.password = formData.newPassword;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }

      // 2. Update Supabase Profiles Table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          dob: formData.dob,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Update Local Storage so Booking Portal auto-fills instantly
      localStorage.setItem('ayursutra_patient_profile', JSON.stringify({
        clientName: formData.fullName,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        dob: formData.dob,
        prakriti: 'Vata-Pitta'
      }));

      // SIGNAL THE APP THAT PROFILE IS UPDATED (NO REFRESH NEEDED)
      window.dispatchEvent(new Event('profileUpdated'));

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => onClose(), 2000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="relative z-[99999]">
      <Modal
        open
        onClose={onClose}
        title="Profile Settings"
        subtitle="Manage your personal information and security."
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </div>
          )}
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <Field label="Full Name" htmlFor="fullName">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className="pl-9" placeholder="Your full name" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Birth" htmlFor="dob">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input 
                    id="dob" 
                    name="dob" 
                    type="date" 
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.dob} 
                    onChange={handleChange} 
                    className="w-full h-10 rounded-xl border border-line bg-white px-9 text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all"
                  />
                </div>
              </Field>

              <Field label="Phone Number" htmlFor="phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="pl-9" placeholder="+91 98XXX XXXXX" />
                </div>
              </Field>
            </div>

            <Field label="Email Address" htmlFor="email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="pl-9" placeholder="you@example.com" />
              </div>
            </Field>

            <Field label="New Password (Optional)" htmlFor="newPassword">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input id="newPassword" name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} className="pl-9" placeholder="Leave blank to keep current" />
              </div>
            </Field>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} loading={loading}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );

  // Safely teleport the modal to document.body
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};