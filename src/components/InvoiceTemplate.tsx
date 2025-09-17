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

  const handleDownload = () => {
    try {
      setSaving(true);
      
      // Générer le PDF
      const invoiceContent = document.getElementById('invoice-content');
      if (!invoiceContent) {
        toast.error('Impossible de trouver le contenu de la facture');
        setSaving(false);
        return;
      }

      // Masquer temporairement les boutons pour la capture
      const buttons = document.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      // Créer le PDF avec jsPDF directement
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Configuration des polices et couleurs
      pdf.setFont('helvetica');
      
      // PAGE 1 - En-tête et informations participant
      let yPosition = margin;
      
      // En-tête avec logo (simulé par du texte)
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text('SUN IS UP ASBL', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Communauté d\'énergie bruxelloise', margin, yPosition);
      yPosition += 6;
      pdf.text('info@sunisup.be • +32 471 31 71 48', margin, yPosition);
      
      // Titre facture à droite
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      const titleX = pageWidth - margin - 80;
      pdf.text('FACTURE ÉNERGÉTIQUE', titleX, margin);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const periodText = format(parseISO(invoiceData.period.startDate), 'MMMM yyyy', { locale: fr });
      pdf.text(periodText, titleX, margin + 8);
      
      const invoiceNumber = `${invoiceData.participant.ean_code?.slice(-6) || '000000'}-${format(parseISO(invoiceData.period.startDate), 'MM-yy')}`;
      pdf.text(`Facture N° ${invoiceNumber}`, titleX, margin + 14);
      
      yPosition += 20;
      
      // Ligne de séparation
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Informations du participant
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Informations du participant', margin, yPosition);
      yPosition += 10;
      
      // Cadre pour les infos participant
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(margin, yPosition, contentWidth, 35);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.text(`Nom : ${invoiceData.participant.name}`, margin + 5, yPosition);
      yPosition += 6;
      pdf.text(`Adresse : ${invoiceData.participant.address}`, margin + 5, yPosition);
      yPosition += 6;
      if (invoiceData.participant.email) {
        pdf.text(`Email : ${invoiceData.participant.email}`, margin + 5, yPosition);
        yPosition += 6;
      }
      
      // Colonne droite
      const rightColumnX = margin + contentWidth / 2 + 10;
      yPosition -= 18;
      pdf.text(`Code EAN : ${invoiceData.participant.ean_code}`, rightColumnX, yPosition);
      yPosition += 6;
      const typeText = invoiceData.participant.type === 'producer' ? 'Producteur' : 'Consommateur';
      pdf.text(`Type : ${typeText}`, rightColumnX, yPosition);
      yPosition += 6;
      if (invoiceData.participant.company_number) {
        pdf.text(`N° entreprise : ${invoiceData.participant.company_number}`, rightColumnX, yPosition);
      }
      
      yPosition += 25;
      
      // Détail énergétique
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Détail énergétique', margin, yPosition);
      yPosition += 10;
      
      // Consommation (gauche)
      const boxWidth = (contentWidth - 10) / 2;
      pdf.setDrawColor(59, 130, 246);
      pdf.setFillColor(239, 246, 255);
      pdf.rect(margin, yPosition, boxWidth, 30, 'FD');
      
      pdf.setFontSize(12);
      pdf.setTextColor(30, 64, 175);
      pdf.text('📥 Consommation', margin + 5, yPosition + 8);
      
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Énergie partagée : ${(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh`, margin + 5, yPosition + 16);
      pdf.text(`Énergie réseau : ${(invoiceData.totals.volume_complementaire / 1000).toFixed(3)} MWh`, margin + 5, yPosition + 22);
      
      // Injection (droite)
      const rightBoxX = margin + boxWidth + 10;
      pdf.setDrawColor(245, 158, 11);
      pdf.setFillColor(255, 251, 235);
      pdf.rect(rightBoxX, yPosition, boxWidth, 30, 'FD');
      
      pdf.setFontSize(12);
      pdf.setTextColor(146, 64, 14);
      pdf.text('📤 Injection', rightBoxX + 5, yPosition + 8);
      
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Injection partagée : ${(invoiceData.totals.injection_partagee / 1000).toFixed(3)} MWh`, rightBoxX + 5, yPosition + 16);
      pdf.text(`Injection réseau : ${(invoiceData.totals.injection_complementaire / 1000).toFixed(3)} MWh`, rightBoxX + 5, yPosition + 22);
      
      yPosition += 40;
      
      // PAGE 2 - Détail des coûts réseau
      pdf.addPage();
      yPosition = margin;
      
      // En-tête page 2
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('FACTURE ÉNERGÉTIQUE (suite)', margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${invoiceData.participant.name} - ${periodText}`, margin, yPosition);
      yPosition += 15;
      
      // Ligne de séparation
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Vérification des données billing
      if (Object.keys(invoiceData.billingData).length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(220, 38, 38);
        pdf.text('⚠ Aucune donnée de coûts réseau trouvée', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.text('Les coûts réseau n\'ont pas été importés pour cette période.', margin, yPosition);
        yPosition += 20;
      } else {
        pdf.setFontSize(10);
        pdf.setTextColor(34, 197, 94);
        pdf.text(`✓ Données de coûts réseau disponibles pour ${Object.keys(invoiceData.billingData).length} mois`, margin, yPosition);
        yPosition += 15;
      }
      
      // Détail des coûts réseau
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Détail des coûts réseau', margin, yPosition);
      yPosition += 10;
      
      // Tableau des coûts réseau
      const tableStartY = yPosition;
      const rowHeight = 8;
      const colWidths = [80, 25, 35, 35]; // Description, TVA, HTVA, TVAC
      let currentX = margin;
      
      // En-tête du tableau
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Description', margin + 2, yPosition + 5);
      pdf.text('TVA', margin + colWidths[0] + 2, yPosition + 5);
      pdf.text('HTVA', margin + colWidths[0] + colWidths[1] + 2, yPosition + 5);
      pdf.text('TVAC', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPosition + 5);
      
      yPosition += rowHeight;
      
      // Lignes du tableau
      const networkCostRows = [
        { label: 'Utilisation du réseau', value: invoiceData.totals.networkCosts.utilisationReseau },
        { label: 'Surcharges', value: invoiceData.totals.networkCosts.surcharges },
        { label: 'Tarif capacitaire', value: invoiceData.totals.networkCosts.tarifCapacitaire },
        { label: 'Tarif mesure & comptage', value: invoiceData.totals.networkCosts.tarifMesure },
        { label: 'Tarif OSP', value: invoiceData.totals.networkCosts.tarifOSP },
        { label: 'Transport ELIA', value: invoiceData.totals.networkCosts.transportELIA },
        { label: 'Redevance voirie', value: invoiceData.totals.networkCosts.redevanceVoirie }
      ];
      
      networkCostRows.forEach((row, index) => {
        // Alternance de couleur
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text(row.label, margin + 2, yPosition + 5);
        pdf.text('21%', margin + colWidths[0] + 8, yPosition + 5);
        pdf.text(`${row.value.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + 15, yPosition + 5);
        pdf.text(`${(row.value * 1.21).toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
        
        yPosition += rowHeight;
      });
      
      // Total des coûts réseau
      pdf.setFillColor(229, 231, 235);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('TOTAL COÛTS RÉSEAU', margin + 2, yPosition + 5);
      pdf.text('21%', margin + colWidths[0] + 8, yPosition + 5);
      pdf.text(`${invoiceData.totals.networkCosts.totalFraisReseau.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + 15, yPosition + 5);
      pdf.text(`${(invoiceData.totals.networkCosts.totalFraisReseau * 1.21).toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
      
      yPosition += 15;
      
      // Récapitulatif financier
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Récapitulatif financier', margin, yPosition);
      yPosition += 10;
      
      // Tableau récapitulatif
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      
      pdf.setFontSize(9);
      pdf.text('Description', margin + 2, yPosition + 5);
      pdf.text('TVA', margin + colWidths[0] + 2, yPosition + 5);
      pdf.text('HTVA', margin + colWidths[0] + colWidths[1] + 2, yPosition + 5);
      pdf.text('TVAC', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPosition + 5);
      
      yPosition += rowHeight;
      
      // Énergie partagée
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Énergie partagée', margin + 2, yPosition + 3);
      pdf.text(`${(invoiceData.totals.volume_partage / 1000).toFixed(3)} MWh × ${invoiceData.participant.shared_energy_price}€/MWh`, margin + 2, yPosition + 7);
      pdf.text(`${(invoiceData.calculations.vatRate * 100).toFixed(0)}%`, margin + colWidths[0] + 8, yPosition + 5);
      pdf.text(`${invoiceData.calculations.energySharedCostHTVA.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + 15, yPosition + 5);
      pdf.text(`${invoiceData.calculations.energySharedCostTVAC.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
      
      yPosition += rowHeight + 2;
      
      // Coûts réseau
      pdf.text('Coûts réseau', margin + 2, yPosition + 3);
      pdf.text('Frais de distribution et transport', margin + 2, yPosition + 7);
      pdf.text('21%', margin + colWidths[0] + 8, yPosition + 5);
      pdf.text(`${invoiceData.calculations.networkCostTotal.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + 15, yPosition + 5);
      pdf.text(`${invoiceData.calculations.networkCostTVAC.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
      
      yPosition += rowHeight + 2;
      
      // Sous-total
      pdf.setFillColor(239, 246, 255);
      pdf.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(30, 64, 175);
      pdf.text('SOUS-TOTAL COÛTS', margin + 2, yPosition + 5);
      pdf.text(`${invoiceData.calculations.totalCostTVAC.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
      
      yPosition += rowHeight + 2;
      
      // Revenus injection
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Revenus injection', margin + 2, yPosition + 3);
      const totalInjection = (invoiceData.totals.injection_partagee + invoiceData.totals.injection_complementaire) / 1000;
      pdf.text(`${totalInjection.toFixed(3)} MWh × ${invoiceData.participant.shared_energy_price}€/MWh`, margin + 2, yPosition + 7);
      pdf.text('-', margin + colWidths[0] + 8, yPosition + 5);
      pdf.setTextColor(34, 197, 94);
      pdf.text(`-${invoiceData.calculations.injectionRevenue.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + 15, yPosition + 5);
      pdf.text(`-${invoiceData.calculations.injectionRevenue.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 5);
      
      yPosition += rowHeight + 5;
      
      // Montant net à payer
      pdf.setFillColor(255, 243, 199);
      pdf.rect(margin, yPosition, contentWidth, rowHeight + 2, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(146, 64, 14);
      pdf.text('MONTANT NET À PAYER', margin + 2, yPosition + 6);
      pdf.setFontSize(14);
      pdf.text(`${invoiceData.calculations.netAmount.toFixed(2)} €`, margin + colWidths[0] + colWidths[1] + colWidths[2] + 15, yPosition + 6);
      
      yPosition += 25;
      
      // Conditions de paiement
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition, contentWidth, 25, 'F');
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Conditions de paiement', margin + 2, yPosition + 8);
      
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      yPosition += 12;
      pdf.text(`• Paiement à 30 jours, soit au plus tard le ${format(addDays(new Date(), 30), 'dd/MM/yyyy', { locale: fr })}`, margin + 2, yPosition);
      yPosition += 5;
      pdf.text('• Virement bancaire : BE96 0020 1192 6005', margin + 2, yPosition);
      yPosition += 5;
      pdf.text(`• Communication : ${invoiceData.participant.ean_code?.slice(-6) || '000000'}-${format(parseISO(invoiceData.period.startDate), 'MM-yy')}`, margin + 2, yPosition);
      
      // Télécharger le PDF
      const fileName = `Facture_${invoiceData.participant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${invoiceData.period.startMonth}${invoiceData.period.startMonth !== invoiceData.period.endMonth ? '_' + invoiceData.period.endMonth : ''}.pdf`;
      pdf.save(fileName);
      
      // Restaurer l'affichage des boutons
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');
      
      toast.success('Facture PDF téléchargée avec succès');
      setSaving(false);

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
                  <tr className="border-b border