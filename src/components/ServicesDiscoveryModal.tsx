import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle, Users, Building2, BarChart3, Sun, Mail, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface ServicesDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  selectedServices: string[];
  email: string;
  name: string;
}

export function ServicesDiscoveryModal({ isOpen, onClose }: ServicesDiscoveryModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<FormData>({
    selectedServices: [],
    email: '',
    name: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const services = [
    {
      id: 'community',
      title: t('servicesDiscovery.services.community.title'),
      description: t('servicesDiscovery.services.community.description'),
      icon: Users,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'subcommunity',
      title: t('servicesDiscovery.services.subcommunity.title'),
      description: t('servicesDiscovery.services.subcommunity.description'),
      icon: Building2,
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'platform',
      title: t('servicesDiscovery.services.platform.title'),
      description: t('servicesDiscovery.services.platform.description'),
      icon: BarChart3,
      color: 'from-amber-500 to-orange-600'
    },
    {
      id: 'optimization',
      title: t('servicesDiscovery.services.optimization.title'),
      description: t('servicesDiscovery.services.optimization.description'),
      icon: Sun,
      color: 'from-purple-500 to-violet-600'
    }
  ];

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      toast.error('Veuillez renseigner votre email');
      return;
    }

    setSubmitting(true);

    try {
      const selectedServiceNames = formData.selectedServices.map(id => 
        services.find(s => s.id === id)?.title
      ).filter(Boolean);

      const emailData = {
        email: formData.email,
        message: `Demande de contact via le formulaire "Découvrir nos services"

Nom/Société: ${formData.name || 'Non renseigné'}
Email: ${formData.email}

Services sélectionnés:
${selectedServiceNames.length > 0 ? selectedServiceNames.map(name => `• ${name}`).join('\n') : '• Aucun service spécifique sélectionné'}

Cette personne souhaite réserver un créneau pour un échange personnalisé avec votre équipe.`,
        selectedServices: selectedServiceNames,
        website: '' // Honeypot
      };

      const functionUrl = `${supabase.supabaseUrl}/functions/v1/send-contact`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi');
      }

      // Fermer le modal après succès
      toast.success(t('servicesDiscovery.success'));
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      selectedServices: [],
      email: '',
      name: ''
    });
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-sans">
                {t('servicesDiscovery.title')}
              </h2>
              <p className="text-gray-600 mt-2 font-sans">
                {t('servicesDiscovery.intro')}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-brand-gold/100 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-32 h-1 ${step >= 2 ? 'bg-brand-gold/100' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-brand-gold/100 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Step 1: Services */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-sans">
                  {t('servicesDiscovery.step1.title')}
                </h3>
                <p className="text-gray-600 font-sans">
                  {t('servicesDiscovery.step1.description')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => {
                  const Icon = service.icon;
                  const isSelected = formData.selectedServices.includes(service.id);
                  
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceToggle(service.id)}
                      className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-amber-500 bg-brand-gold/10 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-amber-300 hover:shadow-md hover:scale-102'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${service.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-gray-900 font-sans">
                              {service.title}
                            </h4>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-amber-500" />
                            )}
                          </div>
                          <p className="text-gray-600 text-sm font-sans">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="bg-brand-gold/100 hover:bg-brand-gold text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                >
                  {t('servicesDiscovery.step1.continue')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-sans">
                  {t('servicesDiscovery.step2.title')}
                </h3>
                <p className="text-gray-600 font-sans">
                  {t('servicesDiscovery.step2.description')}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                    {t('servicesDiscovery.step2.email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                      placeholder="votre@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sans">
                    {t('servicesDiscovery.step2.name')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                      placeholder="Votre nom ou nom de votre société"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-600 hover:text-gray-800 px-4 py-2 font-sans"
                >
                  {t('servicesDiscovery.step2.back')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.email || submitting}
                  className="bg-brand-gold/100 hover:bg-brand-gold text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                      {t('servicesDiscovery.step2.sending')}
                    </>
                  ) : (
                    <>
                      {t('servicesDiscovery.step2.submit')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}