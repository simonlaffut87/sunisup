import * as XLSX from 'xlsx';

export interface ProcessedData {
  ean: string;
  data: Record<string, any>;
}

export class ExcelProcessor {
  static async processFile(file: File): Promise<ProcessedData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          const processed: ProcessedData[] = jsonData.map((row: any) => ({
            ean: row.EAN || row.ean || '',
            data: row
          }));

          resolve(processed);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  static async validateFile(file: File): Promise<boolean> {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  static extractEANs(data: ProcessedData[]): string[] {
    return data.map(item => item.ean).filter(Boolean);
  }
}
