import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Sun, 
  Building2, 
  ArrowRight, 
  Circle as InfoCircle,
  Store,
  Factory,
  Coffee,
  Building,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { ContactModal } from '../components/ContactModal';

type Participant = Database['public']['Tables']['participants']['Row'];

export default function SimulationPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulationType, setSimulationType] = useState<'consumer' | 'producer'>('consumer');
  const [annualConsumption, setAnnualConsumption] = useState('');
  const [peakPower, setPeakPower] = useState('');
  const [panelCount, setPanelCount] = useState('');
  const [usePanelCount, setUsePanelCount] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [simulationResults, setSimulationResults] = useState<string>('');
  const { t } = useTranslation();

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*');
      
      if (error) {
        if (error.code === '42501') {
          console.log('Using demo data for simulation (database access restricted)');
          setParticipants([]);
          return;
        }
      }
      setParticipants(data || []);
    } catch (error) {
      console.error('Erreur chargement participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimulation = () => {
    if (simulationType === 'consumer') {
      const consumption = parseFloat(annualConsumption);
      if (!consumption) return null;

      // Prix moyen du marché: 0.35 €/kWh
      const marketPrice = 0.35;
      // Prix Sun Is Up: 0.25 €/kWh
      const sunIsUpPrice = 0.25;
      // Pourcentage de la consommation couverte par Sun Is Up
      const coverageRatio = 0.33;

      // Coût avec fournisseur traditionnel
      const traditionalCost = consumption * marketPrice;
      
      // Coût avec Sun Is Up
      const sunIsUpCost = consumption * (
        (coverageRatio * sunIsUpPrice) + // Part couverte par Sun Is Up
        ((1 - coverageRatio) * marketPrice) // Part restante au prix du marché
      );

      // Économies annuelles
      const savings = traditionalCost - sunIsUpCost;
      
      return {
        consumption,
        savings: savings.toFixed(2),
        coverageRatio: (coverageRatio * 100).toFixed(0),
        traditionalCost: traditionalCost.toFixed(2),
        sunIsUpCost: sunIsUpCost.toFixed(2)
      };
    } else {
      let estimatedProduction;
      
      if (usePanelCount) {
        const panels = parseFloat(panelCount);
        if (!panels) return null;
        // Production par panneau = 950 kWh/kWp * 0.4 kWp = 380 kWh/panneau
        estimatedProduction = panels * 950 * 0.4;
      } else {
        const power = parseFloat(peakPower);
        if (!power) return null;
        // Production = puissance * 950 kWh/kWp
        estimatedProduction = power * 950;
      }

      // Gains = 40 * production (en MWh) * 0.5
      const revenue = 40 * (estimatedProduction / 1000) * 0.5;

      return {
        estimatedProduction: estimatedProduction.toFixed(0),
        revenue: revenue.toFixed(2)
      };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const results = calculateSimulation();
    if (results) {
      let message = '';
      if ('savings' in results) {
        message = `${t('simulation.consumer.title')} - ${t('simulation.consumer.consumption')}: ${results.consumption} kWh, ${t('simulation.consumer.savings')}: ${results.savings}€`;
      } else {
        message = `${t('simulation.producer.title')} - ${t('simulation.producer.revenue')}: ${results.revenue}€`;
      }
      setSimulationResults(message);
    }
    setShowResults(true);
  };

  const handleContactClick = () => {
    setShowContactModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-6">
            <Calculator className="w-4 h-4 mr-2" />
            {t('simulation.badge')}
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {t('simulation.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('simulation.subtitle')}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Examples Section for Consumers */}
        {simulationType === 'consumer' && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {t('simulation.examplesTitle')}
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('simulation.examples.bar.title')}</h4>
                <p className="text-gray-600 text-sm">{t('simulation.examples.bar.consumption')}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('simulation.examples.bakery.title')}</h4>
                <p className="text-gray-600 text-sm">{t('simulation.examples.bakery.consumption')}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('simulation.examples.office.title')}</h4>
                <p className="text-gray-600 text-sm">{t('simulation.examples.office.consumption')}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Factory className="w-8 h-8 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{t('simulation.examples.workshop.title')}</h4>
                <p className="text-gray-600 text-sm">{t('simulation.examples.workshop.consumption')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Type Selection */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {t('simulation.profileChoice')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => {
                setSimulationType('consumer');
                setShowResults(false);
              }}
              className={`p-8 rounded-xl border-2 transition-all ${
                simulationType === 'consumer'
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                  : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  simulationType === 'consumer' ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-8 h-8 ${
                    simulationType === 'consumer' ? 'text-emerald-600' : 'text-gray-600'
                  }`} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('simulation.consumer.title')}</h3>
              <p className="text-gray-600">
                {t('simulation.consumer.description')}
              </p>
            </button>

            <button
              onClick={() => {
                setSimulationType('producer');
                setShowResults(false);
              }}
              className={`p-8 rounded-xl border-2 transition-all ${
                simulationType === 'producer'
                  ? 'border-amber-500 bg-amber-50 shadow-lg'
                  : 'border-gray-200 hover:border-amber-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  simulationType === 'producer' ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  <Sun className={`w-8 h-8 ${
                    simulationType === 'producer' ? 'text-amber-600' : 'text-gray-600'
                  }`} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('simulation.producer.title')}</h3>
              <p className="text-gray-600">
                {t('simulation.producer.description')}
              </p>
            </button>
          </div>

          {/* Simulation Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {simulationType === 'consumer' ? (
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  {t('simulation.consumer.consumption')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={annualConsumption}
                    onChange={(e) => setAnnualConsumption(e.target.value)}
                    className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                    placeholder="Ex: 25000"
                    min="0"
                    step="1"
                    readOnly={false}
                    disabled={false}
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                    kWh/an
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="usePanelCount"
                    checked={usePanelCount}
                    onChange={(e) => setUsePanelCount(e.target.checked)}
                    className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="usePanelCount" className="text-gray-700 font-medium">
                    {t('simulation.producer.powerUnknown')}
                  </label>
                </div>

                {usePanelCount ? (
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-3">
                      {t('simulation.producer.panelCount')}
                    </label>
                    <input
                      type="number"
                      value={panelCount}
                      onChange={(e) => setPanelCount(e.target.value)}
                      className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                      placeholder="Ex: 20"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-3">
                      {t('simulation.producer.power')}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={peakPower}
                        onChange={(e) => setPeakPower(e.target.value)}
                        className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                        placeholder="Ex: 8.5"
                        required
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                        kWp
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3 ${
                simulationType === 'consumer'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <Calculator className="w-6 h-6" />
              {t('simulation.calculate')}
            </button>
          </form>

          {/* Results */}
          {showResults && (
            <div className={`mt-8 p-8 rounded-xl ${
              simulationType === 'consumer' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  simulationType === 'consumer' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  <TrendingUp className={`w-6 h-6 ${
                    simulationType === 'consumer' ? 'text-emerald-600' : 'text-amber-600'
                  }`} />
                </div>
                <h3 className={`text-2xl font-bold ${
                  simulationType === 'consumer' ? 'text-emerald-900' : 'text-amber-900'
                }`}>
                  {t('simulation.results')}
                </h3>
              </div>
              
              {simulationType === 'consumer' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-lg border border-emerald-200">
                    <p className="text-emerald-700 font-medium mb-2">{t('simulation.consumer.currentCost')}</p>
                    <p className="text-2xl font-bold text-emerald-900">{calculateSimulation()?.traditionalCost} €</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-emerald-200">
                    <p className="text-emerald-700 font-medium mb-2">{t('simulation.consumer.newCost')}</p>
                    <p className="text-2xl font-bold text-emerald-900">{calculateSimulation()?.sunIsUpCost} €</p>
                  </div>

                  <div className="bg-emerald-100 p-6 rounded-lg border border-emerald-300">
                    <p className="text-emerald-700 font-medium mb-2">{t('simulation.consumer.savings')}</p>
                    <p className="text-3xl font-bold text-emerald-600">{calculateSimulation()?.savings} €</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-lg border border-amber-200">
                    <p className="text-amber-700 font-medium mb-2">{t('simulation.producer.production')}</p>
                    <p className="text-2xl font-bold text-amber-900">{calculateSimulation()?.estimatedProduction} kWh</p>
                  </div>

                  <div className="bg-amber-100 p-6 rounded-lg border border-amber-300">
                    <p className="text-amber-700 font-medium mb-2">{t('simulation.producer.revenue')}</p>
                    <p className="text-3xl font-bold text-amber-600">{calculateSimulation()?.revenue} €</p>
                  </div>
                </div>
              )}

              <div className={`p-4 rounded-lg border ${
                simulationType === 'consumer' ? 'bg-emerald-100 border-emerald-200' : 'bg-amber-100 border-amber-200'
              } mb-6`}>
                <div className="flex items-start gap-3">
                  <InfoCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    simulationType === 'consumer' ? 'text-emerald-600' : 'text-amber-600'
                  }`} />
                  <p className={`text-sm ${
                    simulationType === 'consumer' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {simulationType === 'consumer' 
                      ? t('simulation.consumer.disclaimer')
                      : t('simulation.producer.disclaimer')
                    }
                  </p>
                </div>
              </div>

              <button 
                onClick={handleContactClick}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3 ${
                  simulationType === 'consumer'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {t('simulation.contact')}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)}
        initialMessage={simulationResults}
      />
    </div>
  );
}