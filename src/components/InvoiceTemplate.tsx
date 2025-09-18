import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, User, MapPin, Hash, Euro, Printer, AlertCircle, Database as DatabaseIcon } from 'lucide-react';
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

  const generatePDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    
    // Page 1
    let yPos = margin;
    
    // En-tête avec logo
    // Ajouter le logo Sun Is Up (simulé avec un rectangle coloré)
    pdf.setFillColor(251, 191, 36); // Couleur amber-400
    pdf.rect(margin, yPos - 5, 15, 15, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SUN', margin + 2, yPos + 2);
    pdf.text('IS UP', margin + 1, yPos + 6);
    
    // Texte à côté du logo
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Sun Is Up ASBL', margin + 20, yPos);
    yPos += 8;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Communauté d\'énergie bruxelloise', margin + 20, yPos);
    yPos += 6;
    
    pdf.text('info@sunisup.be • +32 471 31 71 48', margin + 20, yPos);
    yPos += 15;
    
    // Titre facture (à droite)
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('FACTURE ÉNERGÉTIQUE', pageWidth - margin - 80, margin);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${format(parseISO(invoiceData.period.startDate), 'MMMM yyyy', { locale: fr })}`, pageWidth - margin - 80, margin + 8);
    pdf.text(`Facture N° ${invoiceData.participant.ean_code?.slice(-6) || '000000'}-${format(parseISO(invoiceData.period.startDate), 'MM-yy')}`, pageWidth - margin - 80, margin + 14);
    
    // Informations du participant
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Informations du participant', margin, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Nom : ${invoiceData.participant.name}`, margin, yPos);
    yPos += 6;
    pdf.text(`Adresse : ${invoiceData.participant.address}`, margin, yPos);
    yPos += 6;
    if (invoiceData.participant.email) {
      pdf.text(`Email : ${invoiceData.participant.email}`, margin, yPos);
      yPos += 6;
    }
    pdf.text(`Code EAN : ${invoiceData.participant.ean_code}`, margin, yPos);
    yPos += 6;
    pdf.text(`Type : ${invoiceData.participant.type === 'producer' ? 'Producteur' : 'Consommateur'}`, margin, yPos);
    yPos += 6;
    if (invoiceData.participant.company_number) {
      pdf.text(`N° entreprise : ${invoiceData.participant.company_number}`, margin, yPos);
      yPos += 6;
    }
    
    // Détail énergétique
    yPos += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Détail énergétique', margin, yPos);
    yPos += 10;
    
    // Consommation
    pdf.setFillColor(239, 246, 255); // bg-blue-50
    pdf.rect(margin, yPos, contentWidth/2 - 5, 40, 'F');
    pdf.setDrawColor(191, 219, 254); // border-blue-200
    pdf.rect(margin, yPos, contentWidth/2 - 5, 40);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 58, 138); // text-blue-900
    pdf.text('Consommation', margin + 5, yPos + 8);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 64, 175); // text-blue-800
    pdf.text(`Énergie partagée : ${(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh`, margin + 5, yPos + 16);
    pdf.text(`Énergie réseau (achat au fournisseur) : ${(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh`, margin + 5, yPos + 24);
    pdf.setFontSize(8);
    pdf.setTextColor(37, 99, 235); // text-blue-600
    pdf.text('* Énergie réseau : indicatif, non facturée par Sun Is Up', margin + 5, yPos + 32);
    
    // Injection
    pdf.setFillColor(255, 251, 235); // bg-amber-50
    pdf.rect(margin + contentWidth/2 + 5, yPos, contentWidth/2 - 5, 40, 'F');
    pdf.setDrawColor(252, 211, 77); // border-amber-200
    pdf.rect(margin + contentWidth/2 + 5, yPos, contentWidth/2 - 5, 40);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(146, 64, 14); // text-amber-900
    pdf.text('Injection', margin + contentWidth/2 + 10, yPos + 8);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(146, 64, 14); // text-amber-800
    pdf.text(`Injection partagée : ${(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh`, margin + contentWidth/2 + 10, yPos + 16);
    pdf.text(`Injection réseau : ${(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh`, margin + contentWidth/2 + 10, yPos + 24);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(146, 64, 14);
    pdf.text(`Total injection : ${((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh`, margin + contentWidth/2 + 10, yPos + 32);
    
    // Page 2 - Commencer nouvelle page
    pdf.addPage();
    yPos = margin;
    
    // En-tête page 2
    pdf.setFillColor(251, 191, 36);
    pdf.rect(margin, yPos - 5, 15, 15, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('SUN', margin + 2, yPos + 2);
    pdf.text('IS UP', margin + 1, yPos + 6);
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Sun Is Up ASBL - Facture Énergétique (Page 2/2)', margin + 20, yPos + 5);
    yPos += 20;
    
    // Détail des coûts réseau
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Détail des coûts réseau', margin, yPos);
    yPos += 15;
    
    // Tableau des coûts réseau
    const networkCosts = [
      ['Description', 'Taux TVA', 'Montant HTVA', 'Montant TVAC'],
      ['Utilisation du réseau', '21%', `${invoiceData.totals.networkCosts.utilisationReseau.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.utilisationReseau * 1.21).toFixed(2)} €`],
      ['Surcharges', '21%', `${invoiceData.totals.networkCosts.surcharges.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.surcharges * 1.21).toFixed(2)} €`],
      ['Tarif capacitaire', '21%', `${invoiceData.totals.networkCosts.tarifCapacitaire.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.tarifCapacitaire * 1.21).toFixed(2)} €`],
      ['Tarif mesure & comptage', '21%', `${invoiceData.totals.networkCosts.tarifMesure.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.tarifMesure * 1.21).toFixed(2)} €`],
      ['Tarif OSP', '21%', `${invoiceData.totals.networkCosts.tarifOSP.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.tarifOSP * 1.21).toFixed(2)} €`],
      ['Transport ELIA', '21%', `${invoiceData.totals.networkCosts.transportELIA.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.transportELIA * 1.21).toFixed(2)} €`],
      ['Redevance voirie', '21%', `${invoiceData.totals.networkCosts.redevanceVoirie.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.redevanceVoirie * 1.21).toFixed(2)} €`],
      ['TOTAL COÛTS RÉSEAU', '21%', `${invoiceData.totals.networkCosts.totalFraisReseau.toFixed(2)} €`, `${(invoiceData.totals.networkCosts.totalFraisReseau * 1.21).toFixed(2)} €`]
    ];
    
    // En-tête du tableau
    pdf.setFillColor(249, 250, 251); // bg-gray-50
    pdf.rect(margin, yPos, contentWidth, 8, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, yPos, contentWidth, 8);
    
    const colWidths = [80, 30, 40, 40];
    let xPos = margin;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    
    networkCosts[0].forEach((header, index) => {
      pdf.text(header, xPos + 2, yPos + 5);
      if (index < colWidths.length - 1) {
        pdf.line(xPos + colWidths[index], yPos, xPos + colWidths[index], yPos + 8);
      }
      xPos += colWidths[index];
    });
    
    yPos += 8;
    
    // Lignes du tableau
    networkCosts.slice(1).forEach((row, rowIndex) => {
      const isLastRow = rowIndex === networkCosts.length - 2;
      
      if (isLastRow) {
        pdf.setFillColor(229, 231, 235); // bg-gray-200 pour la ligne totale
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
      }
      
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, yPos, contentWidth, 8);
      
      xPos = margin;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', isLastRow ? 'bold' : 'normal');
      pdf.setTextColor(0, 0, 0);
      
      row.forEach((cell, index) => {
        const textAlign = index > 1 ? 'right' : 'left';
        const textX = textAlign === 'right' ? xPos + colWidths[index] - 2 : xPos + 2;
        pdf.text(cell, textX, yPos + 5, { align: textAlign });
        
        if (index < colWidths.length - 1) {
          pdf.line(xPos + colWidths[index], yPos, xPos + colWidths[index], yPos + 8);
        }
        xPos += colWidths[index];
      });
      
      yPos += 8;
    });
    
    yPos += 15;
    
    // Récapitulatif financier
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Récapitulatif financier', margin, yPos);
    yPos += 15;
    
    const financialData = [
      ['Description', 'Taux TVA', 'Montant HTVA', 'Montant TVAC'],
      [`Énergie partagée (${(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh)`, `${(invoiceData.calculations.vatRate * 100).toFixed(0)}%`, `${invoiceData.calculations.energySharedCostHTVA.toFixed(2)} €`, `${invoiceData.calculations.energySharedCostTVAC.toFixed(2)} €`],
      ['Coûts réseau', '21%', `${invoiceData.calculations.networkCostTotal.toFixed(2)} €`, `${invoiceData.calculations.networkCostTVAC.toFixed(2)} €`],
      ['SOUS-TOTAL COÛTS', '-', '-', `${invoiceData.calculations.totalCostTVAC.toFixed(2)} €`],
      [`Revenus injection (${((invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000).toFixed(3)} MWh)`, '-', `-${invoiceData.calculations.injectionRevenue.toFixed(2)} €`, `-${invoiceData.calculations.injectionRevenue.toFixed(2)} €`],
      ['MONTANT NET À PAYER', '-', '-', `${invoiceData.calculations.netAmount.toFixed(2)} €`]
    ];
    
    // En-tête du tableau financier
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, yPos, contentWidth, 8, 'F');
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(margin, yPos, contentWidth, 8);
    
    xPos = margin;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    
    financialData[0].forEach((header, index) => {
      pdf.text(header, xPos + 2, yPos + 5);
      if (index < colWidths.length - 1) {
        pdf.line(xPos + colWidths[index], yPos, xPos + colWidths[index], yPos + 8);
      }
      xPos += colWidths[index];
    });
    
    yPos += 8;
    
    // Lignes du tableau financier
    financialData.slice(1).forEach((row, rowIndex) => {
      const isSubTotal = rowIndex === 2;
      const isTotal = rowIndex === financialData.length - 2;
      
      if (isSubTotal) {
        pdf.setFillColor(219, 234, 254); // bg-blue-50
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
      } else if (isTotal) {
        pdf.setFillColor(255, 243, 199); // bg-amber-100
        pdf.rect(margin, yPos, contentWidth, 8, 'F');
      }
      
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(margin, yPos, contentWidth, 8);
      
      xPos = margin;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', isTotal ? 'bold' : 'normal');
      pdf.setTextColor(0, 0, 0);
      
      row.forEach((cell, index) => {
        const textAlign = index > 1 ? 'right' : 'left';
        const textX = textAlign === 'right' ? xPos + colWidths[index] - 2 : xPos + 2;
        pdf.text(cell, textX, yPos + 5, { align: textAlign });
        
        if (index < colWidths.length - 1) {
          pdf.line(xPos + colWidths[index], yPos, xPos + colWidths[index], yPos + 8);
        }
        xPos += colWidths[index];
      });
      
      yPos += 8;
    });
    
    yPos += 15;
    
    // Conditions de paiement
    pdf.setFillColor(249, 250, 251); // bg-gray-100
    pdf.rect(margin, yPos, contentWidth, 25, 'F');
    pdf.setDrawColor(156, 163, 175); // border-gray-400
    pdf.rect(margin, yPos, contentWidth, 25);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Conditions de paiement', margin + 5, yPos + 8);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81); // text-gray-700
    const dueDate = format(addDays(new Date(), 30), 'dd/MM/yyyy', { locale: fr });
    pdf.text(`• Date limite de paiement : ${dueDate}`, margin + 5, yPos + 14);
    pdf.text('• Virement bancaire : BE96 0020 1192 6005', margin + 5, yPos + 18);
    pdf.text(`• Communication : ${invoiceData.participant.ean_code?.slice(-6) || '000000'}-${format(parseISO(invoiceData.period.startDate), 'MM-yy')}`, margin + 5, yPos + 22);
    
    return pdf;
  };

  const handleDownload = () => {
    try {
      setSaving(true);
      
      const pdf = generatePDF();
      const fileName = `Facture_${invoiceData.participant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${invoiceData.period.startMonth}${invoiceData.period.startMonth !== invoiceData.period.endMonth ? '_' + invoiceData.period.endMonth : ''}.pdf`;
      pdf.save(fileName);
      
      toast.success('Facture PDF téléchargée avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
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

      // Sauvegarder en base
      const { error: updateError } = await supabase
        .from('participants')
        .update({ billing_data: updatedBillingData })
        .eq('id', invoiceData.participant.id);

      if (updateError) {
        throw new Error(`Erreur lors de la sauvegarde: ${updateError.message}`);
      }

      toast.success('Facture enregistrée avec succès dans le dashboard du participant');
      
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
                <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-20 w-20 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                  <p className="text-gray-700">Communauté d'énergie bruxelloise</p>
                </div>
              </div>
                <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-20 w-20 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                  <p className="text-gray-700">Communauté d'énergie bruxelloise</p>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  info@sunisup.be • +32 471 31 71 48
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-2">FACTURE ÉNERGÉTIQUE</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="flex items-center justify-start md:justify-end space-x-2">
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
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-700" />
              Informations du participant
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-800">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consommation */}
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">📥 Consommation</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Énergie partagée :</span>
                    <span className="font-medium">{(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                    <span>Énergie réseau (achat au fournisseur) :</span>
                    <span className="font-medium text-blue-600">{(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh</span>
                  </div>
                  <div className="text-xs text-blue-600 italic mt-2 p-2 bg-blue-100 rounded">
                    * Énergie réseau : indicatif, non facturée par Sun Is Up
                  </div>
                </div>
              </div>

              {/* Injection */}
              <div className="bg-amber-50 p-6 rounded-lg border border-amber-200">
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
                  <div className="flex justify-between border-t border-amber-300 pt-2 mt-2 font-semibold text-amber-900 bg-amber-100 p-2 rounded">
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
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

            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
                      Taux TVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-r border-gray-300">
                      Montant HTVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      Montant TVAC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                  <tr className="bg-gray-100 border-t-2 border-gray-400">
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
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 border-r border-gray-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-r border-gray-300">
                      Taux TVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-r border-gray-300">
                      Montant HTVA
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      Montant TVAC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                  <tr className="border-b-2 border-gray-400 bg-blue-50 font-semibold">
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
  );
}