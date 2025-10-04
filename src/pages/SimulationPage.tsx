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
import { trackSimulation } from '../utils/analytics';
import { SEOHead } from '../components/SEOHead';

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
        trackSimulation('consumer', parseFloat(results.savings));
        message = `${t('simulation.consumer.title')} - ${t('simulation.consumer.consumption')}: ${results.consumption} kWh, ${t('simulation.consumer.savings')}: ${results.savings}€`;
      } else {
        trackSimulation('producer', parseFloat(results.revenue));
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
    <>
      <SEOHead 
        title="Simulation Réduction Facture Électricité | Communauté d'Énergie Bruxelles Sun Is Up"
        description="Simulez gratuitement votre réduction de facture électricité avec notre communauté d'énergie Bruxelles. Calculez vos économies grâce au partage d'énergie solaire locale en Belgique."
        keywords="réduction facture électricité, simulation économies énergie bruxelles, calculateur facture électricité belgique, communauté d'énergie bruxelles simulation, partage d'énergie bruxelles calcul, electricity bill reduction calculator, energy community brussels simulation, elektriciteitsrekening vermindering calculator, energiegemeenschap brussel simulatie, estimation revenus solaire belgique, économies communauté énergie belgique"
        url="https://sunisup.be/simulation"
        logo="https://sunisup.be/images/logo.png"
      />
      <div className="min-h-screen bg-white font-sans">
        {/* Modern Hero Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-white to-neutral-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm border border-brand-gold/30 rounded-full text-brand-gold font-medium shadow-lg mb-8 font-sans">
              <Calculator className="w-4 h-4 mr-2" />
              {t('simulation.heroBadge')}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-8 font-sans">
              {t('simulation.heroTitle')}
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-neutral-600 max-w-4xl mx-auto font-sans">
              {t('simulation.heroDescription')}
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Examples Section for Consumers */}
          {simulationType === 'consumer' && (
            <div className="mb-16">
              <h3 className="text-3xl font-bold text-neutral-900 mb-12 text-center font-sans">
                {t('simulation.examplesTitle')}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-neutral-300 shadow-lg hover:shadow-xl transition-all duration-200 text-center group">
                  <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Coffee className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-bold text-neutral-900 mb-3 text-lg font-sans">{t('simulation.examples.bar.title')}</h4>
                  <p className="text-neutral-600 font-sans">{t('simulation.examples.bar.consumption')}</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-neutral-300 shadow-lg hover:shadow-xl transition-all duration-200 text-center group">
                  <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Store className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-bold text-neutral-900 mb-3 text-lg font-sans">{t('simulation.examples.bakery.title')}</h4>
                  <p className="text-neutral-600 font-sans">{t('simulation.examples.bakery.consumption')}</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-neutral-300 shadow-lg hover:shadow-xl transition-all duration-200 text-center group">
                  <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Building className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-bold text-neutral-900 mb-3 text-lg font-sans">{t('simulation.examples.office.title')}</h4>
                  <p className="text-neutral-600 font-sans">{t('simulation.examples.office.consumption')}</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-neutral-300 shadow-lg hover:shadow-xl transition-all duration-200 text-center group">
                  <div className="w-20 h-20 bg-brand-gold rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                    <Factory className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-bold text-neutral-900 mb-3 text-lg font-sans">{t('simulation.examples.workshop.title')}</h4>
                  <p className="text-neutral-600 font-sans">{t('simulation.examples.workshop.consumption')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Type Selection */}
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-300 p-12 mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-12 text-center font-sans">
              {t('simulation.profileChoice')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <button
                onClick={() => {
                  setSimulationType('consumer');
                  setShowResults(false);
                }}
                className={`p-10 rounded-2xl border-2 transition-all duration-200 ${
                  simulationType === 'consumer'
                    ? 'border-emerald-500 bg-emerald-50 shadow-xl scale-105'
                    : 'border-neutral-300 hover:border-brand-teal/30 hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-center mb-8">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                    simulationType === 'consumer' 
                      ? 'bg-brand-teal' 
                      : 'bg-neutral-50'
                  }`}>
                    <Building2 className={`w-10 h-10 ${
                      simulationType === 'consumer' ? 'text-white' : 'text-neutral-600'
                    }`} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-4 font-sans">{t('simulation.consumer.title')}</h3>
                <p className="text-neutral-600 text-lg font-sans">
                  {t('simulation.consumer.description')}
                </p>
              </button>

              <button
                onClick={() => {
                  setSimulationType('producer');
                  setShowResults(false);
                }}
                className={`p-10 rounded-2xl border-2 transition-all duration-200 ${
                  simulationType === 'producer'
                    ? 'border-amber-500 bg-brand-gold/10 shadow-xl scale-105'
                    : 'border-neutral-300 hover:border-brand-gold/30 hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-center mb-8">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                    simulationType === 'producer' 
                      ? 'bg-brand-gold' 
                      : 'bg-neutral-50'
                  }`}>
                    <Sun className={`w-10 h-10 ${
                      simulationType === 'producer' ? 'text-white' : 'text-neutral-600'
                    }`} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-4 font-sans">{t('simulation.producer.title')}</h3>
                <p className="text-neutral-600 text-lg font-sans">
                  {t('simulation.producer.description')}
                </p>
              </button>
            </div>

            {/* Simulation Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {simulationType === 'consumer' ? (
                <div>
                  <label className="block text-xl font-bold text-neutral-900 mb-4 font-sans">
                    {t('simulation.consumer.consumption')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={annualConsumption}
                      onChange={(e) => setAnnualConsumption(e.target.value)}
                      className="w-full px-6 py-5 text-xl border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-lg"
                      placeholder="Ex: 25000"
                      min="0"
                      step="1"
                      readOnly={false}
                      disabled={false}
                      required
                    />
                    <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-neutral-500 font-medium font-sans">
                      kWh/an
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="usePanelCount"
                      checked={usePanelCount}
                      onChange={(e) => setUsePanelCount(e.target.checked)}
                      className="w-6 h-6 rounded text-amber-500 focus:ring-amber-500 font-sans"
                    />
                    <label htmlFor="usePanelCount" className="text-neutral-700 font-medium text-lg font-sans">
                      {t('simulation.producer.powerUnknown')}
                    </label>
                  </div>

                  {usePanelCount ? (
                    <div>
                      <label className="block text-xl font-bold text-neutral-900 mb-4 font-sans">
                        {t('simulation.producer.panelCount')}
                      </label>
                      <input
                        type="number"
                        value={panelCount}
                        onChange={(e) => setPanelCount(e.target.value)}
                        className="w-full px-6 py-5 text-xl border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white shadow-lg"
                        placeholder="Ex: 20"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xl font-bold text-neutral-900 mb-4 font-sans">
                        {t('simulation.producer.power')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={peakPower}
                          onChange={(e) => setPeakPower(e.target.value)}
                          className="w-full px-6 py-5 text-xl border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white shadow-lg"
                          placeholder="Ex: 8.5"
                          required
                        />
                        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-neutral-500 font-medium font-sans">
                          kWp
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-5 rounded-2xl font-bold text-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-4 ${
                  simulationType === 'consumer'
                    ? 'bg-brand-teal hover:bg-brand-teal-light text-white'
                    : 'bg-gradient-to-r from-brand-gold to-brand-flame hover:bg-brand-gold-light text-white'
                } font-sans`}
              >
                <Calculator className="w-7 h-7" />
                {t('simulation.calculate')}
              </button>
            </form>

            {/* Results */}
            {showResults && (
              <div className={`mt-12 p-10 rounded-3xl shadow-2xl ${
                simulationType === 'consumer' ? 'bg-emerald-50 border border-emerald-100' : 'bg-brand-gold/10 border border-amber-100'
              }`}>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    simulationType === 'consumer' 
                      ? 'bg-brand-teal' 
                      : 'bg-brand-gold'
                  }`}>
                    <TrendingUp className={`w-8 h-8 ${
                      simulationType === 'consumer' ? 'text-white' : 'text-white'
                    }`} />
                  </div>
                  <h3 className={`text-3xl font-bold ${
                    simulationType === 'consumer' ? 'text-emerald-900' : 'text-amber-900'
                  } font-sans`}>
                    {t('simulation.results')}
                  </h3>
                </div>
                
                {simulationType === 'consumer' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-lg">
                      <p className="text-emerald-700 font-semibold mb-3 text-lg font-sans">{t('simulation.consumer.currentCost')}</p>
                      <p className="text-3xl font-bold text-emerald-900 font-sans">{calculateSimulation()?.traditionalCost} €</p>
                    </div>
                    
                    <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-lg">
                      <p className="text-emerald-700 font-semibold mb-3 text-lg font-sans">{t('simulation.consumer.newCost')}</p>
                      <p className="text-3xl font-bold text-emerald-900 font-sans">{calculateSimulation()?.sunIsUpCost} €</p>
                    </div>

                    <div className="bg-brand-teal/10 p-8 rounded-2xl border border-brand-teal/30 shadow-lg">
                      <p className="text-emerald-700 font-semibold mb-3 text-lg font-sans">{t('simulation.consumer.savings')}</p>
                      <p className="text-4xl font-bold text-emerald-600 font-sans">{calculateSimulation()?.savings} €</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white p-8 rounded-2xl border border-brand-gold/30 shadow-lg">
                      <p className="text-brand-gold font-semibold mb-3 text-lg font-sans">{t('simulation.producer.production')}</p>
                      <p className="text-3xl font-bold text-amber-900 font-sans">{calculateSimulation()?.estimatedProduction} kWh</p>
                    </div>

                    <div className="bg-brand-gold/10 p-8 rounded-2xl border border-brand-gold/30 shadow-lg">
                      <p className="text-brand-gold font-semibold mb-3 text-lg font-sans">{t('simulation.producer.revenue')}</p>
                      <p className="text-4xl font-bold text-amber-600 font-sans">{calculateSimulation()?.revenue} €</p>
                    </div>
                  </div>
                )}

                <div className={`p-6 rounded-2xl border ${
                  simulationType === 'consumer' ? 'bg-emerald-100 border-emerald-200' : 'bg-amber-100 border-brand-gold/30'
                } mb-8`}>
                  <div className="flex items-start gap-4">
                    <InfoCircle className={`w-6 h-6 flex-shrink-0 mt-1 ${
                      simulationType === 'consumer' ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                    <p className={`text-lg font-sans ${
                      simulationType === 'consumer' ? 'text-emerald-700' : 'text-brand-gold'
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
                  className={`w-full py-5 rounded-2xl font-bold text-xl transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-4 ${
                    simulationType === 'consumer'
                      ? 'bg-brand-teal hover:bg-brand-teal-light text-white'
                      : 'bg-gradient-to-r from-brand-gold to-brand-flame hover:bg-brand-gold-light text-white'
                  } font-sans`}
                >
                  <ArrowRight className="w-7 h-7" />
                  {t('simulation.contact')}
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
    </>
  );
}