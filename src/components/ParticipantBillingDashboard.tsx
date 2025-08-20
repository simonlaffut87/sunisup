import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  Euro,
  Zap,
  TrendingUp,
  BarChart3,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Database as DB } from '../types/supabase';
import { BillingData, InvoiceData } from '../types/billing';
import { BillingCalculator } from '../utils/billingCalculator';
import { InvoiceGenerator } from '../utils/invoiceGenerator';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type Participant = DB['public']['Tables']['participants']['Row'];

interface ParticipantBillingDashboardProps {
  participant: Participant;
  onBack: () => void;
}

export function ParticipantBillingDashboard({ participant, onBack }: ParticipantBillingDashboardProps) {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [loading, setLoading] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [participant.id]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Charger les données de facturation existantes
      let existingBillingData: BillingData | null = null;
      if (participant.billing_data) {
        try {
          existingBillingData = typeof participant.billing_data === 'string' 
            ? JSON.parse(participant.billing_data)
            : participant.billing_data;
        } catch (e) {
          console.warn('Erreur parsing billing_data:', e);
        }
      }

      // Charger les données mensuelles
      let monthlyData = {};
      if (participant.monthly_data) {
        try {
          monthlyData = typeof participant.monthly_data === 'string'
            ? JSON.parse(participant.monthly_data)
            : participant.monthly_data;
        } catch (e) {
          console.warn('Erreur parsing monthly_data:', e);
        }
      }

      // Si pas de données de facturation, les créer avec des coûts réseau par défaut
      if (!existingBillingData) {
        const defaultNetworkCosts = {
          utilisation_reseau_htva: 15.50,
          surcharges_htva: 8.25,
          tarif_capacite_htva: 12.00,
          tarif_mesure_comptage_htva: 3.75,
          tarif_osp_htva: 2.50,
          transport_elia_htva: 18.00,
          redevance_voirie_htva: 5.25,
          gridfee_htva: 4.75
        };

        existingBillingData = BillingCalculator.calculateBillingData(
          participant,
          monthlyData,
          defaultNetworkCosts
        );

        // Sauvegarder les données de facturation
        await saveBillingData(existingBillingData);
      }

      setBillingData(existingBillingData);

      // Préparer les données pour le graphique
      const chartData = Object.entries(existingBillingData.monthly_data).map(([month, data]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
        monthKey: month,
        'Volume Partagé': data.volume_partage,
        'Volume Complémentaire': data.volume_complementaire,
        'Injection Partagée': data.injection_partagee,
        'Injection Complémentaire': data.injection_complementaire,
        'Coûts': data.total_couts,
        'Rémunérations': data.total_remunerations,
        'Solde': data.solde_mensuel
      })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      setMonthlyChartData(chartData);

      // Définir les mois disponibles
      const months = Object.keys(existingBillingData.monthly_data).sort();
      setAvailableMonths(months);
      
      if (months.length > 0) {
        setSelectedPeriod({
          start: months[0],
          end: months[months.length - 1]
        });
      }

    } catch (error) {
      console.error('Erreur chargement données facturation:', error);
      toast.error('Erreur lors du chargement des données de facturation');
    } finally {
      setLoading(false);
    }
  };

  const saveBillingData = async (data: BillingData) => {
    try {
      const { error } = await supabase
        .from('participants')
        .update({ billing_data: JSON.stringify(data) })
        .eq('id', participant.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur sauvegarde billing_data:', error);
      throw error;
    }
  };

  const generateInvoice = async () => {
    if (!billingData || !selectedPeriod.start || !selectedPeriod.end) {
      toast.error('Veuillez sélectionner une période de facturation');
      return;
    }

    try {
      setGeneratingInvoice(true);

      // Générer les données de facture
      const invoiceData = BillingCalculator.generateInvoiceData(
        participant,
        billingData,
        selectedPeriod.start,
        selectedPeriod.end
      );

      // Générer et télécharger le PDF
      InvoiceGenerator.saveInvoice(invoiceData);

      toast.success('Facture générée avec succès !');

    } catch (error) {
      console.error('Erreur génération facture:', error);
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const previewInvoice = async () => {
    if (!billingData || !selectedPeriod.start || !selectedPeriod.end) {
      toast.error('Veuillez sélectionner une période de facturation');
      return;
    }

    try {
      // Générer les données de facture
      const invoiceData = BillingCalculator.generateInvoiceData(
        participant,
        billingData,
        selectedPeriod.start,
        selectedPeriod.end
      );

      // Générer le blob PDF et l'ouvrir dans un nouvel onglet
      const blob = InvoiceGenerator.generateInvoiceBlob(invoiceData);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (error) {
      console.error('Erreur aperçu facture:', error);
      toast.error('Erreur lors de l\'aperçu de la facture');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune donnée de facturation</h2>
          <p className="text-gray-600">Les données de facturation n'ont pas pu être chargées.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard Facturation - {participant.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {participant.type === 'producer' ? 'Producteur' : 'Consommateur'} • Code EAN: {participant.ean_code}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Graphiques des données énergétiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Graphique Volumes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Volumes mensuels</h3>
                <p className="text-sm text-gray-600">Consommation partagée vs complémentaire</p>
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} kWh`, '']}
                    labelFormatter={(label) => `Mois : ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="Volume Partagé" fill="#10B981" name="Volume Partagé" />
                  <Bar dataKey="Volume Complémentaire" fill="#3B82F6" name="Volume Complémentaire" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graphique Financier */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <Euro className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Évolution financière</h3>
                <p className="text-sm text-gray-600">Coûts, rémunérations et solde</p>
              </div>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                    labelFormatter={(label) => `Mois : ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="Coûts" fill="#EF4444" name="Coûts" />
                  <Bar dataKey="Rémunérations" fill="#10B981" name="Rémunérations" />
                  <Bar dataKey="Solde" fill="#F59E0B" name="Solde" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Section Facturation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-amber-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Génération de factures</h3>
                <p className="text-sm text-gray-600">Créer des factures PDF pour les périodes sélectionnées</p>
              </div>
            </div>
          </div>

          {/* Sélection de période */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mois de début
              </label>
              <select
                value={selectedPeriod.start}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mois de fin
              </label>
              <select
                value={selectedPeriod.end}
                onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">Sélectionner...</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={previewInvoice}
                disabled={!selectedPeriod.start || !selectedPeriod.end}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Aperçu
              </button>
              
              <button
                onClick={generateInvoice}
                disabled={!selectedPeriod.start || !selectedPeriod.end || generatingInvoice}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generatingInvoice ? (
                  <>
                    <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Télécharger
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Résumé de la période sélectionnée */}
          {selectedPeriod.start && selectedPeriod.end && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Résumé de la période sélectionnée
              </h4>
              
              {(() => {
                const months = availableMonths.filter(
                  month => month >= selectedPeriod.start && month <= selectedPeriod.end
                );
                
                let totalVolumes = { partage: 0, complementaire: 0 };
                let totalInjections = { partagee: 0, complementaire: 0 };
                let totalFinancier = { couts: 0, remunerations: 0 };
                
                months.forEach(month => {
                  const data = billingData.monthly_data[month];
                  if (data) {
                    totalVolumes.partage += data.volume_partage;
                    totalVolumes.complementaire += data.volume_complementaire;
                    totalInjections.partagee += data.injection_partagee;
                    totalInjections.complementaire += data.injection_complementaire;
                    totalFinancier.couts += data.total_couts;
                    totalFinancier.remunerations += data.total_remunerations;
                  }
                });

                const soldeTotal = totalFinancier.remunerations - totalFinancier.couts;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {totalVolumes.partage.toFixed(2)} kWh
                      </div>
                      <div className="text-sm text-gray-600">Volume Partagé</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {totalInjections.partagee.toFixed(2)} kWh
                      </div>
                      <div className="text-sm text-gray-600">Injection Partagée</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">
                        {totalFinancier.couts.toFixed(2)} €
                      </div>
                      <div className="text-sm text-gray-600">Coûts Totaux</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`text-lg font-bold ${soldeTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {soldeTotal.toFixed(2)} €
                      </div>
                      <div className="text-sm text-gray-600">Solde</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Tableau des factures mensuelles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Historique mensuel</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mois
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume Partagé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume Complémentaire
                  </th>
                  {participant.type === 'producer' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Injection Partagée
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Injection Complémentaire
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coûts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rémunérations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(billingData.monthly_data)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, data]) => (
                    <tr key={month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.volume_partage.toFixed(2)} kWh
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.volume_complementaire.toFixed(2)} kWh
                      </td>
                      {participant.type === 'producer' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.injection_partagee.toFixed(2)} kWh
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.injection_complementaire.toFixed(2)} kWh
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {data.total_couts.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {data.total_remunerations.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          data.solde_mensuel >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {data.solde_mensuel.toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}