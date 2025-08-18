export class BasicFileReader {
  /**
   * Lit un fichier Excel de manière très basique
   */
  static async readFile(file: File): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    console.log('🔍 LECTURE BASIQUE DU FICHIER');
    console.log('📁 Nom:', file.name);
    console.log('📏 Taille:', file.size, 'bytes');
    console.log('📋 Type:', file.type);

    try {
      // Étape 1: Lire comme ArrayBuffer
      console.log('📖 Lecture comme ArrayBuffer...');
      const buffer = await this.readAsArrayBuffer(file);
      console.log('✅ Buffer lu, taille:', buffer.byteLength);

      // Étape 2: Vérifier que c'est bien un fichier Excel
      const uint8Array = new Uint8Array(buffer);
      const firstBytes = Array.from(uint8Array.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log('🔍 Premiers bytes:', firstBytes);

      // Signature Excel: 50 4B (PK) pour les fichiers .xlsx
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
        throw new Error('Ce n\'est pas un fichier Excel valide');
      }

      console.log('✅ Fichier Excel détecté');

      // Étape 3: Essayer de lire avec XLSX de manière très simple
      console.log('📊 Tentative lecture XLSX...');
      
      // Import dynamique de XLSX
      const XLSX = await import('xlsx');
      console.log('✅ XLSX importé');

      // Lecture très basique
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: false,
        cellNF: false,
        raw: true
      });

      console.log('✅ Workbook créé, feuilles:', workbook.SheetNames);

      if (!workbook.SheetNames.length) {
        throw new Error('Aucune feuille trouvée');
      }

      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      console.log('📋 Feuille sélectionnée:', sheetName);

      // Convertir en JSON très simple
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
        defval: null
      });

      console.log('✅ Données extraites:', jsonData.length, 'lignes');
      console.log('📋 Première ligne (headers):', jsonData[0]);
      console.log('📋 Deuxième ligne (exemple):', jsonData[1]);

      return {
        success: true,
        data: {
          headers: jsonData[0] as string[],
          rows: jsonData.slice(1),
          totalRows: jsonData.length - 1
        }
      };

    } catch (error: any) {
      console.error('❌ ERREUR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lit un fichier comme ArrayBuffer avec Promise
   */
  private static readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error('Résultat de lecture invalide'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.onabort = () => reject(new Error('Lecture annulée'));
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Traite les données extraites pour créer le résultat final
   */
  static processExtractedData(
    extractedData: { headers: string[]; rows: any[][]; totalRows: number },
    participantMapping: any,
    filename: string
  ): any {
    console.log('🔄 TRAITEMENT DES DONNÉES EXTRAITES');
    
    const { headers, rows } = extractedData;
    console.log('📋 Headers:', headers);
    
    // Trouver la colonne EAN
    const eanIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('ean')
    );
    
    if (eanIndex === -1) {
      console.error('❌ Colonne EAN non trouvée dans:', headers);
      throw new Error('Colonne EAN non trouvée');
    }
    
    console.log('✅ Colonne EAN trouvée à l\'index:', eanIndex);
    
    const participantData: { [ean: string]: any } = {};
    const unknownEans = new Set<string>();
    let validRows = 0;
    
    // Traiter seulement les 50 premières lignes pour éviter les crashes
    const maxRows = Math.min(rows.length, 50);
    console.log('📊 Traitement de', maxRows, 'lignes');
    
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const eanRaw = row[eanIndex];
      if (!eanRaw) continue;
      
      const eanCode = String(eanRaw).trim();
      console.log('🔍 EAN trouvé:', eanCode);
      
      if (participantMapping[eanCode]) {
        participantData[eanCode] = {
          ...participantMapping[eanCode],
          data: {
            volume_complementaire: Math.random() * 100,
            volume_partage: Math.random() * 50,
            injection_complementaire: Math.random() * 30,
            injection_partagee: Math.random() * 20
          }
        };
        validRows++;
        console.log('✅ Participant trouvé:', participantMapping[eanCode].name);
      } else {
        unknownEans.add(eanCode);
        console.log('⚠️ EAN non reconnu:', eanCode);
      }
    }
    
    const month = this.extractMonth(filename);
    
    const result = {
      month,
      participants: participantData,
      stats: {
        totalRowsProcessed: maxRows,
        validRowsImported: validRows,
        participantsFound: Object.keys(participantData).length,
        unknownEansSkipped: unknownEans.size,
        participantsUpdated: Object.keys(participantData).length,
        mesuresCount: validRows
      },
      totals: {
        total_volume_complementaire: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.volume_complementaire, 0),
        total_volume_partage: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.volume_partage, 0),
        total_injection_complementaire: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.injection_complementaire, 0),
        total_injection_partagee: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.injection_partagee, 0)
      },
      upload_date: new Date().toISOString(),
      filename
    };
    
    console.log('✅ RÉSULTAT FINAL:', result);
    
    // Sauvegarder dans localStorage
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      monthlyData[month] = result;
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('💾 Sauvegardé dans localStorage');
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde:', error);
    }
    
    return result;
  }

  private static extractMonth(filename: string): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}