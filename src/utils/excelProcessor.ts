import * as XLSX from 'xlsx';

export class ExcelProcessor {
  /**
   * Traite un fichier Excel mensuel avec timeout et approche simplifiée
   */
  static async processExcelFile(
    file: File,
    participantMapping: { [ean_code: string]: { name: string; type: 'producer' | 'consumer'; id: string } },
    onProgress?: (progress: string, percentage: number) => void
  ): Promise<{
    success: boolean;
    data?: any;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🚀 DÉBUT IMPORT SIMPLIFIÉ');
      console.log('📁 Fichier:', file.name, 'Taille:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      onProgress?.('Lecture du fichier...', 10);

      // Timeout pour éviter les blocages
      const TIMEOUT_MS = 30000; // 30 secondes max

      // Lecture du fichier avec timeout
      const buffer = await Promise.race([
        this.readFileAsBuffer(file),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Lecture du fichier trop longue')), TIMEOUT_MS)
        )
      ]);

      console.log('✅ Fichier lu, taille buffer:', buffer.byteLength);
      onProgress?.('Analyse Excel...', 30);

      // Lecture Excel avec timeout
      const workbook = await Promise.race([
        this.parseExcelBuffer(buffer),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Analyse Excel trop longue')), TIMEOUT_MS)
        )
      ]);

      console.log('✅ Excel analysé, feuilles:', workbook.SheetNames);
      onProgress?.('Extraction des données...', 50);

      // Extraction des données avec timeout
      const jsonData = await Promise.race([
        this.extractDataFromWorkbook(workbook),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Extraction des données trop longue')), TIMEOUT_MS)
        )
      ]);

      console.log('✅ Données extraites, lignes:', jsonData.length);
      onProgress?.('Traitement des participants...', 70);

      // Traitement des participants avec timeout
      const result = await Promise.race([
        this.processParticipants(jsonData, participantMapping, file.name, onProgress),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Traitement des participants trop long')), TIMEOUT_MS)
        )
      ]);

      console.log('✅ IMPORT TERMINÉ AVEC SUCCÈS');
      onProgress?.('Import terminé !', 100);

      return { success: true, data: result, errors, warnings };

    } catch (error: any) {
      console.error('❌ ERREUR IMPORT:', error.message);
      errors.push(`Erreur: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Lit le fichier comme ArrayBuffer
   */
  private static readFileAsBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      console.log('📖 Début lecture fichier...');
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          console.log('✅ Fichier lu, taille:', result.byteLength);
          resolve(result);
        } else {
          reject(new Error('Résultat de lecture invalide'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.onabort = () => reject(new Error('Lecture annulée'));
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parse le buffer Excel
   */
  private static async parseExcelBuffer(buffer: ArrayBuffer): Promise<XLSX.WorkBook> {
    console.log('📋 Début analyse Excel...');
    
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        raw: false
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Aucune feuille trouvée');
      }
      
      console.log('✅ Excel analysé:', workbook.SheetNames.length, 'feuille(s)');
      return workbook;
      
    } catch (error: any) {
      console.error('❌ Erreur analyse Excel:', error);
      throw new Error(`Impossible d'analyser le fichier Excel: ${error.message}`);
    }
  }

  /**
   * Extrait les données de la première feuille
   */
  private static async extractDataFromWorkbook(workbook: XLSX.WorkBook): Promise<any[][]> {
    console.log('📊 Début extraction données...');
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Impossible d'accéder à la feuille: ${sheetName}`);
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: ''
    });
    
    if (!jsonData || jsonData.length < 2) {
      throw new Error('Fichier vide ou sans données');
    }
    
    console.log('✅ Données extraites:', jsonData.length, 'lignes');
    console.log('📋 En-têtes:', jsonData[0]);
    
    return jsonData as any[][];
  }

  /**
   * Traite les participants de manière simplifiée
   */
  private static async processParticipants(
    jsonData: any[][],
    participantMapping: any,
    filename: string,
    onProgress?: (progress: string, percentage: number) => void
  ): Promise<any> {
    console.log('👥 Début traitement participants...');
    
    const headers = jsonData[0] as string[];
    console.log('📋 En-têtes:', headers);
    
    // Trouver la colonne EAN
    const eanIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('ean')
    );
    
    if (eanIndex === -1) {
      throw new Error('Colonne EAN non trouvée');
    }
    
    console.log('🔍 Colonne EAN trouvée à l\'index:', eanIndex);
    
    const participantData: { [ean: string]: any } = {};
    const unknownEans = new Set<string>();
    let totalRowsProcessed = 0;
    let validRowsImported = 0;
    
    // Traiter maximum 100 lignes pour éviter les blocages
    const maxRows = Math.min(jsonData.length, 100);
    console.log('📊 Traitement de', maxRows - 1, 'lignes de données');
    
    for (let i = 1; i < maxRows; i++) {
      const row = jsonData[i] as any[];
      
      if (!row || row.length === 0) continue;
      
      totalRowsProcessed++;
      
      // Mettre à jour le progrès
      if (i % 10 === 0) {
        const progress = 70 + (i / maxRows) * 20;
        onProgress?.(`Traitement ligne ${i}/${maxRows}...`, progress);
      }
      
      const eanRaw = row[eanIndex];
      if (!eanRaw) continue;
      
      const eanCode = String(eanRaw).trim();
      
      if (participantMapping[eanCode]) {
        participantData[eanCode] = {
          ...participantMapping[eanCode],
          data: {
            volume_complementaire: 0,
            volume_partage: 0,
            injection_complementaire: 0,
            injection_partagee: 0
          }
        };
        validRowsImported++;
      } else {
        unknownEans.add(eanCode);
      }
    }
    
    const month = this.extractMonthFromFilename(filename);
    
    const result = {
      month,
      participants: participantData,
      stats: {
        totalRowsProcessed,
        validRowsImported,
        participantsFound: Object.keys(participantData).length,
        unknownEansSkipped: unknownEans.size,
        participantsUpdated: Object.keys(participantData).length,
        mesuresCount: validRowsImported
      },
      totals: {
        total_volume_complementaire: 0,
        total_volume_partage: 0,
        total_injection_complementaire: 0,
        total_injection_partagee: 0
      },
      upload_date: new Date().toISOString(),
      filename
    };
    
    console.log('✅ Traitement terminé:', result.stats);
    
    // Sauvegarder dans localStorage
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      monthlyData[month] = result;
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('💾 Données sauvegardées dans localStorage');
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde localStorage:', error);
    }
    
    return result;
  }

  /**
   * Extrait le mois à partir du nom du fichier
   */
  private static extractMonthFromFilename(filename: string): string {
    try {
      console.log('🔍 Extraction du mois depuis:', filename);
      
      const monthMatch = filename.match(/([A-Z]{3})(\d{4})/i);
      if (monthMatch) {
        const [, monthAbbr, year] = monthMatch;
        console.log('📅 Mois trouvé:', monthAbbr, 'Année:', year);
        
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'AVR': '04',
          'MAY': '05', 'MAI': '05', 'JUN': '06', 'JUL': '07', 'AOU': '08', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[monthAbbr.toUpperCase()];
        console.log('🔍 Mapping:', monthAbbr.toUpperCase(), '->', monthNum);
        if (monthNum) {
          const result = `${year}-${monthNum}`;
          console.log('✅ Mois final:', result);
          return result;
        }
      }
      
      const now = new Date();
      const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('⚠️ Aucun pattern trouvé, fallback:', fallback);
      return fallback;
    } catch (error) {
      const now = new Date();
      const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('❌ Erreur extraction, fallback:', fallback);
      return fallback;
    }
  }

  /**
   * Génère un template Excel d'exemple
   */
  static generateTemplate() {
    const templateData = [
      ['FromDate (Inclu)', 'ToDate (Exclu)', 'EAN', 'Compteur', 'Partage', 'Registre', 'Volume Partagé (kWh)', 'Volume Complémentaire (kWh)', 'Injection Partagée (kWh)', 'Injection Résiduelle (kWh)'],
      ['1-avr-25', '1-mai-25', '541448000000000001', '1SAG1100', 'ES_TOUR_ET_TAXIS', 'HI', '23,39882797', '18,59517203', '0', '0'],
      ['1-avr-25', '1-mai-25', '541448000000000001', '1SAG1100', 'ES_TOUR_ET_TAXIS', 'LOW', '12,55930924', '37,28169076', '0', '0'],
      ['1-avr-25', '1-mai-25', '541448000000000002', '1SAG1100', 'ES_TOUR_ET_TAXIS', 'HI', '36,92423176', '33,28376824', '15,5', '8,2'],
      ['1-avr-25', '1-mai-25', '541448000000000002', '1SAG1100', 'ES_TOUR_ET_TAXIS', 'LOW', '23,67788895', '38,45611105', '12,3', '6,7']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    ws['!cols'] = [
      { width: 15 }, { width: 15 }, { width: 20 }, { width: 12 }, 
      { width: 20 }, { width: 10 }, { width: 20 }, { width: 25 }, 
      { width: 20 }, { width: 25 }
    ];
    
    XLSX.writeFile(wb, 'template-import-mensuel.xlsx');
  }
}