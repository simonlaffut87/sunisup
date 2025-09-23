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
  const [groupTotals, setGroupTotals] = useState<any>(null);
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
      loadGroupInvoiceData();
    }
  }, [isOpen, participant, selectedPeriod]);

  const loadGroupInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);
      setGroupParticipants([]);

      // Si le participant fait partie d'un groupe, charger TOUS les participants du groupe
      let participantsToProcess = [participant];
      
      if (participant.groupe) {
        console.log(`👥 Chargement du groupe: "${participant.groupe}"`);
        
        const { data: allGroupParticipants, error: groupError } = await supabase
          .from('participants')
          .select('*')
          .eq('groupe', participant.groupe);

        if (groupError) {
          console.error('❌ Erreur chargement groupe:', groupError);
          toast.error('Erreur lors du chargement du groupe');
          return;
        }

        if (allGroupParticipants && allGroupParticipants.length > 0) {
          participantsToProcess = allGroupParticipants;
          setGroupParticipants(allGroupParticipants);
          console.log(`✅ ${allGroupParticipants.length} participants trouvés dans le groupe`);
        }
      } else {
        setGroupParticipants([participant]);
      }

      // Calculer les totaux du groupe pour la période sélectionnée
      const groupTotals = calculateGroupTotals(participantsToProcess, selectedPeriod);
      setGroupTotals(groupTotals);

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
          ...participant,
          name: `Groupe ${participant.groupe}`,
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

  const calculateGroupTotals = (participants: any[], period: { startMonth: string; endMonth: string }) => {
    console.log('📊 Calcul des totaux du groupe pour la période:', period);
    
    let totalVolumePartage = 0;
    let totalVolumeComplementaire = 0;
    let totalInjectionPartagee = 0;
    let totalInjectionComplementaire = 0;
    
    const participantDetails: any[] = [];
    
    participants.forEach(p => {
      console.log(`🔍 Traitement participant: ${p.name}`);
      
      if (!p.monthly_data) {
        console.log(`⚠️ ${p.name} n'a pas de monthly_data`);
        participantDetails.push({
          ...p,
          periodTotals: {
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_complementaire: 0
          }
        });
        return;
      }

      let monthlyData;
      try {
        if (typeof p.monthly_data === 'string') {
          monthlyData = JSON.parse(p.monthly_data);
        } else {
          monthlyData = p.monthly_data;
        }
      } catch (error) {
        console.warn(`⚠️ Erreur parsing monthly_data pour ${p.name}:`, error);
        participantDetails.push({
          ...p,
          periodTotals: {
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_complementaire: 0
          }
        });
        return;
      }

      // Calculer les totaux pour la période sélectionnée
      let participantTotals = {
        volume_partage: 0,
        volume_complementaire: 0,
        injection_partagee: 0,
        injection_complementaire: 0
      };

      // Générer la liste des mois dans la période
      const startDate = new Date(period.startMonth + '-01');
      const endDate = new Date(period.endMonth + '-01');
      
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
          const monthData = monthlyData[monthKey];
          participantTotals.volume_partage += Number(monthData.volume_partage || 0);
          participantTotals.volume_complementaire += Number(monthData.volume_complementaire || 0);
          participantTotals.injection_partagee += Number(monthData.injection_partagee || 0);
          participantTotals.injection_complementaire += Number(monthData.injection_complementaire || 0);
        }
      }

      console.log(`📊 Totaux pour ${p.name}:`, participantTotals);

      // Ajouter aux totaux du groupe
      totalVolumePartage += participantTotals.volume_partage;
      totalVolumeComplementaire += participantTotals.volume_complementaire;
      totalInjectionPartagee += participantTotals.injection_partagee;
      totalInjectionComplementaire += participantTotals.injection_complementaire;

      participantDetails.push({
        ...p,
        periodTotals: participantTotals
      });
    });

    const result = {
      totalVolumePartage,
      totalVolumeComplementaire,
      totalInjectionPartagee,
      totalInjectionComplementaire,
      participantDetails
    };

    console.log('📊 Totaux finaux du groupe:', result);
    return result;
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

      // Récupérer les données billing actuelles
      const { data: currentParticipant, error: fetchError } = await supabase
        .from('participants')
        .select('billing_data')
        .eq('id', invoiceData.participant.id)
        .single();

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération des données: ${fetchError.message}`);
      }

      // Parser les données billing existantes
      let billingData = {};
      if (currentParticipant.billing_data) {
        try {
          if (typeof currentParticipant.billing_data === 'string') {
            billingData = JSON.parse(currentParticipant.billing_data);
          } else {
            billingData = currentParticipant.billing_data;
          }
        } catch (error) {
          console.warn('Erreur parsing billing_data existant:', error);
          billingData = {};
        }
      }

      // Ajouter la facture aux données billing
      const updatedBillingData = {
        ...billingData,
        invoices: {
          ...(billingData.invoices || {}),
          [invoiceRecord.id]: invoiceRecord
        }
      };

      // Traiter les données mensuelles pour chaque participant du groupe
      const processedGroupMembers = groupParticipants?.map(member => {
        console.log(`📊 Traitement des données pour: ${member.name} (${member.ean_code})`);
        
        let memberMonthlyData = {};
        if (member.monthly_data) {
          try {
            if (typeof member.monthly_data === 'string') {
              memberMonthlyData = JSON.parse(member.monthly_data);
            } else {
              memberMonthlyData = member.monthly_data;
            }
          } catch (error) {
            console.warn(`Erreur parsing monthly_data pour ${member.name}:`, error);
            memberMonthlyData = {};
          }
        }
        
        console.log(`📅 Données mensuelles pour ${member.name}:`, memberMonthlyData);
        
        // Calculer les totaux pour la période sélectionnée
        let memberTotals = {
          volume_partage: 0,
          volume_complementaire: 0,
          injection_partagee: 0,
          injection_complementaire: 0
        };
        
        // Parcourir la période sélectionnée
        const startDate = new Date(selectedPeriod.startMonth + '-01');
        const endDate = new Date(selectedPeriod.endMonth + '-01');
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          const monthData = memberMonthlyData[monthKey];
          
          if (monthData) {
            memberTotals.volume_partage += Number(monthData.volume_partage || 0);
            memberTotals.volume_complementaire += Number(monthData.volume_complementaire || 0);
            memberTotals.injection_partagee += Number(monthData.injection_partagee || 0);
            memberTotals.injection_complementaire += Number(monthData.injection_complementaire || 0);
          }
          
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        return {
          ...member,
          calculatedTotals: memberTotals
        };
      });
      
      console.log('📊 Participants du groupe avec données calculées:', processedGroupMembers);
      setGroupParticipants(processedGroupMembers);

      // Sauvegarder en base
      const { error: updateError } = await supabase
        .from('participants')
        .update({ billing_data: updatedBillingData })
        .eq('id', invoiceData.participant.id);

      if (updateError) {
        throw new Error(`Erreur lors de la sauvegarde: ${updateError.message}`);
      }

      toast.success('Facture enregistrée avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde facture:', error);
      toast.error(`Erreur lors de l'enregistrement: ${error.message}`);
    } finally {
      setSaving(false);
    }
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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={saving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Enregistrer</span>
                </>
              )}
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
        <div id="invoice-content" className="p-8 bg-white text-gray-900 max-w-none">
          {/* En-tête de la facture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-6 border-b-2 border-gray-300">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src={logoBase64 || '/images/logo-v2.png'} 
                  alt="Sun Is Up Logo" 
                  className="h-20 w-20 flex-shrink-0 rounded-lg flex items-center justify-center"
                  style={{ objectFit: 'contain' }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                  <h2 className="text-xl font-bold text-gray-900">
                    Facture - {isGroupInvoice ? `Groupe ${participant.groupe}` : participant.name}
                  </h2>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mt-2">
                  info@sunisup.be • +32 471 31 71 48
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-2">FACTURE ÉNERGÉTIQUE</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center justify-start md:justify-end space-x-2">
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
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              {isGroupInvoice ? (
                <>
                  <Users className="w-5 h-5 mr-2 text-amber-600" />
                  Facturé au groupe
                </>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2 text-amber-600" />
                  Informations du participant
                </>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-800">
              <div>
                <div className="space-y-2">
                  <div><strong className="text-gray-900">Nom :</strong> {isGroupInvoice ? `Groupe ${participant.groupe}` : invoiceData.participant.name}</div>
                  <div><strong className="text-gray-900">Adresse :</strong> {isGroupInvoice ? 
                    `Groupe ${participant.groupe}\n${groupParticipants.map(p => `• ${p.name} - ${p.address}`).join('\n')}` :
                    invoiceData.participant.address
                  }</div>
                  <p className="font-medium text-gray-900">
                    {participant.name}
                  </p>
                  {invoiceData.participant.email && (
                    <div><strong className="text-gray-900">Email :</strong> {invoiceData.participant.email}</div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div><strong className="text-gray-900">Code EAN :</strong> {invoiceData.participant.ean_code}</div>
                  <div>
                    <strong className="text-gray-900">Type :</strong> 
                    <span className="ml-2">
                      {invoiceData.participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                    </span>
                  </div>
                  {invoiceData.participant.company_number && (
                    <div><strong className="text-gray-900">N° entreprise :</strong> {invoiceData.participant.company_number}</div>
                  )}
                  {isGroupInvoice && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Participants du groupe:</p>
                      {groupParticipants.map((p: any, index: number) => (
                        <div key={p.id} className="text-xs text-gray-600 mb-1">
                          {index + 1}. {p.name} {p.ean_code && `(${p.ean_code})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tableau détaillé par participant (pour les groupes) */}
          {groupTotals && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-amber-600" />
                Détail par participant - Groupe {participant.groupe}
              </h3>
              <div className="overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cons. Partagée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cons. Réseau
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inj. Partagée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inj. Réseau
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupTotals.participantDetails.map((groupParticipant: any) => (
                      <tr key={groupParticipant.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                groupParticipant.type === 'producer' ? 'bg-amber-100' : 'bg-blue-100'
                              }`}>
                                {groupParticipant.type === 'producer' ? (
                                  <span className="w-4 h-4 text-amber-600">☀</span>
                                ) : (
                                  <span className="w-4 h-4 text-blue-600">🏢</span>
                                )}
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {groupParticipant.name}
                              </div>
                              {groupParticipant.ean_code && (
                                <div className="text-xs text-gray-500 font-mono">
                                  {groupParticipant.ean_code}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            groupParticipant.type === 'producer' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {groupParticipant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {(groupParticipant.periodTotals.volume_partage / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {(groupParticipant.periodTotals.volume_complementaire / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {(groupParticipant.periodTotals.injection_partagee / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {(groupParticipant.periodTotals.injection_complementaire / 1000).toFixed(3)} MWh
                        </td>
                      </tr>
                    ))}
                    {/* Ligne de total */}
                    <tr className="bg-amber-50 font-semibold">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-900" colSpan={2}>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2 text-amber-600" />
                          TOTAL GROUPE
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-900">
                        {(groupTotals.totalVolumePartage / 1000).toFixed(3)} MWh
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-900">
                        {(groupTotals.totalVolumeComplementaire / 1000).toFixed(3)} MWh
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-900">
                        {(groupTotals.totalInjectionPartagee / 1000).toFixed(3)} MWh
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-900">
                        {(groupTotals.totalInjectionComplementaire / 1000).toFixed(3)} MWh
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Détail énergétique */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail énergétique</h3>
            
            {/* Affichage détaillé pour les groupes */}
            {isGroupInvoice && groupParticipants && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-800 mb-3">
                  Détail par participant ({groupParticipants.length} membres)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cons. Partagée</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cons. Réseau</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inj. Partagée</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inj. Réseau</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupParticipants.map((groupParticipant: any, index: number) => {
                        const memberTotals = groupParticipant.calculatedTotals || {
                          volume_partage: 0,
                          volume_complementaire: 0,
                          injection_partagee: 0,
                          injection_complementaire: 0
                        };
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{groupParticipant.name}</div>
                                <div className="text-xs text-gray-500">{groupParticipant.ean_code}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                groupParticipant.type === 'producer' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {groupParticipant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(memberTotals.volume_partage / 1000).toFixed(3)} MWh
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(memberTotals.volume_complementaire / 1000).toFixed(3)} MWh
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(memberTotals.injection_partagee / 1000).toFixed(3)} MWh
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {(memberTotals.injection_complementaire / 1000).toFixed(3)} MWh
                            </td>
                          </tr>
                        );
                      })}
                      {/* Ligne de total */}
                      <tr className="bg-amber-50 border-t-2 border-amber-200 font-semibold">
                        <td className="px-4 py-3 text-sm font-bold text-gray-900" colSpan={2}>
                          TOTAL GROUPE
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-blue-600">
                          {(groupParticipants.reduce((sum, member) => 
                            sum + ((member.calculatedTotals?.volume_partage || 0) / 1000), 0
                          )).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-blue-600">
                          {(groupParticipants.reduce((sum, member) => 
                            sum + ((member.calculatedTotals?.volume_complementaire || 0) / 1000), 0
                          )).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-amber-600">
                          {(groupParticipants.reduce((sum, member) => 
                            sum + ((member.calculatedTotals?.injection_partagee || 0) / 1000), 0
                          )).toFixed(3)} MWh
                        </td>
                        <td className="px-4 py-4 text-sm text-right font-bold text-amber-600">
                          {(groupParticipants.reduce((sum, member) => 
                            sum + ((member.calculatedTotals?.injection_complementaire || 0) / 1000), 0
                          )).toFixed(3)} MWh
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consommation */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Consommation</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Énergie partagée :</span>
                    <span className="font-medium">{(invoiceData.tot