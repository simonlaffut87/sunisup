import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, User, MapPin, Hash, Euro, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
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
    volume_complementaire: number;
    injection_partagee: number;
    injection_complementaire: number;
    networkCosts: NetworkCosts;
  };
  calculations: {
    energySharedCost: number;
    energyComplementaryCost: number;
    networkCostTotal: number;
    totalCost: number;
    injectionRevenue: number;
    netAmount: number;
  };
}

export function InvoiceTemplate({ isOpen, onClose, participant, selectedPeriod }: InvoiceTemplateProps) {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Parser les données de facturation (NOUVEAU)
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

    // Sommer les coûts réseau (NOUVEAU)
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
      commodity_rate: participant.commodity_rate 
    });

    // Prix de l'énergie partagée (€/MWh)
    const sharedEnergyPrice = Number(participant.shared_energy_price || 100);
    // Tarif de commodité (€/MWh)
    const commodityRate = Number(participant.commodity_rate || 85);

    console.log('💰 Prix utilisés:', { sharedEnergyPrice, commodityRate });

    // Convertir kWh en MWh pour les calculs
    const volumePartageInMWh = totals.volume_partage / 1000;
    const volumeComplementaireInMWh = totals.volume_complementaire / 1000;
    const injectionPartageeInMWh = totals.injection_partagee / 1000;
    const injectionComplementaireInMWh = totals.injection_complementaire / 1000;

    console.log('📊 Volumes en MWh:', {
      volumePartageInMWh,
      volumeComplementaireInMWh,
      injectionPartageeInMWh,
      injectionComplementaireInMWh
    });

    // Calculs des coûts
    const energySharedCost = volumePartageInMWh * sharedEnergyPrice;
    const energyComplementaryCost = volumeComplementaireInMWh * commodityRate;
    
    // IMPORTANT: Utiliser les coûts réseau réels depuis billing_data
    const networkCostTotal = totals.networkCosts.totalFraisReseau || 0;
    
    console.log('💰 Coûts calculés:', {
      energySharedCost,
      energyComplementaryCost,
      networkCostTotal: `${networkCostTotal}€ (depuis billing_data)`
    });

    // Revenus d'injection
    const injectionRevenue = (injectionPartageeInMWh + injectionComplementaireInMWh) * commodityRate;

    // Total
    const totalCost = energySharedCost + energyComplementaryCost + networkCostTotal;
    const netAmount = totalCost - injectionRevenue;

    const calculations = {
      energySharedCost: Math.round(energySharedCost * 100) / 100,
      energyComplementaryCost: Math.round(energyComplementaryCost * 100) / 100,
      networkCostTotal: Math.round(networkCostTotal * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      injectionRevenue: Math.round(injectionRevenue * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100
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
                body { font-family: Arial, sans-serif; margin: 20px; }
                .no-print { display: none !important; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
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
                .bg-gray-50 { background-color: #f9fafb; }
                .border { border: 1px solid #e5e7eb; }
                .rounded { border-radius: 0.375rem; }
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
          <p className="text-gray-600">Génération de la facture...</p>
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
          <p className="text-gray-600">Aucune donnée disponible pour cette période</p>
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header avec boutons d'action */}
        <div className="no-print flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-amber-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Facture énergétique</h2>
              <p className="text-sm text-gray-600">
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

        {/* Contenu de la facture */}
        <div id="invoice-content" className="p-8">
          {/* En-tête de la facture */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-16 w-16 mb-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                <p className="text-gray-600">Communauté d'énergie bruxelloise</p>
                <p className="text-sm text-gray-500 mt-2">
                  info@sunisup.be • +32 471 31 71 48
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-2">FACTURE ÉNERGÉTIQUE</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center justify-end space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(parseISO(invoiceData.period.startDate), 'dd MMMM yyyy', { locale: fr })}
                    {invoiceData.period.startMonth !== invoiceData.period.endMonth && 
                      ` - ${format(parseISO(invoiceData.period.endDate), 'dd MMMM yyyy', { locale: fr })}`
                    }
                  </span>
                </div>
                <div>Facture N° {invoiceData.participant.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Informations du participant */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informations du participant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="space-y-2">
                  <div><strong>Nom :</strong> {invoiceData.participant.name}</div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                    <span><strong>Adresse :</strong> {invoiceData.participant.address}</span>
                  </div>
                  {invoiceData.participant.email && (
                    <div><strong>Email :</strong> {invoiceData.participant.email}</div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Hash className="w-4 h-4 mr-1 text-gray-500" />
                    <span><strong>Code EAN :</strong> {invoiceData.participant.ean_code}</span>
                  </div>
                  <div>
                    <strong>Type :</strong> 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      invoiceData.participant.type === 'producer' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {invoiceData.participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                    </span>
                  </div>
                  {invoiceData.participant.company_number && (
                    <div><strong>N° entreprise :</strong> {invoiceData.participant.company_number}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Détail des coûts réseau - SECTION MISE À JOUR */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail des coûts réseau pour la consommation locale</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border-b border-gray-300">
                      Taux TVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                      Montant HTVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                      Montant TVAC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Utilisation du réseau</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.utilisationReseau.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.utilisationReseau * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Surcharges</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.surcharges.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.surcharges * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Tarif capacitaire</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.tarifCapacitaire.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifCapacitaire * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Tarif mesure & comptage</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.tarifMesure.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifMesure * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Tarif OSP</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.tarifOSP.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.tarifOSP * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Transport ELIA</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.transportELIA.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.transportELIA * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Redevance de voirie</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.totals.networkCosts.redevanceVoirie.toFixed(2)} €
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.networkCosts.redevanceVoirie * 1.21).toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Gridface</div>
                        <div className="text-xs text-gray-500">Consommation</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">21%</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">0.00 €</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">0.00 €</td>
                  </tr>
                  <tr className="bg-gray-100 border-b-2 border-gray-400">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      Total frais réseau
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">-</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
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

          {/* Détail énergétique */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail énergétique</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Consommation */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">📥 Consommation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Énergie partagée :</span>
                    <span className="font-medium">{(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Énergie réseau :</span>
                    <span className="font-medium">{(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2 font-semibold">
                    <span>Total consommation :</span>
                    <span>{((invoiceData.totals.volume_partage + invoiceData.totals.volume_complementaire) / 1000).toFixed(3)} MWh</span>
                  </div>
                </div>
              </div>

              {/* Injection */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-3">📤 Injection</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Injection partagée :</span>
                    <span className="font-medium">{(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Injection réseau :</span>
                    <span className="font-medium">{(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200 pt-2 font-semibold">
                    <span>Total injection :</span>
                    <span>{((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calculs financiers */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculs financiers</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                      Prix unitaire
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">Énergie partagée</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.participant.shared_energy_price} €/MWh
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.calculations.energySharedCost.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">Énergie complémentaire</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.participant.commodity_rate} €/MWh
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.calculations.energyComplementaryCost.toFixed(2)} €
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-900">Frais de réseau (HTVA)</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">-</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">-</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {invoiceData.calculations.networkCostTotal.toFixed(2)} €
                    </td>
                  </tr>
                  {(invoiceData.totals.injection_partagee > 0 || invoiceData.totals.injection_complementaire > 0) && (
                    <tr className="border-b border-gray-200 bg-green-50">
                      <td className="px-4 py-3 text-sm text-green-900">Revenus injection</td>
                      <td className="px-4 py-3 text-right text-sm text-green-900">
                        {((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-900">
                        {invoiceData.participant.commodity_rate} €/MWh
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-900">
                        -{invoiceData.calculations.injectionRevenue.toFixed(2)} €
                      </td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 border-t-2 border-gray-400">
                    <td className="px-4 py-4 text-lg font-bold text-gray-900" colSpan={3}>
                      Montant net à payer
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-bold text-gray-900">
                      {invoiceData.calculations.netAmount.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Détail mensuel */}
          {Object.keys(invoiceData.monthlyData).length > 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail mensuel</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-300">
                        Mois
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                        Vol. Partagé (kWh)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                        Vol. Complémentaire (kWh)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                        Inj. Partagée (kWh)
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b border-gray-300">
                        Inj. Réseau (kWh)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {Object.entries(invoiceData.monthlyData)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([month, data]) => (
                        <tr key={month} className="border-b border-gray-200">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: fr })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {data.volume_partage.toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {data.volume_complementaire.toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {data.injection_partagee.toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {data.injection_complementaire.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Informations légales */}
          <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
            <p className="mb-2">
              <strong>Sun Is Up ASBL</strong> - Communauté d'énergie citoyenne
            </p>
            <p className="mb-2">
              Cette facture détaille votre participation à la communauté d'énergie pour la période du{' '}
              {format(parseISO(invoiceData.period.startDate), 'dd MMMM yyyy', { locale: fr })} au{' '}
              {format(parseISO(invoiceData.period.endDate), 'dd MMMM yyyy', { locale: fr })}.
            </p>
            <p>
              Les coûts réseau sont calculés selon les tarifs officiels de Sibelga et incluent tous les frais de distribution, transport et taxes réglementaires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}