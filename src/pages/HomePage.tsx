import React, { useState, useEffect } from 'react';
import { Sun, Building2, Power, Users, Play, Target, Leaf, Wallet, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Zap, ArrowRight, CheckCircle, TrendingUp, FileText, BarChart3, Shield, Battery, HeartHandshake as Handshake, Calculator, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { ContactModal } from '../components/ContactModal';
import { SEOHead } from '../components/SEOHead';
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
        {/* Section d'accueil */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50"></div>
          
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.15)_1px,transparent_0)] bg-[length:24px_24px]"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full text-blue-700 font-medium shadow-lg font-sans">
                <Building2 className="w-5 h-5 mr-2" />
                Solutions énergétiques pour entreprises
              </div>
              
              {/* Main title */}
              <div className="space-y-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight max-w-5xl mx-auto font-sans tracking-tight">
                  {t('home.hero.title')}
                </h1>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto font-sans font-light">
                  {t('home.hero.description')}
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 text-lg font-sans"
                >
                  {t('home.hero.discoverButton')}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section Services */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
              {/* Service 1: Communauté d'énergie */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-10 border border-blue-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-200">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 font-sans">{t('home.services.community.title')}</h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-8 font-sans font-light">
                  {t('home.services.community.description')}
                </p>
                
                {/* Vidéo explicative */}
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-6">
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
                <p className="text-gray-600 text-center text-sm font-sans">
                  {t('home.services.community.videoDescription')}
                </p>
                
                <div className="flex justify-center mt-8">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      onClick={() => window.location.href = '/simulation'}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                    >
                      <Calculator className="w-4 h-4" />
                      {t('about.cta.simulateButton')}
                    </button>
                    <button 
                      onClick={() => window.location.href = '/admin'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                    >
                      <FileText className="w-4 h-4" />
                      {t('about.cta.joinButton')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Service 2: Sous-communauté */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-10 border border-emerald-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-200">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 font-sans">{t('home.services.subCommunity.title')}</h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-8 font-sans font-light">
                  {t('home.services.subCommunity.description')}
                </p>
                
                <div className="space-y-4 mb-8">
                  {t('home.services.subCommunity.features', { returnObjects: true }).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="text-gray-700 font-sans">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowContactModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                  >
                    {t('home.services.subCommunity.button')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Service 3: Plateforme de gestion */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-10 border border-amber-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-200">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 font-sans">{t('home.services.platform.title')}</h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-8 font-sans font-light">
                  {t('home.services.platform.description')}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                    <BarChart3 className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 font-sans">{t('home.services.platform.features')[0]}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-amber-200 text-center">
                    <TrendingUp className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 font-sans">{t('home.services.platform.features')[1]}</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowContactModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                  >
                    {t('home.services.platform.button')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Service 4: Optimisation situation énergétique */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-10 border border-purple-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform duration-200">
                    <Sun className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 font-sans">{t('home.services.optimization.title')}</h3>
                    <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed mb-8 font-sans font-light">
                  {t('home.services.optimization.description')}
                </p>
                
                <div className="space-y-4 mb-8">
                  {t('home.services.optimization.features', { returnObjects: true }).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-700 font-sans">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowContactModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-sans"
                  >
                    {t('home.services.optimization.button')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Schéma illustratif */}
        <section className="py-32 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans tracking-tight">
                Intégration de nos services
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto font-sans font-light">
                Un écosystème complet pour votre transition énergétique
              </p>
            </div>

            {/* Diagramme en croix */}
            <div className="relative max-w-4xl mx-auto">
              <div className="relative aspect-square max-w-xl mx-auto">
                {/* Centre du diagramme */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <img src="/images/logo-v2.png" alt="Sun Is Up" className="w-32 h-32 drop-shadow-2xl" />
                </div>

                {/* Service 1 - Top */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">Communauté</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">d'énergie</p>
                  </div>
                </div>

                {/* Service 2 - Right */}
                <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">Sous-</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">communauté</p>
                  </div>
                </div>

                {/* Service 3 - Bottom */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div className="mb-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">Plateforme</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">monitoring</p>
                  </div>
                </div>

                {/* Service 4 - Left */}
                <div className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-bold text-gray-900 text-xs font-sans">Optimisation</p>
                    <p className="font-bold text-gray-900 text-xs font-sans">énergétique</p>
                  </div>
                </div>

                {/* Flèches pointant vers les 4 services */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                     refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
                    </marker>
                  </defs>
                  
                  {/* Flèches du centre vers les 4 services en croix */}
                  <line x1="150" y1="130" x2="150" y2="70" stroke="#6366F1" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="170" y1="150" x2="230" y2="150" stroke="#6366F1" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="150" y1="170" x2="150" y2="230" stroke="#6366F1" strokeWidth="3" markerEnd="url(#arrowhead)" />
                  <line x1="130" y1="150" x2="70" y2="150" stroke="#6366F1" strokeWidth="3" markerEnd="url(#arrowhead)" />
                </svg>
              </div>
            </div>

            {/* Texte explicatif du schéma */}
            <div className="text-center mt-16">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 max-w-3xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-sans">{t('home.services.integration.approach.title')}</h3>
                <p className="text-gray-700 text-lg leading-relaxed font-sans font-light">
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
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between text-left p-8 hover:bg-gray-50 transition-colors rounded-2xl"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 pr-4 font-sans">{item.question}</h3>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-8 pb-8">
                      <p className="text-gray-600 leading-relaxed text-lg font-sans font-light">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modern CTA Section */}
        <section className="py-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 font-sans tracking-tight">
              {t('home.energyCta.title')}
            </h2>
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-sans font-light">
              {t('home.energyCta.description')}
            </p>
            <button 
              onClick={() => setShowContactModal(true)}
              className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-2xl font-bold transition-all duration-200 shadow-2xl hover:shadow-3xl hover:-translate-y-1 flex items-center gap-3 mx-auto text-lg font-sans"
            >
              {t('home.energyCta.button')}
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </section>

        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />

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