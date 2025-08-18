import * as XLSX from 'xlsx';

export class ExcelProcessor {
  /**
   * Traite un fichier Excel mensuel et met à jour les participants
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
      console.log('🚀 DÉBUT PROCESSFILE');
      console.log('📁 Fichier:', file.name);
      console.log('📊 Taille fichier:', file.size, 'bytes');
      console.log('📊 Taille en MB:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('📋 Type MIME:', file.type);
      console.log('📋 Dernière modification:', file.lastModified);
      
      onProgress?.('Vérification du fichier...', 5);

      // Vérification basique du fichier
      if (!file) {
        throw new Error('Aucun fichier fourni');
      }

      if (file.size === 0) {
        throw new Error('Le fichier est vide');
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB
        throw new Error('Le fichier est trop volumineux (max 100MB)');
      }

      console.log('✅ Vérifications basiques OK');
      onProgress?.('Lecture du fichier...', 10);

      // Méthode 1: Essayer avec readAsArrayBuffer
      let buffer: ArrayBuffer;
      try {
        console.log('📖 Tentative lecture avec readAsArrayBuffer...');
        buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (event) => {
            console.log('📖 FileReader onload déclenché');
            const result = event.target?.result;
            if (result instanceof ArrayBuffer) {
              console.log('✅ ArrayBuffer reçu, taille:', result.byteLength);
              resolve(result);
            } else {
              console.error('❌ Résultat n\'est pas un ArrayBuffer:', typeof result);
              reject(new Error('Résultat de lecture invalide'));
            }
          };
          
          reader.onerror = (event) => {
            console.error('❌ Erreur FileReader:', event);
            reject(new Error('Erreur lors de la lecture du fichier'));
          };
          
          reader.onabort = () => {
            console.error('❌ Lecture annulée');
            reject(new Error('Lecture du fichier annulée'));
          };
          
          console.log('📖 Démarrage readAsArrayBuffer...');
          reader.readAsArrayBuffer(file);
        });
      } catch (readError) {
        console.error('❌ Erreur lecture fichier:', readError);
        throw new Error(`Impossible de lire le fichier: ${readError.message}`);
      }

      console.log('✅ Fichier lu avec succès');
      console.log('📊 Taille buffer:', buffer.byteLength);
      onProgress?.('Analyse du fichier Excel...', 20);

      // Tentative de lecture avec XLSX
      let workbook: XLSX.WorkBook;
      try {
        console.log('📋 Tentative lecture XLSX...');
        console.log('📋 XLSX version:', XLSX.version || 'inconnue');
        
        // Essayer plusieurs méthodes de lecture
        const uint8Array = new Uint8Array(buffer);
        console.log('📋 Uint8Array créé, taille:', uint8Array.length);
        console.log('📋 Premiers bytes:', Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16)).join(' '));
        
        workbook = XLSX.read(uint8Array, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          raw: false
        });
        
        console.log('✅ XLSX.read réussi');
      } catch (xlsxError) {
        console.error('❌ Erreur XLSX.read:', xlsxError);
        
        // Essayer avec d'autres options
        try {
          console.log('📋 Tentative avec options différentes...');
          workbook = XLSX.read(buffer, { 
            type: 'buffer',
            cellDates: false,
            raw: true
          });
          console.log('✅ XLSX.read réussi avec options alternatives');
        } catch (xlsxError2) {
          console.error('❌ Erreur XLSX.read alternative:', xlsxError2);
          throw new Error(`Impossible de lire le fichier Excel: ${xlsxError2.message}`);
        }
      }

      console.log('📋 Workbook créé');
      console.log('📋 Feuilles disponibles:', workbook.SheetNames);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Aucune feuille trouvée dans le fichier Excel');
      }

      onProgress?.('Extraction des données...', 30);

      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      console.log('📄 Feuille sélectionnée:', sheetName);
      console.log('📄 Worksheet:', worksheet ? 'OK' : 'ERREUR');

      if (!worksheet) {
        throw new Error(`Impossible d'accéder à la feuille: ${sheetName}`);
      }

      // Convertir en JSON
      let jsonData: any[][];
      try {
        console.log('📊 Conversion en JSON...');
        jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          dateNF: 'dd/mm/yyyy',
          defval: ''
        });
        console.log('✅ Conversion JSON réussie');
        console.log('📊 Nombre de lignes:', jsonData.length);
      } catch (jsonError) {
        console.error('❌ Erreur conversion JSON:', jsonError);
        throw new Error(`Erreur lors de la conversion des données: ${jsonError.message}`);
      }

      if (!jsonData || jsonData.length < 2) {
        throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
      }

      // Afficher les premières lignes pour debug
      console.log('📋 Premières lignes:');
      jsonData.slice(0, 5).forEach((row, index) => {
        console.log(`Ligne ${index}:`, row);
      });

      // Analyser les en-têtes
      const headers = jsonData[0] as string[];
      console.log('📋 En-têtes détectés:', headers);

      // Le reste du traitement...
      onProgress?.('Traitement des données...', 50);

      // Trouver les colonnes importantes
      const eanIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('ean')
      );
      
      console.log('🔍 Index EAN:', eanIndex);

      if (eanIndex === -1) {
        errors.push('Colonne EAN non trouvée dans le fichier');
        console.error('❌ Colonne EAN non trouvée');
        console.log('📋 En-têtes disponibles:', headers);
        return { success: false, errors, warnings };
      }

      // Extraire le mois du nom du fichier
      const month = this.extractMonthFromFilename(file.name);
      console.log('📅 Mois détecté:', month);

      // Traitement simplifié pour test
      const participantData: { [ean: string]: any } = {};
      const unknownEans = new Set<string>();
      let totalRowsProcessed = 0;
      let validRowsImported = 0;

      console.log('🔄 Début traitement des lignes...');
      
      // Traiter seulement les 10 premières lignes pour test
      const maxRows = Math.min(jsonData.length, 20);
      console.log('📊 Traitement de', maxRows, 'lignes pour test');

      for (let i = 1; i < maxRows; i++) {
        const row = jsonData[i] as any[];
        
        if (!row || row.length === 0) {
          console.log(`Ligne ${i}: vide, ignorée`);
          continue;
        }
        
        totalRowsProcessed++;
        console.log(`Ligne ${i}:`, row.slice(0, 5)); // Afficher les 5 premières colonnes

        // Extraire l'EAN
        const eanRaw = row[eanIndex];
        if (!eanRaw) {
          console.log(`Ligne ${i}: EAN vide`);
          continue;
        }

        const eanCode = String(eanRaw).trim();
        console.log(`Ligne ${i}: EAN = "${eanCode}"`);

        // Chercher le participant
        if (participantMapping[eanCode]) {
          console.log(`✅ Participant trouvé: ${participantMapping[eanCode].name}`);
          participantData[eanCode] = participantMapping[eanCode];
          validRowsImported++;
        } else {
          console.log(`❌ EAN non reconnu: ${eanCode}`);
          unknownEans.add(eanCode);
        }
      }

      console.log('📊 Résultats traitement:');
      console.log('- Lignes traitées:', totalRowsProcessed);
      console.log('- Lignes valides:', validRowsImported);
      console.log('- Participants trouvés:', Object.keys(participantData).length);
      console.log('- EANs inconnus:', unknownEans.size);

      onProgress?.('Finalisation...', 90);

      const result = {
        month,
        participants: participantData,
        stats: {
          totalRowsProcessed,
          validRowsImported,
          participantsFound: Object.keys(participantData).length,
          unknownEansSkipped: unknownEans.size,
          unknownEansList: Array.from(unknownEans)
        }
      };

      console.log('✅ TRAITEMENT TERMINÉ AVEC SUCCÈS');
      onProgress?.('Import terminé !', 100);

      return { success: true, data: result, errors, warnings };

    } catch (error: any) {
      console.error('❌ ERREUR CRITIQUE DANS PROCESSFILE:', error);
      console.error('❌ Stack trace:', error.stack);
      errors.push(`Erreur critique: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Parse un nombre depuis une valeur Excel
   */
  private static parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const stringValue = String(value).replace(',', '.');
    const numValue = parseFloat(stringValue);
    
    return isNaN(numValue) ? 0 : Math.max(0, numValue);
  }

  /**
   * Extrait le mois à partir du nom du fichier
   */
  private static extractMonthFromFilename(filename: string): string {
    try {
      const monthMatch = filename.match(/([A-Z]{3})(\d{4})/i);
      if (monthMatch) {
        const [, monthAbbr, year] = monthMatch;
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAI': '05', 'JUN': '06', 'JUL': '07', 'AOU': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[monthAbbr.toUpperCase()];
        if (monthNum) {
          return `${year}-${monthNum}`;
        }
      }
      
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } catch (error) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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