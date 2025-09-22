import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, User, MapPin, Hash, Euro, Printer, AlertCircle, Database as DatabaseIcon, Users } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [isGroupInvoice, setIsGroupInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Convert logo to base64 for PDF compatibility
  useEffect(() => {
    const convertLogoToBase64 = async () => {
      try {
        const response = await fetch('/images/logo-v2.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn('Could not load logo for PDF:', error);
        // Fallback: create a simple SVG logo as base64
        const svgLogo = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="35" fill="#F59E0B"/>
          <text x="40" y="48" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">SIU</text>
        </svg>`;
        const base64Svg = `data:image/svg+xml;base64,${btoa(svgLogo)}`;
        setLogoBase64(base64Svg);
      }
    };
    
    if (isOpen) {
      convertLogoToBase64();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && participant) {
      loadInvoiceData();
    }
  }, [isOpen, participant, selectedPeriod]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);
      setGroupParticipants([]);

      console.log('🧾 DÉBUT GÉNÉRATION FACTURE');
      console.log('👤 Participant:', participant.name, participant.ean_code);
      console.log('📅 Période:', selectedPeriod);
      console.log('👥 Groupe participant:', participant.groupe);
      
      let allParticipants = [participant];
      let isGroup = false;

      // Si le participant fait partie d'un groupe, charger tous les participants du groupe
      if (participant.groupe) {
        console.log(`👥 Participant fait partie du groupe: "${participant.groupe}"`);
        
        const { data: groupData, error: groupError } = await supabase
          .from('participants')
          .select('*')
          .eq('groupe', participant.groupe);

        if (groupError) {
          console.error('Erreur chargement groupe:', groupError);
          throw new Error(`Impossible de charger les participants du groupe: ${groupError.message}`);
        }

        if (groupData && groupData.length > 1) {
          allParticipants = groupData;
          isGroup = true;
          setGroupParticipants(groupData);
          setIsGroupInvoice(true);
          console.log(`✅ ${groupData.length} participants trouvés dans le groupe "${participant.groupe}"`);
        } else {
          console.log('ℹ️ Participant individuel ou groupe avec un seul membre');
          setIsGroupInvoice(false);
        }
      } else {
        console.log('ℹ️ Participant sans groupe');
        setIsGroupInvoice(false);
      }

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

      // Initialiser les totaux pour tous les participants
      const participantDetails: any[] = [];
      let groupTotalVolumePartage = 0;
      let groupTotalVolumeComplementaire = 0;
      let groupTotalInjectionPartagee = 0;
      let groupTotalInjectionComplementaire = 0;
      let groupTotalNetworkCosts = {
        utilisationReseau: 0,
        surcharges: 0,
        tarifCapacitaire: 0,
        tarifMesure: 0,
        tarifOSP: 0,
        transportELIA: 0,
        redevanceVoirie: 0,
        totalFraisReseau: 0
      };

      // Traiter chaque participant (individuel ou groupe)
      for (const currentParticipant of allParticipants) {
        console.log(`🔍 Traitement participant: ${currentParticipant.name}`);
        
        let participantVolumePartage = 0;
        let participantVolumeComplementaire = 0;
        let participantInjectionPartagee = 0;
        let participantInjectionComplementaire = 0;
        let participantNetworkCosts = {
          utilisationReseau: 0,
          surcharges: 0,
          tarifCapacitaire: 0,
          tarifMesure: 0,
          tarifOSP: 0,
          transportELIA: 0,
          redevanceVoirie: 0,
          totalFraisReseau: 0
        };

        if (currentParticipant.monthly_data) {
          let monthlyData;
          try {
            if (typeof currentParticipant.monthly_data === 'string') {
              monthlyData = JSON.parse(currentParticipant.monthly_data);
            } else {
              monthlyData = currentParticipant.monthly_data;
            }
          } catch (error) {
            console.warn(`Erreur parsing monthly_data pour ${currentParticipant.name}:`, error);
            monthlyData = {};
          }

          months.forEach(month => {
            const monthData = monthlyData[month];
            if (monthData) {
              participantVolumePartage += Number(monthData.volume_partage || 0);
              participantVolumeComplementaire += Number(monthData.volume_complementaire || 0);
              participantInjectionPartagee += Number(monthData.injection_partagee || 0);
              participantInjectionComplementaire += Number(monthData.injection_complementaire || 0);
            }
          });
        }

        // Traiter les données de facturation (coûts réseau)
        if (currentParticipant.billing_data) {
          let billingData;
          try {
            if (typeof currentParticipant.billing_data === 'string') {
              billingData = JSON.parse(currentParticipant.billing_data);
            } else {
              billingData = currentParticipant.billing_data;
            }
          } catch (error) {
            console.warn(`Erreur parsing billing_data pour ${currentParticipant.name}:`, error);
            billingData = {};
          }

          months.forEach(month => {
            const monthBilling = billingData[month];
            if (monthBilling && monthBilling.networkCosts) {
              const costs = monthBilling.networkCosts;
              participantNetworkCosts.utilisationReseau += Number(costs.utilisationReseau || 0);
              participantNetworkCosts.surcharges += Number(costs.surcharges || 0);
              participantNetworkCosts.tarifCapacitaire += Number(costs.tarifCapacitaire || 0);
              participantNetworkCosts.tarifMesure += Number(costs.tarifMesure || 0);
              participantNetworkCosts.tarifOSP += Number(costs.tarifOSP || 0);
              participantNetworkCosts.transportELIA += Number(costs.transportELIA || 0);
              participantNetworkCosts.redevanceVoirie += Number(costs.redevanceVoirie || 0);
              participantNetworkCosts.totalFraisReseau += Number(costs.totalFraisReseau || 0);
            }
          });
        }

        // Ajouter les détails de ce participant
        participantDetails.push({
          name: currentParticipant.name,
          address: currentParticipant.address,
          ean_code: currentParticipant.ean_code,
          type: currentParticipant.type,
          volume_partage: participantVolumePartage,
          volume_complementaire: participantVolumeComplementaire,
          injection_partagee: participantInjectionPartagee,
          injection_complementaire: participantInjectionComplementaire,
          networkCosts: participantNetworkCosts
        });

        // Ajouter aux totaux du groupe
        groupTotalVolumePartage += participantVolumePartage;
        groupTotalVolumeComplementaire += participantVolumeComplementaire;
        groupTotalInjectionPartagee += participantInjectionPartagee;
        groupTotalInjectionComplementaire += participantInjectionComplementaire;
        
        // Ajouter aux coûts réseau du groupe
        groupTotalNetworkCosts.utilisationReseau += participantNetworkCosts.utilisationReseau;
        groupTotalNetworkCosts.surcharges += participantNetworkCosts.surcharges;
        groupTotalNetworkCosts.tarifCapacitaire += participantNetworkCosts.tarifCapacitaire;
        groupTotalNetworkCosts.tarifMesure += participantNetworkCosts.tarifMesure;
        groupTotalNetworkCosts.tarifOSP += participantNetworkCosts.tarifOSP;
        groupTotalNetworkCosts.transportELIA += participantNetworkCosts.transportELIA;
        groupTotalNetworkCosts.redevanceVoirie += participantNetworkCosts.redevanceVoirie;
        groupTotalNetworkCosts.totalFraisReseau += participantNetworkCosts.totalFraisReseau;
      }

      console.log('📊 Totaux du groupe calculés:', {
        participants: participantDetails.length,
        totalVolumePartage: groupTotalVolumePartage,
        totalVolumeComplementaire: groupTotalVolumeComplementaire,
        totalInjectionPartagee: groupTotalInjectionPartagee,
        totalInjectionComplementaire: groupTotalInjectionComplementaire,
        totalNetworkCosts: groupTotalNetworkCosts.totalFraisReseau
      });

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
        participant: isGroup ? {
          ...participantData,
          name: `Groupe ${participant.groupe}`,
          address: 'Multiples adresses',
          ean_code: 'Multiples codes EAN'
        } : participantData,
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

    // Frais d'adhésion annuels (50€ TTC) - seulement pour la première facture de l'année
    const currentYear = new Date().getFullYear();
    const isFirstInvoiceOfYear = true; // Pour 2025, c'est la première facture
    const membershipFeeHTVA = isFirstInvoiceOfYear ? 50 / 1.21 : 0; // 41.32€ HTVA
    const membershipFeeTVAC = isFirstInvoiceOfYear ? 50 : 0; // 50€ TVAC
    
    console.log('💰 Frais d\'adhésion:', {
      isFirstInvoiceOfYear,
      currentYear,
      membershipFeeHTVA: `${membershipFeeHTVA.toFixed(2)}€`,
      membershipFeeTVAC: `${membershipFeeTVAC}€`
    });
    // Total
    const totalCostTVAC = energySharedCostTVAC + networkCostTVAC + membershipFeeTVAC;
    const netAmount = totalCostTVAC - injectionRevenue;

    const calculations = {
      energySharedCostHTVA: Math.round(energySharedCostHTVA * 100) / 100,
      energySharedCostTVAC: Math.round(energySharedCostTVAC * 100) / 100,
      networkCostTotal: Math.round(networkCostTotal * 100) / 100,
      networkCostTVAC: Math.round(networkCostTVAC * 100) / 100,
      membershipFeeHTVA: Math.round(membershipFeeHTVA * 100) / 100,
      membershipFeeTVAC: Math.round(membershipFeeTVAC * 100) / 100,
      isFirstInvoiceOfYear,
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
    try {
      setSaving(true);
      
      const debug: string[] = [];
      debug.push(`🔍 Participant principal: ${participant.name}`);
      debug.push(`👥 Groupe: ${participant.groupe || 'Aucun groupe'}`);
      // Générer le PDF
      const invoiceContent = document.getElementById('invoice-content');
      if (!invoiceContent) {
        debug.push('👤 Participant individuel, pas de groupe');
        toast.error('Impossible de trouver le contenu de la facture');
        setSaving(false);
        setDebugInfo(debug);
        return;
      }

      // Masquer temporairement les boutons pour la capture
      const buttons = document.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      // Générer le canvas à partir du contenu HTML
      html2canvas(invoiceContent, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: invoiceContent.scrollWidth,
        height: invoiceContent.scrollHeight
      }).then(canvas => {
        // Restaurer l'affichage des boutons
        buttons.forEach(btn => (btn as HTMLElement).style.display = '');

        // Créer le PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Ajouter la première page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        debug.push(`👥 Chargement du groupe: "${participant.groupe}"`);
        heightLeft -= pageHeight;

        // Ajouter des pages supplémentaires si nécessaire
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        setDebugInfo(debug);
        // Télécharger le PDF
        const fileName = `Facture_${invoiceData.participant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${invoiceData.period.startMonth}${invoiceData.period.startMonth !== invoiceData.period.endMonth ? '_' + invoiceData.period.endMonth : ''}.pdf`;
        pdf.save(fileName);
        
        debug.push(`✅ ${groupParticipants?.length || 0} participants trouvés dans le groupe`);
        toast.success('Facture PDF téléchargée avec succès');
        setSaving(false);
      }).catch(error => {
        // Restaurer l'affichage des boutons en cas d'erreur
        setDebugInfo(debug);
        buttons.forEach(btn => (btn as HTMLElement).style.display = '');
        console.error('Erreur génération PDF:', error);
        toast.error('Erreur lors de la génération du PDF');
        setSaving(false);
      });
      setDebugInfo(debug);

    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement de la facture');
      setSaving(false);
    }
  };

  const handleSaveInvoice = async () => {
    try {
      setSaving(true);
      
      // Créer les données de la facture à sauvegarder
      const invoiceRecord = {
        id: `invoice_${invoiceData.participant.id}_${invoiceData.period.startMonth}_${invoiceData.period.endMonth}`,
        participant_id: invoiceData.participant.id,
        participant_name: invoiceData.participant.name,
        period_start: invoiceData.period.startMonth,
        period_end: invoiceData.period.endMonth,
        generated_date: new Date().toISOString(),
        totals: invoiceData.totals,
        calculations: invoiceData.calculations,
        status: 'generated'
      };

      // Sauvegarder la facture dans la base de données (optionnel)
      console.log('Facture générée:', invoiceRecord);
      
      toast.success('Facture sauvegardée avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde facture:', error);
      toast.error('Erreur lors de la sauvegarde de la facture');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            <span>Génération de la facture...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Erreur</h3>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header avec boutons */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print">
          <h2 className="text-xl font-bold text-gray-800">
            Facture - {invoiceData.participant.name}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{saving ? 'Génération...' : 'Télécharger PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              <span>Fermer</span>
            </button>
          </div>
        </div>

        {/* Debug Window */}
        {debugInfo && isGroupInvoice && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 no-print">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">Debug - Données de groupe</h3>
            </div>
            <div className="bg-white p-3 rounded border text-xs font-mono max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Contenu de la facture */}
        <div id="invoice-content" className="p-8">
          {/* En-tête de la facture */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <img 
                src="/images/logo-v2.png" 
                alt="SunIsUp Logo" 
                className="h-16 mb-4"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-sm text-gray-600">
                <p className="font-semibold">SunIsUp ASBL</p>
                <p>Rue de la Paix 123</p>
                <p>1000 Bruxelles</p>
                <p>TVA: BE0123.456.789</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">FACTURE</h1>
              <div className="text-sm text-gray-600">
                <p>Date: {format(new Date(), 'dd/MM/yyyy', { locale: fr })}</p>
                <p>Période: {format(parseISO(invoiceData.period.startDate), 'MMMM yyyy', { locale: fr })}
                  {invoiceData.period.startMonth !== invoiceData.period.endMonth && 
                    ` - ${format(parseISO(invoiceData.period.endDate), 'MMMM yyyy', { locale: fr })}`}
                </p>
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informations client
            </h3>
            <div className="bg-gray-50 p-4 rounded border">
              <p className="font-semibold">{invoiceData.participant.name}</p>
              <p>{invoiceData.participant.address}</p>
              {invoiceData.participant.ean_code !== 'Multiples codes EAN' && (
                <p className="text-sm text-gray-600">Code EAN: {invoiceData.participant.ean_code}</p>
              )}
              {invoiceData.participant.company_number && (
                <p className="text-sm text-gray-600">N° entreprise: {invoiceData.participant.company_number}</p>
              )}
            </div>
          </div>

          {/* Détail par participant pour les groupes */}
          {isGroupInvoice && groupParticipants.length > 1 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Détail par participant ({groupParticipants.length} membres)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left">PARTICIPANT</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">TYPE</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">CONS. PARTAGÉE</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">CONS. RÉSEAU</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">INJ. PARTAGÉE</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">INJ. RÉSEAU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupParticipants.map((member) => {
                      // Calculer les totaux pour ce membre sur la période
                      let memberVolumePartage = 0;
                      let memberVolumeComplementaire = 0;
                      let memberInjectionPartagee = 0;
                      let memberInjectionComplementaire = 0;

                      if (member.monthly_data) {
                        let monthlyData;
                        try {
                          if (typeof member.monthly_data === 'string') {
                            monthlyData = JSON.parse(member.monthly_data);
                          } else {
                            monthlyData = member.monthly_data;
                          }

                          const months = generateMonthsInPeriod(selectedPeriod.startMonth, selectedPeriod.endMonth);
                          months.forEach(month => {
                            const monthData = monthlyData[month];
                            if (monthData) {
                              memberVolumePartage += Number(monthData.volume_partage || 0);
                              memberVolumeComplementaire += Number(monthData.volume_complementaire || 0);
                              memberInjectionPartagee += Number(monthData.injection_partagee || 0);
                              memberInjectionComplementaire += Number(monthData.injection_complementaire || 0);
                            }
                          });
                        } catch (error) {
                          console.warn(`Erreur parsing monthly_data pour ${member.name}:`, error);
                        }
                      }

                      return (
                        <tr key={member.id}>
                          <td className="border border-gray-300 px-3 py-2">
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-xs text-gray-500">{member.ean_code}</div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              member.type === 'producer' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {member.type === 'producer' ? 'Producteur' : 'Consommateur'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {(memberVolumePartage / 1000).toFixed(3)} MWh
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {(memberVolumeComplementaire / 1000).toFixed(3)} MWh
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {(memberInjectionPartagee / 1000).toFixed(3)} MWh
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            {(memberInjectionComplementaire / 1000).toFixed(3)} MWh
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-300 px-3 py-2" colSpan={2}>TOTAL GROUPE</td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-blue-600">
                        {(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-blue-600">
                        {(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-orange-600">
                        {(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-orange-600">
                        {(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Résumé énergétique */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <DatabaseIcon className="w-5 h-5 mr-2" />
              Résumé énergétique
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded border">
                <h4 className="font-semibold text-blue-800 mb-2">Consommation</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Énergie partagée:</span>
                    <span className="font-medium">{(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Énergie réseau:</span>
                    <span className="font-medium">{(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded border">
                <h4 className="font-semibold text-orange-800 mb-2">Injection</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Énergie partagée:</span>
                    <span className="font-medium">{(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Énergie réseau:</span>
                    <span className="font-medium">{(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Détail financier */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Euro className="w-5 h-5 mr-2" />
              Détail financier
            </h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Quantité</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Prix unitaire</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Montant HTVA</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">TVA</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Montant TVAC</th>
                </tr>
              </thead>
              <tbody>
                {/* Énergie partagée */}
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Énergie partagée</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.participant.shared_energy_price || 100}€/MWh
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.calculations.energySharedCostHTVA.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.calculations.vatRate * 100).toFixed(0)}%
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                    {invoiceData.calculations.energySharedCostTVAC.toFixed(2)}€
                  </td>
                </tr>

                {/* Coûts réseau */}
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Utilisation du réseau</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.utilisationReseau.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.utilisationReseau * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Surcharges</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.surcharges.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.surcharges * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Tarif capacitaire</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.tarifCapacitaire.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.tarifCapacitaire * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Tarif de mesure</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.tarifMesure.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.tarifMesure * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Tarif OSP</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.tarifOSP.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.tarifOSP * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Frais remboursés à Sibelga</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.transportELIA.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.transportELIA * 1.21).toFixed(2)}€
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Redevance voirie</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {invoiceData.totals.networkCosts.redevanceVoirie.toFixed(2)}€
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(invoiceData.totals.networkCosts.redevanceVoirie * 1.21).toFixed(2)}€
                  </td>
                </tr>

                {/* Frais d'adhésion si applicable */}
                {invoiceData.calculations.isFirstInvoiceOfYear && (
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Frais d'adhésion annuels 2025</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">1</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">50€</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {invoiceData.calculations.membershipFeeHTVA.toFixed(2)}€
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">21%</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                      {invoiceData.calculations.membershipFeeTVAC.toFixed(2)}€
                    </td>
                  </tr>
                )}

                {/* Revenus d'injection */}
                {invoiceData.calculations.injectionRevenue > 0 && (
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 px-4 py-2">Revenus injection énergie</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {invoiceData.participant.shared_energy_price || 100}€/MWh
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium text-green-600">
                      -{invoiceData.calculations.injectionRevenue.toFixed(2)}€
                    </td>
                  </tr>
                )}

                {/* Total */}
                <tr className="bg-gray-100 font-bold text-lg">
                  <td className="border border-gray-300 px-4 py-3" colSpan={5}>
                    MONTANT NET À PAYER
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right">
                    {invoiceData.calculations.netAmount.toFixed(2)}€
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conditions de paiement */}
          <div className="mt-8 text-sm text-gray-600">
            <h4 className="font-semibold mb-2">Conditions de paiement</h4>
            <p>Paiement à 30 jours. En cas de retard, des intérêts de retard de 1% par mois seront appliqués.</p>
            <p className="mt-2">
              <strong>Coordonnées bancaires:</strong> BE12 3456 7890 1234 - SunIsUp ASBL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}