import { BillingData, InvoiceData } from '../types/billing';
import { Database } from '../types/supabase';

type Participant = Database['public']['Tables']['participants']['Row'];

export class BillingCalculator {
  // Tarifs par défaut (peuvent être configurés)
  private static DEFAULT_RATES = {
    prix_volume_partage: 0.10,           // €/kWh - Prix communauté
    prix_volume_complementaire: 0.25,    // €/kWh - Prix marché
    prix_injection_partagee: 0.08,       // €/kWh - Rémunération injection communauté
    prix_injection_complementaire: 0.05, // €/kWh - Rémunération injection réseau
    tva_rate: 21                          // %
  };

  /**
   * Calcule les données de facturation pour un participant
   */
  static calculateBillingData(
    participant: Participant,
    monthlyData: any,
    networkCosts: BillingData['network_costs']
  ): BillingData {
    const billingData: BillingData = {
      client: {
        name: participant.name,
        address: participant.address,
        ean_code: participant.ean_code || '',
        email: participant.email || undefined,
        entry_date: participant.entry_date || undefined
      },
      network_costs: networkCosts,
      monthly_data: {},
      billing_params: this.DEFAULT_RATES,
      metadata: {
        last_updated: new Date().toISOString()
      }
    };

    // Calculer les données mensuelles
    Object.entries(monthlyData || {}).forEach(([month, data]: [string, any]) => {
      const monthlyBilling = this.calculateMonthlyBilling(data, this.DEFAULT_RATES);
      billingData.monthly_data[month] = monthlyBilling;
    });

    return billingData;
  }

  /**
   * Calcule la facturation pour un mois donné
   */
  private static calculateMonthlyBilling(
    monthData: any,
    rates: BillingData['billing_params']
  ) {
    const volume_partage = monthData.volume_partage || 0;
    const volume_complementaire = monthData.volume_complementaire || 0;
    const injection_partagee = monthData.injection_partagee || 0;
    const injection_complementaire = monthData.injection_complementaire || 0;

    // Calculs des coûts
    const cout_volume_partage = volume_partage * rates.prix_volume_partage;
    const cout_volume_complementaire = volume_complementaire * rates.prix_volume_complementaire;

    // Calculs des rémunérations
    const remuneration_injection_partagee = injection_partagee * rates.prix_injection_partagee;
    const remuneration_injection_complementaire = injection_complementaire * rates.prix_injection_complementaire;

    // Totaux
    const total_couts = cout_volume_partage + cout_volume_complementaire;
    const total_remunerations = remuneration_injection_partagee + remuneration_injection_complementaire;
    const solde_mensuel = total_remunerations - total_couts;

    return {
      volume_partage,
      volume_complementaire,
      injection_partagee,
      injection_complementaire,
      cout_volume_partage,
      cout_volume_complementaire,
      remuneration_injection_partagee,
      remuneration_injection_complementaire,
      total_couts,
      total_remunerations,
      solde_mensuel
    };
  }

  /**
   * Génère les données de facture pour une période donnée
   */
  static generateInvoiceData(
    participant: Participant,
    billingData: BillingData,
    startMonth: string,
    endMonth: string
  ): InvoiceData {
    // Filtrer les mois dans la période
    const months = Object.keys(billingData.monthly_data)
      .filter(month => month >= startMonth && month <= endMonth)
      .sort();

    // Calculer les totaux
    let total_volume_partage = 0;
    let total_volume_complementaire = 0;
    let total_injection_partagee = 0;
    let total_injection_complementaire = 0;
    let total_costs = 0;
    let total_revenues = 0;

    months.forEach(month => {
      const monthData = billingData.monthly_data[month];
      if (monthData) {
        total_volume_partage += monthData.volume_partage;
        total_volume_complementaire += monthData.volume_complementaire;
        total_injection_partagee += monthData.injection_partagee;
        total_injection_complementaire += monthData.injection_complementaire;
        total_costs += monthData.total_couts;
        total_revenues += monthData.total_remunerations;
      }
    });

    // Calculer les coûts réseau totaux
    const network_costs_total = Object.values(billingData.network_costs)
      .reduce((sum, cost) => sum + cost, 0);

    // Calculs finaux
    const subtotal = total_revenues - total_costs - network_costs_total;
    const tva = subtotal * (billingData.billing_params.tva_rate / 100);
    const total_ttc = subtotal + tva;

    // Générer numéro de facture
    const invoice_number = this.generateInvoiceNumber(participant.id, endMonth);

    return {
      participant: {
        id: participant.id,
        name: participant.name,
        address: participant.address,
        ean_code: participant.ean_code || '',
        email: participant.email || undefined,
        type: participant.type
      },
      billing_period: {
        start_date: startMonth + '-01',
        end_date: endMonth + '-01',
        months
      },
      energy_data: {
        total_volume_partage,
        total_volume_complementaire,
        total_injection_partagee,
        total_injection_complementaire
      },
      costs: {
        volume_partage: total_volume_partage * billingData.billing_params.prix_volume_partage,
        volume_complementaire: total_volume_complementaire * billingData.billing_params.prix_volume_complementaire,
        network_costs: network_costs_total,
        total_costs: total_costs + network_costs_total
      },
      revenues: {
        injection_partagee: total_injection_partagee * billingData.billing_params.prix_injection_partagee,
        injection_complementaire: total_injection_complementaire * billingData.billing_params.prix_injection_complementaire,
        total_revenues
      },
      final_amount: {
        subtotal,
        tva,
        total_ttc
      },
      invoice_details: {
        invoice_number,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
  }

  /**
   * Génère un numéro de facture unique
   */
  private static generateInvoiceNumber(participantId: string, month: string): string {
    const year = month.split('-')[0];
    const monthNum = month.split('-')[1];
    const shortId = participantId.substring(0, 8);
    return `SIU-${year}${monthNum}-${shortId}`;
  }

  /**
   * Extrait les coûts réseau depuis les données Excel
   */
  static extractNetworkCostsFromExcel(
    excelData: any[][],
    eanCode: string
  ): BillingData['network_costs'] {
    const headers = excelData[0] || [];
    
    // Mapping des colonnes Excel vers les champs
    const columnMapping = {
      'utilisation_reseau_htva': 'Utilisation du réseau € HTVA',
      'surcharges_htva': 'Surcharges € HTVA',
      'tarif_capacite_htva': 'Tarif capac. (>2020) € HTVA',
      'tarif_mesure_comptage_htva': 'Tarif mesure & comptage € HTVA',
      'tarif_osp_htva': 'Tarif OSP € HTVA',
      'transport_elia_htva': 'Transport - coût ELIA € HTVA',
      'redevance_voirie_htva': 'Redevance de voirie € HTVA',
      'gridfee_htva': 'Gridfee € HTVA'
    };

    // Trouver les index des colonnes
    const columnIndices: { [key: string]: number } = {};
    Object.entries(columnMapping).forEach(([field, excelColumn]) => {
      const index = headers.findIndex(h => 
        String(h).toLowerCase().includes(excelColumn.toLowerCase().substring(0, 10))
      );
      if (index >= 0) {
        columnIndices[field] = index;
      }
    });

    // Trouver la ligne correspondant à l'EAN
    const eanIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('ean')
    );

    let networkCosts: BillingData['network_costs'] = {
      utilisation_reseau_htva: 0,
      surcharges_htva: 0,
      tarif_capacite_htva: 0,
      tarif_mesure_comptage_htva: 0,
      tarif_osp_htva: 0,
      transport_elia_htva: 0,
      redevance_voirie_htva: 0,
      gridfee_htva: 0
    };

    if (eanIndex >= 0) {
      // Chercher la ligne avec l'EAN correspondant
      for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        if (row && String(row[eanIndex]).trim() === eanCode) {
          // Extraire les coûts réseau
          Object.entries(columnIndices).forEach(([field, index]) => {
            const value = parseFloat(String(row[index] || '0').replace(',', '.'));
            if (!isNaN(value)) {
              (networkCosts as any)[field] = value;
            }
          });
          break;
        }
      }
    }

    return networkCosts;
  }
}