import React, { useState, useEffect } from 'react';
import { X, Upload, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

interface ContactForm {
  email: string;
  message: string;
  billFile: File | null;
  meterFile: File | null;
  additionalFile: File | null;
  website: string; // Honeypot field
}

export function ContactModal({ isOpen, onClose, initialMessage = '' }: ContactModalProps) {
  const { t } = useTranslation();
  const [contactForm, setContactForm] = useState<ContactForm>({
    email: '',
    message: initialMessage,
    billFile: null,
    meterFile: null,
    additionalFile: null,
    website: '', // Honeypot field should remain empty
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formLoadTime] = useState<number>(Date.now());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bill' | 'meter' | 'additional') => {
    const file = e.target.files?.[0];
    if (file) {
      setContactForm(prev => ({
        ...prev,
        [type === 'bill' ? 'billFile' : type === 'meter' ? 'meterFile' : 'additionalFile']: file
      }));
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (contactForm.website) {
      toast.error(t('contact.errors.general'));
      return;
    }

    const timeSinceLoad = Date.now() - formLoadTime;
    if (timeSinceLoad < 3000) {
      toast.error(t('contact.errors.slowDown'));
      return;
    }

    if (!contactForm.email || !contactForm.message) {
      toast.error(t('contact.errors.required'));
      return;
    }

    setSubmitting(true);

    try {
      const formData: Record<string, any> = {
        email: contactForm.email,
        message: contactForm.message,
        submissionTime: timeSinceLoad,
      };

      if (contactForm.billFile) {
        formData.billFile = await convertFileToBase64(contactForm.billFile);
      }
      if (contactForm.meterFile) {
        formData.meterFile = await convertFileToBase64(contactForm.meterFile);
      }
      if (contactForm.additionalFile) {
        formData.additionalFile = await convertFileToBase64(contactForm.additionalFile);
      }

      const functionUrl = `${supabase.supabaseUrl}/functions/v1/send-contact`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('contact.errors.general') }));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || t('contact.errors.general'));
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        setContactForm({
          email: '',
          message: '',
          billFile: null,
          meterFile: null,
          additionalFile: null,
          website: '',
        });
        setShowSuccess(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(t('contact.errors.general'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-md w-full mx-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500 animate-[scale_0.5s_ease-in-out]" />
            </div>
            <h3 className="text-xl font-bold text-green-900">{t('contact.success.title')}</h3>
            <p className="text-green-700">
              {t('contact.success.message')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-amber-900">{t('contact.title')}</h2>
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">
                {t('contact.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-amber-400" />
                </div>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                  placeholder={t('contact.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="hidden">
              <label>
                Site web (ne pas remplir)
                <input
                  type="text"
                  name="website"
                  value={contactForm.website}
                  onChange={(e) => setContactForm(prev => ({ ...prev, website: e.target.value }))}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">
                {t('contact.message')}
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3">
                  <MessageSquare className="h-5 w-5 text-amber-400" />
                </div>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[100px] bg-white text-gray-900"
                  placeholder={t('contact.messagePlaceholder')}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">
                {t('contact.billFile')}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className={`w-full flex flex-col items-center px-4 py-4 md:py-6 bg-white rounded-lg border-2 ${
                  contactForm.billFile ? 'border-amber-500' : 'border-amber-300 border-dashed'
                } cursor-pointer hover:bg-amber-50`}>
                  <Upload className="w-6 h-6 md:w-8 md:h-8 text-amber-500 mb-2" />
                  <span className="text-sm text-amber-600 text-center">
                    {contactForm.billFile ? contactForm.billFile.name : t('contact.billFileText')}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'bill')}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">
                {t('contact.meterPhoto')}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className={`w-full flex flex-col items-center px-4 py-4 md:py-6 bg-white rounded-lg border-2 ${
                  contactForm.meterFile ? 'border-amber-500' : 'border-amber-300 border-dashed'
                } cursor-pointer hover:bg-amber-50`}>
                  <Upload className="w-6 h-6 md:w-8 md:h-8 text-amber-500 mb-2" />
                  <span className="text-sm text-amber-600 text-center">
                    {contactForm.meterFile ? contactForm.meterFile.name : t('contact.meterPhotoText')}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'meter')}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-700 mb-2">
                {t('contact.additionalDoc')}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className={`w-full flex flex-col items-center px-4 py-4 md:py-6 bg-white rounded-lg border-2 ${
                  contactForm.additionalFile ? 'border-amber-500' : 'border-amber-300 border-dashed'
                } cursor-pointer hover:bg-amber-50`}>
                  <Upload className="w-6 h-6 md:w-8 md:h-8 text-amber-500 mb-2" />
                  <span className="text-sm text-amber-600 text-center">
                    {contactForm.additionalFile ? contactForm.additionalFile.name : t('contact.additionalDocText')}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileChange(e, 'additional')}
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>{t('contact.submitting')}</span>
                </>
              ) : (
                t('contact.submit')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}