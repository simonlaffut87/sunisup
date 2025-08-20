export interface BillingData {
  // Informations client
  client: {
    name: string;
    address: string;
    ean_code: string;
    email?: string;
    entry_date?: string;
  };
  
  // Coûts réseau (colonnes Excel)
  network_costs: {
    utilisation_reseau_htva: number;        // Utilisation du réseau € HTVA
    surcharges_htva: number;                // Surcharges € HTVA
    tarif_capacite_htva: number;            // Tarif capac. (>2020) € HTVA
    tarif_mesure_comptage_htva: number;     // Tarif mesure & comptage € HTVA
    tarif_osp_htva: number;                 // Tarif OSP € HTVA
    transport_elia_htva: number;            // Transport - coût ELIA € HTVA
    redevance_voirie_htva: number;          // Redevance de voirie € HTVA
    gridfee_htva: number;                   // Gridfee € HTVA
  };
  
  // Données mensuelles
  monthly_data: {
    [month: string]: {
      volume_partage: number;
      volume_complementaire: number;
      injection_partagee: number;
      injection_complementaire: number;
      
      // Calculs de facturation
      cout_volume_partage: number;
      cout_volume_complementaire: number;
      remuneration_injection_partagee: number;
      remuneration_injection_complementaire: number;
      
      // Totaux
      total_couts: number;
      total_remunerations: number;
      solde_mensuel: number;
    };
  };
  
  // Paramètres de facturation
  billing_params: {
    prix_volume_partage: number;            // €/kWh
    prix_volume_complementaire: number;     // €/kWh
    prix_injection_partagee: number;       // €/kWh
    prix_injection_complementaire: number; // €/kWh
    tva_rate: number;                       // %
  };
  
  // Métadonnées
  metadata: {
    last_updated: string;
    billing_period_start?: string;
    billing_period_end?: string;
    invoice_number?: string;
  };
}

export interface InvoiceData {
  participant: {
    id: string;
    name: string;
    address: string;
    ean_code: string;
    email?: string;
    type: 'producer' | 'consumer';
  };
  
  billing_period: {
    start_date: string;
    end_date: string;
    months: string[];
  };
  
  energy_data: {
    total_volume_partage: number;
    total_volume_complementaire: number;
    total_injection_partagee: number;
    total_injection_complementaire: number;
  };
  
  costs: {
    volume_partage: number;
    volume_complementaire: number;
    network_costs: number;
    total_costs: number;
  };
  
  revenues: {
    injection_partagee: number;
    injection_complementaire: number;
    total_revenues: number;
  };
  
  final_amount: {
    subtotal: number;
    tva: number;
    total_ttc: number;
  };
  
  invoice_details: {
    invoice_number: string;
    issue_date: string;
    due_date: string;
  };
}