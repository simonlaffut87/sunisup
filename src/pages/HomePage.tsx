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
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { ContactModal } from '../components/ContactModal';

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

      // Check if Supabase is available
      if (!isSupabaseAvailable()) {
        console.log('ℹ️ Supabase not available - using empty data');
        setParticipants([]);
        setError('Mode hors ligne - données de démonstration non disponibles');
        setUsingFallbackData(true);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('name')
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        if (error.code === 'OFFLINE') {
          console.log('ℹ️ Running in offline mode');
          setParticipants([]);
          setError('Mode hors ligne - connectez-vous à Supabase pour voir les données');
          setUsingFallbackData(true);
          return;
        }
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          console.log('ℹ️ Database access restricted by RLS policies - using demo data');
          setParticipants([]);
          setError('Accès à la base de données restreint par les politiques de sécurité');
          return;
        }
        throw error;
      }

      setParticipants(data || []);
      
      console.log('✅ Successfully loaded participants');
    } catch (error: any) {
      console.error('❌ Erreur chargement participants:', error);
      setParticipants([]);
      if (error.message?.includes('No Supabase connection available')) {
        setError('Mode hors ligne - connectez-vous à Supabase pour voir les données');
        setUsingFallbackData(true);
      } else {
        setError('Erreur de connexion à la base de données');
      }
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
          <p className="text-gray-600">Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 overflow-hidden">
        <div className={`absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f59e0b" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50`}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                  <Zap className="w-4 h-4 mr-2" />
                  {t('home.hero.badge')}
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  {t('home.hero.title')}
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  {t('home.hero.intro')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('home.hero.features.local.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('home.hero.features.local.description')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('home.hero.features.price.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('home.hero.features.price.description')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('home.hero.features.transition.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('home.hero.features.transition.description')}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('home.hero.features.green.title')}</h3>
                    <p className="text-gray-600 text-sm">{t('home.hero.features.green.description')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  {t('howToJoin.cta.button')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <a 
                  href="/simulation"
                  className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {t('simulation.title')}
                  <TrendingUp className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/pv.png"
                  alt="Panneaux solaires"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">724 MWh/an</p>
                    <p className="text-gray-600 text-sm">{t('home.stats.production.title')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Power className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">724 MWh/an</h3>
              <p className="text-gray-600">{t('home.stats.production.subtitle')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">11</h3>
              <p className="text-gray-600">{t('home.stats.participants.subtitle')}</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">10%</h3>
              <p className="text-gray-600">{t('home.stats.savings.subtitle')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('home.howItWorks.description')}
            </p>
          </div>

          <div className="relative">
            <a 
              href="https://www.youtube.com/watch?v=xdxpf2jL-1I"
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video rounded-2xl overflow-hidden relative group shadow-2xl"
              style={{
                backgroundImage: 'url(/images/video-background.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-30 transition-all duration-300"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-10 h-10 text-amber-500 ml-1" />
                </div>
                <div className="flex items-center gap-2 text-white">
                  <span className="font-medium text-lg">{t('home.howItWorks.watchVideo')}</span>
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            </a>
            <p className="text-gray-600 mt-4 text-center">
              {t('home.howItWorks.videoDescription')}
            </p>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {t('home.faq.title')}
            </h2>
          </div>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between text-left p-6 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">{item.question}</h3>
                  {expandedFAQ === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-amber-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            {t('home.cta.description')}
          </p>
          <button 
            onClick={() => setShowContactModal(true)}
            className="bg-white hover:bg-gray-100 text-amber-600 px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            {t('howToJoin.cta.button')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  );
}