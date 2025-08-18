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
    
    const registreIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('registre') || String(h).toLowerCase().includes('register')
    );
    
    const volumePartageIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('volume') && String(h).toLowerCase().includes('partagé')
    );
    
    const volumeComplementaireIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('volume') && String(h).toLowerCase().includes('complémentaire')
    );
    
    const injectionPartageIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('injection') && String(h).toLowerCase().includes('partagé')
    );
    
    const injectionComplementaireIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('injection') && (String(h).toLowerCase().includes('complémentaire') || String(h).toLowerCase().includes('résiduelle'))
    );
    if (eanIndex === -1) {
      console.error('❌ Colonne EAN non trouvée dans:', headers);
      throw new Error('Colonne EAN non trouvée');
    }
    
    console.log('✅ Colonnes trouvées:', {
      ean: eanIndex,
      registre: registreIndex,
      volumePartage: volumePartageIndex,
      volumeComplementaire: volumeComplementaireIndex,
      injectionPartage: injectionPartageIndex,
      injectionComplementaire: injectionComplementaireIndex
    });
    
    // Structure pour accumuler les données par EAN
    const participantAccumulator: { [ean: string]: {
      info: any;
      volume_partage: number;
      volume_complementaire: number;
      injection_partagee: number;
      injection_complementaire: number;
    } } = {};
    
    const unknownEans = new Set<string>();
    let validRows = 0;
    
    // Traiter toutes les lignes pour avoir les vraies données
    const maxRows = rows.length;
    console.log('📊 Traitement de', maxRows, 'lignes');
    
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const eanRaw = row[eanIndex];
      if (!eanRaw) continue;
      
      const eanCode = String(eanRaw).trim();
      
      if (participantMapping[eanCode]) {
        // Initialiser l'accumulateur pour ce participant si nécessaire
        if (!participantAccumulator[eanCode]) {
          participantAccumulator[eanCode] = {
            info: participantMapping[eanCode],
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_complementaire: 0
          };
        }
        
        // Extraire les valeurs de la ligne
        const volumePartage = parseFloat(String(row[volumePartageIndex] || 0).replace(',', '.')) || 0;
        const volumeComplementaire = parseFloat(String(row[volumeComplementaireIndex] || 0).replace(',', '.')) || 0;
        const injectionPartage = parseFloat(String(row[injectionPartageIndex] || 0).replace(',', '.')) || 0;
        const injectionComplementaire = parseFloat(String(row[injectionComplementaireIndex] || 0).replace(',', '.')) || 0;
        
        // Accumuler les valeurs (somme HIGH + LOW pour chaque EAN)
        participantAccumulator[eanCode].volume_partage += volumePartage;
        participantAccumulator[eanCode].volume_complementaire += volumeComplementaire;
        participantAccumulator[eanCode].injection_partagee += injectionPartage;
        participantAccumulator[eanCode].injection_complementaire += injectionComplementaire;
        
        validRows++;
        
        if (i % 100 === 0) {
          console.log(`📊 Ligne ${i}: EAN ${eanCode}, VP: ${volumePartage}, VC: ${volumeComplementaire}`);
        }
      } else {
        unknownEans.add(eanCode);
      }
    }
    
    // Convertir l'accumulateur en format final
    const participantData: { [ean: string]: any } = {};
    Object.entries(participantAccumulator).forEach(([eanCode, accumulated]) => {
      participantData[eanCode] = {
        ...accumulated.info,
        data: {
          volume_complementaire: accumulated.volume_complementaire,
          volume_partage: accumulated.volume_partage,
          injection_complementaire: accumulated.injection_complementaire,
          injection_partagee: accumulated.injection_partagee
        }
      };
    });
    
    console.log('✅ Données accumulées par EAN:', Object.keys(participantData).length, 'participants');
    
    const month = this.extractMonth(filename);
    console.log('📅 Mois extrait du fichier:', month, 'depuis:', filename);
    
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
      console.log('💾 Données existantes avant sauvegarde:', Object.keys(monthlyData));
      monthlyData[month] = result;
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('💾 Sauvegardé dans localStorage pour le mois:', month);
      console.log('💾 Données après sauvegarde:', Object.keys(monthlyData));
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde:', error);
    }
    
    return result;
  }

  private static extractMonth(filename: string): string {
    console.log('🔍 Extraction du mois depuis:', filename);
    
    try {
      // Chercher des patterns de mois dans le nom du fichier
      const patterns = [
        // Format APR2025, MAY2025, etc.
        /([A-Z]{3})(\d{4})/i,
        // Format 04-2025, 05-2025, etc.
        /(\d{1,2})-(\d{4})/,
        // Format 2025-04, 2025-05, etc.
        /(\d{4})-(\d{1,2})/,
        // Format avril, mai, etc.
        /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i
      ];
      
      // Essayer le pattern APR2025
      const monthMatch = filename.match(patterns[0]);
      if (monthMatch) {
        const [, monthAbbr, year] = monthMatch;
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[monthAbbr.toUpperCase()];
        if (monthNum) {
          const result = `${year}-${monthNum}`;
          console.log('✅ Mois extrait:', result, 'depuis pattern APR2025');
          return result;
        }
      }
      
      // Si aucun pattern trouvé, utiliser le mois actuel
      const now = new Date();
      const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('⚠️ Aucun pattern trouvé, utilisation du mois actuel:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur extraction mois:', error);
      const now = new Date();
      const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('🔄 Fallback vers mois actuel:', result);
      return result;
    }
  }
  
  /**
   * Nettoie les données mensuelles stockées
   */
  static clearMonthlyData() {
    try {
      localStorage.removeItem('monthly_data');
      console.log('🧹 Données mensuelles nettoyées');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return false;
    }
  }
  
  /**
   * Supprime un mois spécifique
   */
  static removeMonth(month: string) {
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      delete monthlyData[month];
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('🗑️ Mois supprimé:', month);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression mois:', error);
      return false;
    }
  }
}