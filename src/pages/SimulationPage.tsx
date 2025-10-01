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
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
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
      
      if (!error) setParticipants(data || []);
      else setParticipants([]);
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

      const marketPrice = 0.35;
      const sunIsUpPrice = 0.25;
      const coverageRatio = 0.33;

      const traditionalCost = consumption * marketPrice;
      const sunIsUpCost = consumption * ((coverageRatio * sunIsUpPrice) + ((1 - coverageRatio) * marketPrice));
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
        estimatedProduction = panels * 950 * 0.4;
      } else {
        const power = parseFloat(peakPower);
        if (!power) return null;
        estimatedProduction = power * 950;
      }
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

  const handleContactClick = () => setShowContactModal(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
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
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Hero */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-yellow-100 via-white to-green-50">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center px-6 py-3 bg-yellow-50 border border-yellow-200 rounded-full text-yellow-700 font-medium shadow mb-8">
              <Calculator className="w-4 h-4 mr-2" />
              {t('simulation.heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('simulation.heroTitle')}
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              {t('simulation.heroDescription')}
            </p>
          </div>
        </section>

        {/* Simulation Form Section */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              {t('simulation.profileChoice')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <button
                onClick={() => { setSimulationType('consumer'); setShowResults(false); }}
                className={`p-8 rounded-2xl border-2 transition ${simulationType==='consumer' ? 'border-green-600 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-400'}`}
              >
                <Building2 className={`w-12 h-12 mx-auto mb-4 ${simulationType==='consumer' ? 'text-green-600' : 'text-gray-500'}`} />
                <h3 className="text-xl font-bold text-gray-900">{t('simulation.consumer.title')}</h3>
              </button>

              <button
                onClick={() => { setSimulationType('producer'); setShowResults(false); }}
                className={`p-8 rounded-2xl border-2 transition ${simulationType==='producer' ? 'border-yellow-500 bg-yellow-50 shadow-md' : 'border-gray-200 hover:border-yellow-400'}`}
              >
                <Sun className={`w-12 h-12 mx-auto mb-4 ${simulationType==='producer' ? 'text-yellow-500' : 'text-gray-500'}`} />
                <h3 className="text-xl font-bold text-gray-900">{t('simulation.producer.title')}</h3>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {simulationType === 'consumer' ? (
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-2">{t('simulation.consumer.consumption')}</label>
                  <input type="number" value={annualConsumption} onChange={(e) => setAnnualConsumption(e.target.value)} required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600" placeholder="Ex: 25000" />
                </div>
              ) : (
                <div>
                  {usePanelCount ? (
                    <>
                      <label className="block text-lg font-bold text-gray-900 mb-2">{t('simulation.producer.panelCount')}</label>
                      <input type="number" value={panelCount} onChange={(e) => setPanelCount(e.target.value)} required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" placeholder="Ex: 20" />
                    </>
                  ) : (
                    <>
                      <label className="block text-lg font-bold text-gray-900 mb-2">{t('simulation.producer.power')}</label>
                      <input type="number" value={peakPower} onChange={(e) => setPeakPower(e.target.value)} required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" placeholder="Ex: 8.5" />
                    </>
                  )}
                  <div className="mt-4 flex items-center">
                    <input type="checkbox" checked={usePanelCount} onChange={(e) => setUsePanelCount(e.target.checked)}
                      className="w-5 h-5 text-yellow-500 border-gray-300 rounded" />
                    <span className="ml-2 text-gray-700">{t('simulation.producer.powerUnknown')}</span>
                  </div>
                </div>
              )}
              <button type="submit" className={`w-full py-4 rounded-lg font-bold text-lg text-white ${simulationType==='consumer' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                <Calculator className="inline w-5 h-5 mr-2" /> {t('simulation.calculate')}
              </button>
            </form>

            {showResults && (
              <div className={`mt-10 p-8 rounded-2xl ${simulationType==='consumer' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <h3 className={`text-2xl font-bold mb-4 ${simulationType==='consumer' ? 'text-green-800' : 'text-yellow-800'}`}>{t('simulation.results')}</h3>
                <p>{simulationResults}</p>
                <button onClick={handleContactClick} className={`mt-6 w-full py-3 rounded-lg font-bold text-white ${simulationType==='consumer' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
                  <ArrowRight className="inline w-5 h-5 mr-2" /> {t('simulation.contact')}
                </button>
              </div>
            )}
          </div>
        </div>

        <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} initialMessage={simulationResults} />
      </div>
    </>
  );
}
