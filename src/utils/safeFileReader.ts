export class SafeFileReader {
  /**
   * Version ultra-simplifiée qui ne peut pas crasher
   */
  static async readFileSafely(file: File, onLog: (log: string) => void): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      onLog('🚀 DÉBUT LECTURE SÉCURISÉE');
      onLog(`📁 Fichier: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      // Étape 1: Lecture très basique
      onLog('📖 Lecture du fichier...');
      const buffer = await this.readFileBuffer(file);
      onLog(`✅ Buffer lu: ${buffer.byteLength} bytes`);

      // Étape 2: Import XLSX avec timeout
      onLog('📊 Import XLSX...');
      const XLSX = await import('xlsx');
      onLog('✅ XLSX importé');

      // Étape 3: Lecture avec options minimales
      onLog('📋 Lecture workbook...');
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: false,
        cellNF: false,
        raw: true
      });
      onLog(`✅ Workbook lu: ${workbook.SheetNames.length} feuille(s)`);

      if (!workbook.SheetNames.length) {
        throw new Error('Aucune feuille trouvée');
      }

      // Étape 4: Extraction des données (LIMITÉE)
      const sheetName = workbook.SheetNames[0];
      onLog(`📄 Feuille sélectionnée: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
        defval: ''
      });

      onLog(`📊 Données extraites: ${jsonData.length} lignes`);
      
      if (jsonData.length < 2) {
        throw new Error('Fichier vide ou sans données');
      }

      const headers = jsonData[0] as string[];
      onLog(`📋 HEADERS TROUVÉS: ${JSON.stringify(headers)}`);

      // Limiter à 50 lignes pour éviter les crashes
      const limitedData = jsonData.slice(0, Math.min(51, jsonData.length)); // 1 header + 50 lignes max
      onLog(`⚠️ LIMITATION: Traitement de ${limitedData.length - 1} lignes sur ${jsonData.length - 1} disponibles`);

      // Étape 5: Analyse des colonnes
      const eanIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('ean')
      );
      onLog(`🔍 Index colonne EAN: ${eanIndex} (${eanIndex >= 0 ? headers[eanIndex] : 'NON TROUVÉE'})`);

      const volumePartageIndex = headers.findIndex(h => {
        const header = String(h).toLowerCase();
        return header.includes('partagé') && header.includes('volume');
      });
      onLog(`🔍 Index Volume Partagé: ${volumePartageIndex} (${volumePartageIndex >= 0 ? headers[volumePartageIndex] : 'NON TROUVÉE'})`);

      const volumeComplementaireIndex = headers.findIndex(h => {
        const header = String(h).toLowerCase();
        return header.includes('complémentaire') && header.includes('volume');
      });
      onLog(`🔍 Index Volume Complémentaire: ${volumeComplementaireIndex} (${volumeComplementaireIndex >= 0 ? headers[volumeComplementaireIndex] : 'NON TROUVÉE'})`);

      // Étape 6: Examiner les 3 premières lignes de données
      onLog('🔍 EXAMEN DES PREMIÈRES LIGNES:');
      for (let i = 1; i <= Math.min(3, limitedData.length - 1); i++) {
        const row = limitedData[i] as any[];
        onLog(`📋 LIGNE ${i}: ${JSON.stringify(row)}`);
        
        if (eanIndex >= 0) {
          onLog(`  📍 EAN (index ${eanIndex}): "${row[eanIndex]}"`);
        }
        if (volumePartageIndex >= 0) {
          onLog(`  📍 Volume Partagé (index ${volumePartageIndex}): "${row[volumePartageIndex]}"`);
        }
        if (volumeComplementaireIndex >= 0) {
          onLog(`  📍 Volume Complémentaire (index ${volumeComplementaireIndex}): "${row[volumeComplementaireIndex]}"`);
        }
      }

      onLog('✅ LECTURE TERMINÉE SANS CRASH');

      return {
        success: true,
        data: {
          headers,
          rows: limitedData.slice(1), // Sans les headers
          totalRows: limitedData.length - 1,
          originalTotalRows: jsonData.length - 1
        }
      };

    } catch (error: any) {
      onLog(`❌ ERREUR: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private static readFileBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Erreur lecture buffer'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur FileReader'));
      reader.readAsArrayBuffer(file);
    });
  }
}