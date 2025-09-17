import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, User, MapPin, Hash, Euro, Printer, AlertCircle, Database as DatabaseIcon } from 'lucide-react';
import { Database } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';

type Participant = Database['public']['Tables']['participants']['Row'];

interface InvoiceTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant;
  selectedPeriod: {
    startMonth: string;
    endMonth: string;
  };
}

interface MonthlyData {
  volume_partage: number;
  volume_complementaire: number;
  injection_partagee: number;
  injection_complementaire: number;
  updated_at: string;
}

interface NetworkCosts {
  utilisationReseau: number;
  surcharges: number;
  tarifCapacitaire: number;
  tarifMesure: number;
  tarifOSP: number;
  transportELIA: number;
  redevanceVoirie: number;
  totalFraisReseau: number;
}

interface BillingData {
  networkCosts: NetworkCosts;
  updated_at: string;
}

interface InvoiceData {
  participant: Participant;
  period: {
    startMonth: string;
    endMonth: string;
    startDate: string;
    endDate: string;
  };
  monthlyData: { [month: string]: MonthlyData };
  billingData: { [month: string]: BillingData };
  totals: {
    volume_partage: number;
    injection_partagee: number;
    injection_complementaire: number;
    networkCosts: NetworkCosts;
  };
  calculations: {
    energySharedCostHTVA: number;
    energySharedCostTVAC: number;
    networkCostTotal: number;
    networkCostTVAC: number;
    totalCostTVAC: number;
    injectionRevenue: number;
    netAmount: number;
    vatRate: number;
  };
}

export function InvoiceTemplate({ isOpen, onClose, participant, selectedPeriod }: InvoiceTemplateProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && participant) {
      loadInvoiceData();
    }
  }, [isOpen, participant, selectedPeriod]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🧾 DÉBUT GÉNÉRATION FACTURE');
      console.log('👤 Participant:', participant.name, participant.ean_code);
      console.log('📅 Période:', selectedPeriod);

      // Récupérer les données du participant depuis la base
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', participant.id)
        .single();

      if (participantError) {
        console.error('❌ Erreur chargement participant:', participantError);
        throw new Error('Impossible de charger les données du participant');
      }

      console.log('✅ Données participant chargées');
      console.log('📊 monthly_data présent:', !!participantData.monthly_data);
      console.log('💰 billing_data présent:', !!participantData.billing_data);

      // Debug des données brutes
      const debugData = {
        participantName: participantData.name,
        hasMonthlyData: !!participantData.monthly_data,
        hasBillingData: !!participantData.billing_data,
        monthlyDataRaw: participantData.monthly_data,
        billingDataRaw: participantData.billing_data,
        monthlyDataType: typeof participantData.monthly_data,
        billingDataType: typeof participantData.billing_data
      };
      setDebugInfo(debugData);

      // Parser les données mensuelles
      let monthlyData: { [month: string]: MonthlyData } = {};
      if (participantData.monthly_data) {
        try {
          if (typeof participantData.monthly_data === 'string') {
            monthlyData = JSON.parse(participantData.monthly_data);
          } else {
            monthlyData = participantData.monthly_data;
          }
          console.log('✅ monthly_data parsé:', Object.keys(monthlyData));
        } catch (error) {
          console.warn('⚠️ Erreur parsing monthly_data:', error);
          monthlyData = {};
        }
      }

      // Parser les données de facturation
      let billingData: { [month: string]: BillingData } = {};
      if (participantData.billing_data) {
        try {
          if (typeof participantData.billing_data === 'string') {
            billingData = JSON.parse(participantData.billing_data);
          } else {
            billingData = participantData.billing_data;
          }
          console.log('✅ billing_data parsé:', Object.keys(billingData));
          console.log('💰 Exemple billing_data:', Object.values(billingData)[0]);
        } catch (error) {
          console.warn('⚠️ Erreur parsing billing_data:', error);
          billingData = {};
        }
      } else {
        console.warn('⚠️ Aucune billing_data trouvée pour ce participant');
      }

      // Générer la liste des mois dans la période
      const months = generateMonthsInPeriod(selectedPeriod.startMonth, selectedPeriod.endMonth);
      console.log('📅 Mois dans la période:', months);

      // Filtrer les données pour la période sélectionnée
      const periodMonthlyData: { [month: string]: MonthlyData } = {};
      const periodBillingData: { [month: string]: BillingData } = {};

      months.forEach(month => {
        if (monthlyData[month]) {
          periodMonthlyData[month] = monthlyData[month];
          console.log(`📊 Données mensuelles ${month}:`, monthlyData[month]);
        } else {
          console.warn(`⚠️ Aucune donnée mensuelle pour ${month}`);
        }

        if (billingData[month]) {
          periodBillingData[month] = billingData[month];
          console.log(`💰 Données billing ${month}:`, billingData[month]);
        } else {
          console.warn(`⚠️ Aucune donnée billing pour ${month}`);
        }
      });

      // Calculer les totaux
      const totals = calculateTotals(periodMonthlyData, periodBillingData);
      console.log('📊 Totaux calculés:', totals);

      // Calculer les montants financiers
      const calculations = calculateFinancialAmounts(totals, participantData);
      console.log('💰 Calculs financiers:', calculations);

      const invoiceData: InvoiceData = {
        participant: participantData,
        period: {
          startMonth: selectedPeriod.startMonth,
          endMonth: selectedPeriod.endMonth,
          startDate: selectedPeriod.startMonth + '-01',
          endDate: getLastDayOfMonth(selectedPeriod.endMonth)
        },
        monthlyData: periodMonthlyData,
        billingData: periodBillingData,
        totals,
        calculations
      };

      setInvoiceData(invoiceData);
      console.log('🧾 Facture générée avec succès');

    } catch (error) {
      console.error('❌ Erreur génération facture:', error);
      setError(error.message || 'Erreur lors de la génération de la facture');
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthsInPeriod = (startMonth: string, endMonth: string): string[] => {
    const months: string[] = [];
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');

    let current = new Date(start);
    while (current <= end) {
      const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const getLastDayOfMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  };

  const calculateTotals = (
    monthlyData: { [month: string]: MonthlyData },
    billingData: { [month: string]: BillingData }
  ) => {
    console.log('🧮 CALCUL DES TOTAUX');
    console.log('📊 Données mensuelles à traiter:', Object.keys(monthlyData));
    console.log('💰 Données billing à traiter:', Object.keys(billingData));

    const totals = {
      volume_partage: 0,
      volume_complementaire: 0,
      injection_partagee: 0,
      injection_complementaire: 0,
      networkCosts: {
        utilisationReseau: 0,
        surcharges: 0,
        tarifCapacitaire: 0,
        tarifMesure: 0,
        tarifOSP: 0,
        transportELIA: 0,
        redevanceVoirie: 0,
        totalFraisReseau: 0
      }
    };

    // Sommer les données mensuelles
    Object.entries(monthlyData).forEach(([month, data]) => {
      console.log(`📊 Ajout données ${month}:`, data);
      totals.volume_partage += Number(data.volume_partage || 0);
      totals.volume_complementaire += Number(data.volume_complementaire || 0);
      totals.injection_partagee += Number(data.injection_partagee || 0);
      totals.injection_complementaire += Number(data.injection_complementaire || 0);
    });

    // Sommer les coûts réseau depuis billing_data
    Object.entries(billingData).forEach(([month, data]) => {
      console.log(`💰 Ajout coûts réseau ${month}:`, data.networkCosts);
      if (data.networkCosts) {
        totals.networkCosts.utilisationReseau += Number(data.networkCosts.utilisationReseau || 0);
        totals.networkCosts.surcharges += Number(data.networkCosts.surcharges || 0);
        totals.networkCosts.tarifCapacitaire += Number(data.networkCosts.tarifCapacitaire || 0);
        totals.networkCosts.tarifMesure += Number(data.networkCosts.tarifMesure || 0);
        totals.networkCosts.tarifOSP += Number(data.networkCosts.tarifOSP || 0);
        totals.networkCosts.transportELIA += Number(data.networkCosts.transportELIA || 0);
        totals.networkCosts.redevanceVoirie += Number(data.networkCosts.redevanceVoirie || 0);
        totals.networkCosts.totalFraisReseau += Number(data.networkCosts.totalFraisReseau || 0);
      }
    });

    console.log('📊 Totaux finaux:', totals);
    return totals;
  };

  const calculateFinancialAmounts = (totals: any, participant: Participant) => {
    console.log('💰 CALCUL DES MONTANTS FINANCIERS');
    console.log('📊 Totaux reçus:', totals);
    console.log('👤 Participant:', { 
      name: participant.name, 
      shared_energy_price: participant.shared_energy_price,
      commodity_rate: participant.commodity_rate,
      company_number: participant.company_number
    });

    // Prix de l'énergie partagée (€/MWh)
    const sharedEnergyPrice = Number(participant.shared_energy_price || 100);

    // Déterminer le taux de TVA selon le type de participant
    const vatRate = participant.company_number ? 0.21 : 0.06; // 21% pour entreprises, 6% pour autres
    
    console.log('💰 Prix utilisés:', { 
      sharedEnergyPrice, 
      vatRate: `${(vatRate * 100)}%`,
      hasCompanyNumber: !!participant.company_number
    });

    // Convertir kWh en MWh pour les calculs
    const volumePartageInMWh = totals.volume_partage / 1000;
    const injectionPartageeInMWh = totals.injection_partagee / 1000;
    const injectionComplementaireInMWh = totals.injection_complementaire / 1000;

    console.log('📊 Volumes en MWh:', {
      volumePartageInMWh,
      injectionPartageeInMWh,
      injectionComplementaireInMWh
    });

    // Calculs des coûts
    const energySharedCostHTVA = volumePartageInMWh * sharedEnergyPrice;
    const energySharedCostTVAC = energySharedCostHTVA * (1 + vatRate);
    
    // Utiliser les coûts réseau réels depuis billing_data
    const networkCostTotal = totals.networkCosts.totalFraisReseau || 0;
    const networkCostTVAC = networkCostTotal * 1.21; // Coûts réseau toujours à 21%
    
    console.log('💰 Coûts calculés:', {
      energySharedCostHTVA,
      energySharedCostTVAC,
      networkCostTotal: `${networkCostTotal}€ HTVA`,
      networkCostTVAC: `${networkCostTVAC}€ TVAC`
    });

    // Revenus d'injection
    const injectionRevenue = (injectionPartageeInMWh + injectionComplementaireInMWh) * sharedEnergyPrice;

    // Total
    const totalCostTVAC = energySharedCostTVAC + networkCostTVAC;
    const netAmount = totalCostTVAC - injectionRevenue;

    const calculations = {
      energySharedCostHTVA: Math.round(energySharedCostHTVA * 100) / 100,
      energySharedCostTVAC: Math.round(energySharedCostTVAC * 100) / 100,
      networkCostTotal: Math.round(networkCostTotal * 100) / 100,
      networkCostTVAC: Math.round(networkCostTVAC * 100) / 100,
      totalCostTVAC: Math.round(totalCostTVAC * 100) / 100,
      injectionRevenue: Math.round(injectionRevenue * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      vatRate: vatRate
    };

    console.log('💰 Calculs finaux:', calculations);
    return calculations;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Facture ${participant.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  color: #000 !important;
                  background: white !important;
                }
                .no-print { display: none !important; }
                table { 
                  border-collapse: collapse; 
                  width: 100%; 
                  margin: 10px 0;
                }
                th, td { 
                  border: 1px solid #333 !important; 
                  padding: 8px; 
                  text-align: left;
                  color: #000 !important;
                  background: white !important;
                }
                th { 
                  background-color: #f0f0f0 !important;
                  font-weight: bold;
                  color: #000 !important;
                }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .text-lg { font-size: 1.125rem; }
                .text-xl { font-size: 1.25rem; }
                .text-2xl { font-size: 1.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mt-4 { margin-top: 1rem; }
                .p-4 { padding: 1rem; }
                .bg-gray-50 { background-color: #f9fafb !important; }
                .border { border: 1px solid #333 !important; }
                .rounded { border-radius: 0.375rem; }
                .total-row {
                  background-color: #e5e7eb !important;
                  font-weight: bold;
                  color: #000 !important;
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-800">Génération de la facture...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md">
          <p className="text-gray-800">Aucune donnée disponible pour cette période</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header avec boutons d'action */}
        <div className="no-print flex items-center justify-between p-6 border-b border-gray-300 bg-gray-100">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-amber-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Facture énergétique</h2>
              <p className="text-sm text-gray-700">
                {format(parseISO(invoiceData.period.startDate), 'MMMM yyyy', { locale: fr })}
                {invoiceData.period.startMonth !== invoiceData.period.endMonth && 
                  ` - ${format(parseISO(invoiceData.period.endDate), 'MMMM yyyy', { locale: fr })}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Debug Info - Visible seulement en développement */}

        {/* Contenu de la facture */}
        <div id="invoice-content" className="p-8 bg-white text-gray-900">
          {/* En-tête de la facture */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-300">
            <div>
              <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-16 w-16 mb-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                <p className="text-gray-700">Communauté d'énergie bruxelloise</p>
                <p className="text-sm text-gray-600 mt-2">
                  info@sunisup.be • +32 471 31 71 48
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-2">FACTURE ÉNERGÉTIQUE</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center justify-end space-x-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span>
                    {format(parseISO(invoiceData.period.startDate), 'MMMM yyyy', { locale: fr })}
                    {invoiceData.period.startMonth !== invoiceData.period.endMonth && 
                      ` - ${format(parseISO(invoiceData.period.endDate), 'MMMM yyyy', { locale: fr })}`
                    }
                  </span>
                </div>
                <div className="text-gray-600">
                  Facture N° {invoiceData.participant.ean_code?.slice(-6) || '000000'}-{format(parseISO(invoiceData.period.startDate), 'MM-yy')}
                </div>
              </div>
            </div>
          </div>

          {/* Informations du participant */}
          <div className="mb-8 p-6 bg-gray-100 rounded-lg border-2 border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-700" />
              Informations du participant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
              <div>
                <div className="space-y-2">
                  <div><strong className="text-gray-900">Nom :</strong> {invoiceData.participant.name}</div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-600" />
                    <span><strong className="text-gray-900">Adresse :</strong> {invoiceData.participant.address}</span>
                  </div>
                  {invoiceData.participant.email && (
                    <div><strong className="text-gray-900">Email :</strong> {invoiceData.participant.email}</div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Hash className="w-4 h-4 mr-1 text-gray-600" />
                    <span><strong className="text-gray-900">Code EAN :</strong> {invoiceData.participant.ean_code}</span>
                  </div>
                  <div>
                    <strong className="text-gray-900">Type :</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      invoiceData.participant.type === 'producer' 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'bg-blue-200 text-blue-900'
                    }`}>
                      {invoiceData.participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                    </span>
                  </div>
                  {invoiceData.participant.company_number && (
                    <div><strong className="text-gray-900">N° entreprise :</strong> {invoiceData.participant.company_number}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Détail énergétique */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail énergétique</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Consommation */}
              <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
                <h4 className="font-medium text-blue-900 mb-3">📥 Consommation</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Énergie partagée :</span>
                    <span className="font-medium">{(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span>Énergie réseau (achat au fournisseur) :</span>
                    <span className="font-medium text-blue-600">{(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="text-xs text-blue-600 italic mt-1">
                    * Énergie réseau : indicatif, non facturée par Sun Is Up
                  </div>
                </div>
              </div>

              {/* Injection */}
              <div className="bg-amber-100 p-4 rounded-lg border-2 border-amber-300">
                <h4 className="font-medium text-amber-900 mb-3">📤 Injection</h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <div className="flex justify-between">
                    <span>Injection partagée :</span>
                    <span className="font-medium">{(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Injection réseau :</span>
                    <span className="font-medium">{(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-amber-300 pt-2 font-semibold text-amber-900">
                    <span>Total injection :</span>
                    <span>{((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Détail des coûts réseau - AMÉLIORÉ */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail des coûts réseau</h3>
            
            {/* Vérification des données billing */}
            {Object.keys(invoiceData.billingData).length === 0 ? (
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-red-900">Aucune donnée de coûts réseau trouvée</span>
                </div>
                <p className="text-sm text-red-800 mt-2">
                  Les coûts réseau n'ont pas été importés pour cette période. 
                  Assurez-vous d'importer un fichier Excel contenant les colonnes de coûts réseau.
                </p>
              </div>
            ) : (
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <DatabaseIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">
                    Données de coûts réseau disponibles pour {Object.keys(invoiceData.billingData).length} mois
                  </span>
                </div>
                <p className="text-sm text-green-800 mt-1">
                  Mois: {Object.keys(invoiceData.billingData).map(m => 
                    format(parseISO(m + '-01'), 'MMM yyyy', { locale: fr })
                  ).join(', ')}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border-2 border-gray-400">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Taux TVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Montant HTVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Montant TVAC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Utilisation du réseau</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.utilisationReseau.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.utilisationReseau * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Surcharges</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.surcharges.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.surcharges * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Tarif capacitaire</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.tarifCapacitaire.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifCapacitaire * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Tarif mesure & comptage</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.tarifMesure.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifMesure * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Tarif OSP</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.tarifOSP.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifOSP * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Transport ELIA</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.transportELIA.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.transportELIA * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Redevance voirie</div>
                        <div className="text-xs text-gray-600">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.redevanceVoirie.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(invoiceData.totals.networkCosts.redevanceVoirie * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="bg-gray-200 border-t-2 border-gray-400 total-row">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 border-r border-gray-300">
                      TOTAL COÛTS RÉSEAU
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-r border-gray-300">
                      {invoiceData.totals.networkCosts.totalFraisReseau.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {(invoiceData.totals.networkCosts.totalFraisReseau * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Récapitulatif financier */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Euro className="w-5 h-5 mr-2 text-gray-700" />
              Récapitulatif financier
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-2 border-gray-400">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Taux TVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Montant HTVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b-2 border-gray-400">
                      Montant TVAC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Énergie partagée</div>
                        <div className="text-xs text-gray-600">
                          {(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh × {invoiceData.participant.shared_energy_price}€/MWh HTVA
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">
                      {(invoiceData.calculations.vatRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.calculations.energySharedCostHTVA.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {invoiceData.calculations.energySharedCostTVAC.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Coûts réseau</div>
                        <div className="text-xs text-gray-600">Frais de distribution et transport</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">21%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-r border-gray-300">
                      {invoiceData.calculations.networkCostTotal.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {invoiceData.calculations.networkCostTVAC.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-400 bg-blue-50">
                    <td className="px-4 py-3 text-sm font-bold text-blue-900 border-r border-gray-300">
                      SOUS-TOTAL COÛTS
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-900 border-r border-gray-300">-</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-900 border-r border-gray-300">-</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-900">
                      {invoiceData.calculations.totalCostTVAC.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                      <div>
                        <div className="font-medium text-gray-900">Revenus injection</div>
                        <div className="text-xs text-gray-600">
                          {((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh × {invoiceData.participant.shared_energy_price}€/MWh
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-300">-</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-700 border-r border-gray-300">
                      -{invoiceData.calculations.injectionRevenue.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-700">
                      -{invoiceData.calculations.injectionRevenue.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="bg-amber-100 border-t-2 border-amber-400">
                    <td className="px-4 py-3 text-lg font-bold text-amber-900 border-r border-gray-300">
                      MONTANT NET À PAYER
                    </td>
                    <td className="px-4 py-3 text-center text-lg font-bold text-amber-900 border-r border-gray-300">-</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-amber-900 border-r border-gray-300">-</td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-amber-900">
                      {invoiceData.calculations.netAmount.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conditions de paiement */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
            <h4 className="font-semibold text-gray-900 mb-2">Conditions de paiement</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• Paiement à 30 jours, soit au plus tard le {format(addDays(new Date(), 30), 'dd/MM/yyyy', { locale: fr })}</p>
              <p>• Virement bancaire : BE96 0020 1192 6005</p>
              <p>• Communication : {invoiceData.participant.ean_code?.slice(-6) || '000000'}-{format(parseISO(invoiceData.period.startDate), 'MM-yy')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}