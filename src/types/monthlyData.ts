export interface MonthlyDataRow {
  ean_code: string;
  participant_name: string;
  participant_type: 'producer' | 'consumer';
  timestamp: string;
  volume_complementaire?: number;
  volume_partage?: number;
  injection_complementaire?: number;
  injection_partagee?: number;
}

export interface ProcessedMonthlyData {
  month: string;
  participants: {
    [ean_code: string]: {
      name: string;
      type: 'producer' | 'consumer';
      data: {
        volume_complementaire: number;
        volume_partage: number;
        injection_complementaire: number;
        injection_partagee: number;
      };
    };
  };
  totals: {
    total_volume_complementaire: number;
    total_volume_partage: number;
    total_injection_complementaire: number;
    total_injection_partagee: number;
  };
  upload_date: string;
  filename: string;
}

export interface MonthlyFileRecord {
  id: string;
  month: string; // Format: YYYY-MM
  filename: string;
  upload_date: string;
  file_size: number;
  status: 'uploaded' | 'processed' | 'error';
  data_points: number;
  participant_count: number;
  error_message?: string;
  unknown_eans: string[];
}