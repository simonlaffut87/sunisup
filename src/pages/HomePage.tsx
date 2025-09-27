import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { 
  Sun, 
  Building2, 
  Power, 
  Users, 
  Play, 
  Target, 
  Leaf, 
  Wallet, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Zap,
  ArrowRight,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { ContactModal } from '../components/ContactModal';
import { SEOHead } from '../components/SEOHead';

type Participant = Database['public']['Tables']['participants']['Row'];


export default function HomePage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingFallbackData(false);

      if (!isSupabaseConfigured) {
        console.log('Supabase not configured, showing empty data');
        setParticipants([]);
        return;
      }

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
      
    } catch (error: any) {
      console.warn('Error loading participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const createCustomIcon = (element: JSX.Element) => {
    const iconHtml = renderToStaticMarkup(
      <div className="relative">
        <div className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-amber-200">
          {element}
        </div>
      </div>
    );
    return divIcon({
      html: iconHtml,
      className: 'custom-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const sunIcon = createCustomIcon(
    <Sun className="w-5 h-5 text-amber-500" />
  );

  const buildingIcon = createCustomIcon(
    <Building2 className="w-5 h-5 text-blue-500" />
  );

  const producers = participants.filter(p => p.type === 'producer');
  const consumers = participants.filter(p => p.type === 'consumer');

  const translatedFaqItems = t('home.faq.items', { returnObjects: true });
  const faqItems = Array.isArray(translatedFaqItems) ? translatedFaqItems : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title="Communauté d'Énergie Bruxelles | Sun Is Up - Partage d'Énergie Solaire & Réduction Facture Électricité"
        description="Communauté d'énergie Bruxelles Sun Is Up : partage d'énergie solaire locale pour réduire votre facture électricité jusqu'à 30%. Rejoignez la première communauté d'énergie renouvelable de Belgique à Bruxelles."
        keywords="communauté d'énergie bruxelles, communauté d'énergie belgique, partage d'énergie bruxelles, réduction facture électricité, energy community brussels, energy sharing brussels, electricity bill reduction, energiegemeenschap brussel, energie delen brussel, elektriciteitsrekening vermindering, Sun Is Up, énergie renouvelable bruxelles, autoconsommation collective belgique, transition énergétique bruxelles, économies énergie belgique, panneaux solaires bruxelles, énergie locale belgique, renewable energy community belgium, local energy sharing belgium, groene energie gemeenschap belgie, lokale energie delen belgie"
        url="https://sunisup.be"
        logo="https://sunisup.be/images/logo.png"
      />
      <div className="space-y-0 font-sans">
      {/* Modern Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50"></div>
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,158,11,0.15)_1px,transparent_0)] bg-[length:24px_24px]"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-full text-amber-700 font-medium shadow-lg font-sans">
              <Zap className="w-5 h-5 mr-2" />
              {t('home.hero.badge')}
            </div>
            
            {/* Main title */}
            <div className="space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight max-w-5xl mx-auto font-sans">
                {t('home.hero.title')}
              </h1>
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto font-sans">
                {t('home.hero.intro')}
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button 
                onClick={() => setShowContactModal(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8 py-4 rounded-full font-semibold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-3 text-lg font-sans"
              >
                {t('howToJoin.cta.button')}
                <ArrowRight className="w-5 h-5" />
              </button>
              <a 
                href="/simulation"
                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-8 py-4 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-sans"
              >
                {t('simulation.title')}
                <TrendingUp className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Floating image */}
        <div className="absolute bottom-10 right-10 hidden lg:block">
          <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm">
            <img
              src="/images/pv.png"
              alt="Panneaux solaires"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 font-sans">{t('home.hero.features.local.title')}</h3>
              <p className="text-gray-600 text-sm font-sans">{t('home.hero.features.local.description')}</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 font-sans">{t('home.hero.features.price.title')}</h3>
              <p className="text-gray-600 text-sm font-sans">{t('home.hero.features.price.description')}</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 font-sans">{t('home.hero.features.transition.title')}</h3>
              <p className="text-gray-600 text-sm font-sans">{t('home.hero.features.transition.description')}</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 font-sans">{t('home.hero.features.green.title')}</h3>
              <p className="text-gray-600 text-sm font-sans">{t('home.hero.features.green.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 font-sans">Notre impact en chiffres</h2>
            <p className="text-xl text-gray-600 font-sans">Des résultats concrets pour notre communauté</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center group hover:shadow-xl transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <Power className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-2 font-sans">724</h3>
              <p className="text-lg font-medium text-gray-700 mb-2 font-sans">MWh/an</p>
              <p className="text-gray-600 font-sans">{t('home.stats.production.subtitle')}</p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center group hover:shadow-xl transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-2 font-sans">11</h3>
              <p className="text-lg font-medium text-gray-700 mb-2 font-sans">Participants</p>
              <p className="text-gray-600 font-sans">{t('home.stats.participants.subtitle')}</p>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center group hover:shadow-xl transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-2 font-sans">10%</h3>
              <p className="text-lg font-medium text-gray-700 mb-2 font-sans">Économies</p>
              <p className="text-gray-600 font-sans">{t('home.stats.savings.subtitle')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans">
              {t('home.howItWorks.title')}
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto font-sans">
              {t('home.howItWorks.description')}
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
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
            <p className="text-gray-600 mt-6 text-center text-lg font-sans">
              {t('home.howItWorks.videoDescription')}
            </p>
          </div>
        </div>
      </section>


      {/* Modern FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-sans">
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
                    <ChevronUp className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-8 pb-8">
                    <p className="text-gray-600 leading-relaxed text-lg font-sans">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 font-sans">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-sans">
            {t('home.cta.description')}
          </p>
          <button 
            onClick={() => setShowContactModal(true)}
            className="bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-full font-bold transition-all duration-200 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-3 mx-auto text-lg font-sans"
          >
            {t('howToJoin.cta.button')}
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
    </>
  );
}