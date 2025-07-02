import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimulationModal({ isOpen, onClose }: SimulationModalProps) {
  const [annualConsumption, setAnnualConsumption] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [showResults, setShowResults] = useState(false);

  const calculateSavings = () => {
    const consumption = parseFloat(annualConsumption);
    const rate = parseFloat(currentRate);
    
    if (!consumption || !rate) return null;

    const communityRate = rate * 0.85; // 15% reduction
    const annualSavings = consumption * (rate - communityRate);
    
    return {
      currentCost: (consumption * rate).toFixed(2),
      newCost: (consumption * communityRate).toFixed(2),
      savings: annualSavings.toFixed(2),
      percentageSaved: '15',
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowResults(true);
  };

  const results = calculateSavings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-amber-900">Simulez vos économies</h2>
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-2">
                Consommation annuelle (kWh)
              </label>
              <input
                type="number"
                value={annualConsumption}
                onChange={(e) => setAnnualConsumption(e.target.value)}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ex: 3500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-2">
                Prix actuel par kWh (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Ex: 0.28"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Calculer mes économies
            </button>
          </form>

          {showResults && results && (
            <div className="mt-8 p-6 bg-amber-50 rounded-xl">
              <h3 className="text-xl font-semibold text-amber-900 mb-4">
                Vos économies potentielles
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-amber-700">Coût actuel par an</p>
                  <p className="text-2xl font-bold text-amber-900">{results.currentCost} €</p>
                </div>
                
                <div>
                  <p className="text-amber-700">Coût avec la communauté</p>
                  <p className="text-2xl font-bold text-green-600">{results.newCost} €</p>
                </div>

                <div className="pt-4 border-t border-amber-200">
                  <p className="text-amber-700">Économies annuelles</p>
                  <p className="text-3xl font-bold text-amber-500">{results.savings} €</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Soit une réduction de {results.percentageSaved}% sur votre facture
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}