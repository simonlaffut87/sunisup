import React, { useState, useEffect } from 'react';
import { Sun, Building2, Power, Users, Play, Target, Leaf, Wallet, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Zap, ArrowRight, CheckCircle, TrendingUp, FileText, BarChart3, Shield, Battery, HeartHandshake as Handshake, Calculator, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { ContactModal } from '../components/ContactModal';
import { SEOHead } from '../components/SEOHead';
import { ServicesDiscoveryModal } from '../components/ServicesDiscoveryModal';
import SimulationPage from './SimulationPage';
import AdminPage from './AdminPage';

type Participant = Database['public']['Tables']['participants']['Row'];

export default function HomePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showProcedure, setShowProcedure] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingFallbackData(false);

      if (!isSupabaseConfigured || !supabase) {
        console.log('Supabase not configured, showing empty data');
        setParticipants([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .order('name');
        
        if (error) {
          console.warn('Error loading participants:', error);
          setParticipants([]);
          return;
        }

        setParticipants(data || []);
      } catch (networkError) {
        console.warn('Network error loading participants:', networkError);
        setParticipants([]);
      }
      
    } catch (error: any) {
      console.warn('Error loading participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const producers = participants.filter(p => p.type === 'producer');
  const consumers = participants.filter(p => p.type === 'consumer');

  const faqItems = t('home.faq.items', { returnObjects: true }) as Array<{question: string, answer: string}>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-sans">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Nos Services Entreprises | Sun Is Up - Communauté d'Énergie & Optimisation Énergétique Bruxelles"
        description="Services énergétiques pour entreprises Bruxelles : communauté d'énergie, optimisation contrats, études panneaux solaires, contrats groupés. Réduisez vos coûts énergétiques avec Sun Is Up."
        keywords="services énergétiques entreprises bruxelles, communauté d'énergie entreprises, optimisation contrat électricité belgique, étude panneaux solaires entreprise, contrat groupé énergie belgique, réduction coûts énergétiques bruxelles, transition énergétique entreprises belgique"
        url="https://sunisup.be"
        logo="https://sunisup.be/images/logo.png"
      />
      <div className="space-y-0 font-sans">
        {/* Hero Section avec image */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0 -top-16">
            <img 
              src="/images/video-background.png" 
              alt="Sun Is Up - Communauté d'énergie Bruxelles"
              className="w-full h-[calc(100%+4rem)] object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
            <div className="text-center space-y-8">
              {/* Hero content */}
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight max-w-5xl mx-auto font-sans tracking-tight drop-shadow-2xl">
                  Sun Is Up
                </h1>
                <p className="text-xl sm:text-2xl lg:text-3xl text-white/90 leading-relaxed max-w-4xl mx-auto font-sans font-light drop-shadow-lg">
                  {t('home.hero.subtitle')}
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <button
                  onClick={() => setShowServicesModal(true)}
                  className="bg-brand-teal hover:bg-brand-teal-light text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 text-lg font-sans"
                >
                  {t('home.hero.discoverButton')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section Services */}
        <section id="services-section" className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Titre et description des services */}
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 mb-6 font-sans">
                {t('home.hero.title')}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto font-sans">
                {t('home.hero.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
              {/* Service 1: Communauté d'énergie */}
              <div className="bg-white rounded-lg p-8 border border-teal-100 hover:border-teal-200 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start mb-6">
                  <div className="w-12 h-12 bg-brand-teal/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Users className="w-6 h-6 text-brand-teal" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-sans">{t('home.services.community.title')}</h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
                  {t('home.services.community.description')}
                </p>

                {/* Vidéo explicative */}
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 border border-teal-100">
                  <video
                    controls
                    poster="/images/video-background.png"
                    className="w-full h-full object-cover"
                    preload="metadata"
                  >
                    <source src="/videos/Partage.mp4" type="video/mp4" />
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                </div>
                <p className="text-gray-500 text-center text-xs font-sans mb-6">
                  {t('home.services.community.videoDescription')}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => window.location.href = '/simulation'}
                    className="bg-brand-teal hover:bg-brand-teal-light text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 font-sans"
                  >
                    <Calculator className="w-4 h-4" />
                    {t('about.cta.simulateButton')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/admin'}
                    className="bg-white hover:bg-brand-gold/10 text-brand-gold border border-brand-gold/30 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 font-sans"
                  >
                    <FileText className="w-4 h-4" />
                    {t('about.cta.joinButton')}
                  </button>
                </div>
              </div>

              {/* Service 2: Sous-communauté */}
              <div className="bg-white rounded-lg p-8 border border-teal-100 hover:border-teal-200 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start mb-6">
                  <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Building2 className="w-6 h-6 text-brand-teal" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-sans">{t('home.services.subCommunity.title')}</h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
                  {t('home.services.subCommunity.description')}
                </p>

                <div className="space-y-3 mb-6">
                  {t('home.services.subCommunity.features', { returnObjects: true }).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-brand-teal mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm font-sans">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-brand-teal hover:bg-brand-teal-light text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 font-sans"
                >
                  {t('home.services.subCommunity.button')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Service 3: Plateforme de gestion */}
              <div className="bg-white rounded-lg p-8 border border-amber-100 hover:border-brand-gold/30 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start mb-6">
                  <div className="w-12 h-12 bg-brand-gold/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-sans">{t('home.services.platform.title')}</h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
                  {t('home.services.platform.description')}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-brand-gold/10 p-4 rounded-lg border border-amber-100">
                    <BarChart3 className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-700 text-center font-sans">{t('home.services.platform.features', { returnObjects: true })[0]}</p>
                  </div>
                  <div className="bg-brand-gold/10 p-4 rounded-lg border border-amber-100">
                    <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-700 text-center font-sans">{t('home.services.platform.features', { returnObjects: true })[1]}</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-brand-gold hover:bg-brand-gold-light text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 font-sans"
                >
                  {t('home.services.platform.button')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Service 4: Optimisation situation énergétique */}
              <div className="bg-white rounded-lg p-8 border border-orange-100 hover:border-orange-200 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start mb-6">
                  <div className="w-12 h-12 bg-brand-flame/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Sun className="w-6 h-6 text-brand-flame" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1 font-sans">{t('home.services.optimization.title')}</h3>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 font-sans">
                  {t('home.services.optimization.description')}
                </p>

                <div className="space-y-3 mb-6">
                  {t('home.services.optimization.features', { returnObjects: true }).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm font-sans">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 font-sans"
                >
                  {t('home.services.optimization.button')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Schéma illustratif */}
        <section className="py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans tracking-tight">
                {t('home.services.integration.title')}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto font-sans font-light">
                {t('home.services.integration.subtitle')}
              </p>
            </div>

            {/* Diagramme en croix */}
            <div className="relative max-w-4xl mx-auto px-4">
              <div className="relative aspect-square max-w-xl mx-auto scale-75 sm:scale-75 lg:scale-100">
                {/* Centre du diagramme */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-32 h-32 drop-shadow-2xl" />
                </div>

                {/* Service 1 - Top */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-brand-teal rounded-2xl flex items-center justify-center shadow-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.community')}</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.communitySecond')}</p>
                  </div>
                </div>

                {/* Service 2 - Right */}
                <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-brand-teal rounded-2xl flex items-center justify-center shadow-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.subCommunity')}</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.subCommunitySecond')}</p>
                  </div>
                </div>

                {/* Service 3 - Bottom */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                  <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center shadow-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="mb-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.platform')}</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.platformSecond')}</p>
                  </div>
                </div>

                {/* Service 4 - Left */}
                <div className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-brand-flame rounded-2xl flex items-center justify-center shadow-xl">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.optimization')}</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">{t('home.services.schemaLabels.optimizationSecond')}</p>
                  </div>
                </div>

                {/* Flèches pointant vers les 4 services */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                     refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                  </defs>
                  
                  {/* Flèches du centre vers les 4 services en croix */}
                  <line x1="150" y1="130" x2="150" y2="70" stroke="#64748b" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="170" y1="150" x2="230" y2="150" stroke="#64748b" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="150" y1="170" x2="150" y2="230" stroke="#64748b" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="130" y1="150" x2="70" y2="150" stroke="#64748b" strokeWidth="3" markerEnd="url(#arrowhead)" />
                </svg>
              </div>
            </div>

            {/* Texte explicatif du schéma */}
            <div className="text-center mt-16">
              <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200 max-w-3xl mx-auto">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 font-sans">{t('home.services.integration.approach.title')}</h3>
                <p className="text-gray-600 text-base leading-relaxed font-sans">
                  {t('home.services.integration.approach.description')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Modern FAQ Section */}
        <section className="py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans tracking-tight">
                {t('home.faq.title')}
              </h2>
            </div>
            
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between text-left p-6 hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <h3 className="text-base font-semibold text-gray-800 pr-4 font-sans">{item.question}</h3>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-5 h-5 text-brand-teal flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-600 leading-relaxed text-sm font-sans">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modern CTA Section */}
        <section className="py-24 bg-gradient-to-br from-blue-50 to-teal-50 relative overflow-hidden">
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-semibold text-gray-800 mb-4 font-sans">
              {t('home.energyCta.title')}
            </h2>
            <p className="text-base lg:text-lg text-gray-600 mb-8 max-w-3xl mx-auto font-sans">
              {t('home.energyCta.description')}
            </p>
            <button
              onClick={() => setShowContactModal(true)}
              className="bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 mx-auto text-base font-sans"
            >
              {t('home.energyCta.button')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />

        <ServicesDiscoveryModal 
          isOpen={showServicesModal} 
          onClose={() => setShowServicesModal(false)} 
        />

        {/* Simulation Overlay */}
        {showSimulation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900 font-sans">Simulation</h2>
                <button
                  onClick={() => setShowSimulation(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-0">
                <SimulationPage />
              </div>
            </div>
          </div>
        )}

        {/* Procedure Overlay */}
        {showProcedure && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-xl font-bold text-gray-900 font-sans">Procédure d'adhésion</h2>
                <button
                  onClick={() => setShowProcedure(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-0">
                <AdminPage />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}