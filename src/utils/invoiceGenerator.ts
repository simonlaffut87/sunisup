import jsPDF from 'jspdf';
import { InvoiceData } from '../types/billing';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export class InvoiceGenerator {
  /**
   * Génère une facture PDF basée sur le modèle fourni
   */
  static generateInvoicePDF(invoiceData: InvoiceData): jsPDF {
    const doc = new jsPDF();
    
    // Configuration des couleurs
    const primaryColor = [245, 158, 11]; // Amber-500
    const textColor = [55, 65, 81];      // Gray-700
    const lightGray = [243, 244, 246];   // Gray-100

    // En-tête
    this.addHeader(doc, primaryColor);
    
    // Informations facture
    this.addInvoiceInfo(doc, invoiceData, textColor);
    
    // Informations client
    this.addClientInfo(doc, invoiceData, textColor);
    
    // Tableau des consommations
    this.addEnergyTable(doc, invoiceData, primaryColor, textColor, lightGray);
    
    // Résumé des coûts
    this.addCostSummary(doc, invoiceData, primaryColor, textColor, lightGray);
    
    // Pied de page
    this.addFooter(doc, textColor);

    return doc;
  }

  private static addHeader(doc: jsPDF, primaryColor: number[]) {
    // Logo et titre (simulé)
    doc.setFillColor(...primaryColor);
    doc.rect(20, 20, 170, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Sun Is Up ASBL', 25, 35);
    
    doc.setFontSize(12);
    doc.text('Communauté d\'énergie locale', 25, 45);
  }

  private static addInvoiceInfo(doc: jsPDF, invoiceData: InvoiceData, textColor: number[]) {
    doc.setTextColor(...textColor);
    doc.setFontSize(16);
    doc.text('FACTURE', 20, 70);
    
    doc.setFontSize(10);
    doc.text(`Numéro: ${invoiceData.invoice_details.invoice_number}`, 20, 80);
    doc.text(`Date d'émission: ${format(new Date(invoiceData.invoice_details.issue_date), 'dd/MM/yyyy', { locale: fr })}`, 20, 87);
    doc.text(`Date d'échéance: ${format(new Date(invoiceData.invoice_details.due_date), 'dd/MM/yyyy', { locale: fr })}`, 20, 94);
    
    // Période de facturation
    const startMonth = format(new Date(invoiceData.billing_period.start_date), 'MMMM yyyy', { locale: fr });
    const endMonth = format(new Date(invoiceData.billing_period.end_date), 'MMMM yyyy', { locale: fr });
    doc.text(`Période: ${startMonth} - ${endMonth}`, 20, 101);
  }

  private static addClientInfo(doc: jsPDF, invoiceData: InvoiceData, textColor: number[]) {
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.text('FACTURÉ À:', 120, 70);
    
    doc.setFontSize(10);
    doc.text(invoiceData.participant.name, 120, 80);
    doc.text(invoiceData.participant.address, 120, 87);
    doc.text(`Code EAN: ${invoiceData.participant.ean_code}`, 120, 94);
    if (invoiceData.participant.email) {
      doc.text(`Email: ${invoiceData.participant.email}`, 120, 101);
    }
  }

  private static addEnergyTable(
    doc: jsPDF, 
    invoiceData: InvoiceData, 
    primaryColor: number[], 
    textColor: number[], 
    lightGray: number[]
  ) {
    let yPos = 120;
    
    // Titre du tableau
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.text('Détail de la consommation d\'électricité locale', 20, yPos);
    yPos += 15;

    // En-tête du tableau
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos, 170, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Description', 25, yPos + 5);
    doc.text('Quantité (kWh)', 100, yPos + 5);
    doc.text('Prix unitaire (€/kWh)', 130, yPos + 5);
    doc.text('Montant (€)', 165, yPos + 5);
    yPos += 10;

    // Lignes du tableau
    doc.setTextColor(...textColor);
    doc.setFillColor(...lightGray);
    
    const tableData = [
      {
        description: 'Volume partagé (communauté)',
        quantity: invoiceData.energy_data.total_volume_partage,
        unit_price: 0.10,
        amount: invoiceData.costs.volume_partage
      },
      {
        description: 'Volume complémentaire (réseau)',
        quantity: invoiceData.energy_data.total_volume_complementaire,
        unit_price: 0.25,
        amount: invoiceData.costs.volume_complementaire
      }
    ];

    // Ajouter les injections pour les producteurs
    if (invoiceData.participant.type === 'producer') {
      tableData.push(
        {
          description: 'Injection partagée (rémunération)',
          quantity: invoiceData.energy_data.total_injection_partagee,
          unit_price: -0.08,
          amount: -invoiceData.revenues.injection_partagee
        },
        {
          description: 'Injection complémentaire (rémunération)',
          quantity: invoiceData.energy_data.total_injection_complementaire,
          unit_price: -0.05,
          amount: -invoiceData.revenues.injection_complementaire
        }
      );
    }

    tableData.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.rect(20, yPos, 170, 8, 'F');
      }
      
      doc.text(row.description, 25, yPos + 5);
      doc.text(row.quantity.toFixed(2), 105, yPos + 5);
      doc.text(row.unit_price.toFixed(3), 140, yPos + 5);
      doc.text(row.amount.toFixed(2), 170, yPos + 5);
      yPos += 8;
    });
  }

  private static addCostSummary(
    doc: jsPDF, 
    invoiceData: InvoiceData, 
    primaryColor: number[], 
    textColor: number[], 
    lightGray: number[]
  ) {
    let yPos = 200;
    
    // Titre
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.text('Résumé des coûts', 20, yPos);
    yPos += 15;

    // Coûts réseau
    doc.setFontSize(10);
    doc.text('Coûts réseau et taxes:', 25, yPos);
    doc.text(`${invoiceData.costs.network_costs.toFixed(2)} €`, 170, yPos);
    yPos += 8;

    // Sous-total
    doc.setFillColor(...lightGray);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.text('Sous-total HTVA:', 25, yPos + 5);
    doc.text(`${invoiceData.final_amount.subtotal.toFixed(2)} €`, 170, yPos + 5);
    yPos += 10;

    // TVA
    doc.text('TVA (21%):', 25, yPos);
    doc.text(`${invoiceData.final_amount.tva.toFixed(2)} €`, 170, yPos);
    yPos += 8;

    // Total TTC
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('TOTAL TTC:', 25, yPos + 6);
    doc.text(`${invoiceData.final_amount.total_ttc.toFixed(2)} €`, 170, yPos + 6);
  }

  private static addFooter(doc: jsPDF, textColor: number[]) {
    doc.setTextColor(...textColor);
    doc.setFontSize(8);
    
    const footerY = 270;
    doc.text('Sun Is Up ASBL', 20, footerY);
    doc.text('Rue de la Science 14B, 1040 Bruxelles', 20, footerY + 5);
    doc.text('info@sunisup.be | +32 471 31 71 48', 20, footerY + 10);
    doc.text('BCE: 0123.456.789 | IBAN: BE12 3456 7890 1234', 20, footerY + 15);
  }

  /**
   * Sauvegarde la facture
   */
  static saveInvoice(invoiceData: InvoiceData): void {
    const doc = this.generateInvoicePDF(invoiceData);
    const filename = `facture_${invoiceData.participant.name.replace(/\s+/g, '_')}_${invoiceData.invoice_details.invoice_number}.pdf`;
    doc.save(filename);
  }

  /**
   * Génère le blob PDF pour affichage
   */
  static generateInvoiceBlob(invoiceData: InvoiceData): Blob {
    const doc = this.generateInvoicePDF(invoiceData);
    return doc.output('blob');
  }
}