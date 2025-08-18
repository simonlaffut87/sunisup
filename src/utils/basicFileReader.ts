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
  static async processExtractedData(
    extractedData: { headers: string[]; rows: any[][]; totalRows: number },
    participantMapping: any,
    filename: string
  ): Promise<any> {
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
    
    // Structure pour grouper les données par EAN (HIGH + LOW)
    const eanGroups: { [ean: string]: {
      info: any;
      high: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_complementaire: number;
      };
      low: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_complementaire: number;
      };
    } } = {};
    
    const unknownEans = new Set<string>();
    let processedRows = 0;
    
    // Étape 1: Grouper toutes les lignes par EAN et registre (HIGH/LOW)
    const maxRows = rows.length;
    console.log('📊 Groupement de', maxRows, 'lignes par EAN...');
    
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const eanRaw = row[eanIndex];
      if (!eanRaw) continue;
      
      const eanCode = String(eanRaw).trim();
      const registre = String(row[registreIndex] || '').trim().toUpperCase();
      
      if (participantMapping[eanCode]) {
        // Initialiser le groupe pour ce participant si nécessaire
        if (!eanGroups[eanCode]) {
          eanGroups[eanCode] = {
            info: participantMapping[eanCode],
            high: {
              volume_partage: 0,
              volume_complementaire: 0,
              injection_partagee: 0,
              injection_complementaire: 0
            },
            low: {
              volume_partage: 0,
              volume_complementaire: 0,
              injection_partagee: 0,
              injection_complementaire: 0
            }
          };
        }
        
        // Extraire les valeurs de la ligne
        const volumePartage = parseFloat(String(row[volumePartageIndex] || 0).replace(',', '.')) || 0;
        const volumeComplementaire = parseFloat(String(row[volumeComplementaireIndex] || 0).replace(',', '.')) || 0;
        const injectionPartage = parseFloat(String(row[injectionPartageIndex] || 0).replace(',', '.')) || 0;
        const injectionComplementaire = parseFloat(String(row[injectionComplementaireIndex] || 0).replace(',', '.')) || 0;
        
        // Assigner aux bonnes catégories HIGH ou LOW
        const target = registre === 'HI' || registre === 'HIGH' ? eanGroups[eanCode].high : eanGroups[eanCode].low;
        
        target.volume_partage += volumePartage;
        target.volume_complementaire += volumeComplementaire;
        target.injection_partagee += injectionPartage;
        target.injection_complementaire += injectionComplementaire;
        
        processedRows++;
        
        if (i % 100 === 0) {
          console.log(`📊 Ligne ${i}: EAN ${eanCode} (${registre}), VP: ${volumePartage}, VC: ${volumeComplementaire}`);
        }
      } else {
        unknownEans.add(eanCode);
      }
    }
    
    // Étape 2: Sommer HIGH + LOW pour chaque EAN
    const participantData: { [ean: string]: any } = {};
    Object.entries(eanGroups).forEach(([eanCode, group]) => {
      participantData[eanCode] = {
        ...group.info,
        data: {
          volume_complementaire: group.high.volume_complementaire + group.low.volume_complementaire,
          volume_partage: group.high.volume_partage + group.low.volume_partage,
          injection_complementaire: group.high.injection_complementaire + group.low.injection_complementaire,
          injection_partagee: group.high.injection_partagee + group.low.injection_partagee
        }
      };
      
      console.log(`✅ EAN ${eanCode} - Total: VP=${participantData[eanCode].data.volume_partage.toFixed(2)}, VC=${participantData[eanCode].data.volume_complementaire.toFixed(2)}`);
    });
    
    console.log('✅ Données accumulées par EAN:', Object.keys(participantData).length, 'participants');
    console.log('📊 Chaque participant a maintenant 4 valeurs (HIGH + LOW sommées)');
    
    const month = this.extractMonth(filename);
    console.log('📅 Mois extrait du fichier:', month, 'depuis:', filename);
    
    const result = {
      month,
      participants: participantData,
      stats: {
        totalRowsProcessed: maxRows,
        validRowsImported: processedRows,
        participantsFound: Object.keys(participantData).length,
        unknownEansSkipped: unknownEans.size,
        participantsUpdated: Object.keys(participantData).length,
        mesuresCount: Object.keys(participantData).length * 4 // 4 valeurs par participant
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
    console.log('📊 Mesures finales:', result.stats.mesuresCount, '(4 par participant)');
    
    // Sauvegarder dans localStorage ET mettre à jour la base de données
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      console.log('💾 Données existantes avant sauvegarde:', Object.keys(monthlyData));
      monthlyData[month] = result;
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('💾 Sauvegardé dans localStorage pour le mois:', month);
      console.log('💾 Données après sauvegarde:', Object.keys(monthlyData));
      
      // Mettre à jour la colonne monthly_data de chaque participant
      await this.updateParticipantsMonthlyData(result.participants, month);
      
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde:', error);
    }
    
    return result;
  }

  /**
   * Met à jour la colonne monthly_data des participants dans la base de données
   */
  private static async updateParticipantsMonthlyData(participants: any, month: string) {
    console.log('🔄 Mise à jour monthly_data pour', Object.keys(participants).length, 'participants...');
    
    // Import dynamique de supabase
    const { supabase } = await import('../lib/supabase');
    
    for (const [eanCode, participantData] of Object.entries(participants)) {
      try {
        // Trouver le participant par son EAN
        const { data: participant, error: findError } = await supabase
          .from('participants')
          .select('id, monthly_data')
          .eq('ean_code', eanCode)
          .single();
        
        if (findError || !participant) {
          console.warn(`⚠️ Participant avec EAN ${eanCode} non trouvé:`, findError);
          continue;
        }
        
        // Parser les données mensuelles existantes
        let existingMonthlyData = {};
        if (participant.monthly_data) {
          try {
            existingMonthlyData = JSON.parse(participant.monthly_data);
          } catch (e) {
            console.warn(`⚠️ Erreur parsing monthly_data existant pour ${eanCode}:`, e);
          }
        }
        
        // Ajouter/mettre à jour les données pour ce mois
        const updatedMonthlyData = {
          ...existingMonthlyData,
          [month]: {
            volume_partage: (participantData as any).data.volume_partage,
            volume_complementaire: (participantData as any).data.volume_complementaire,
            injection_partagee: (participantData as any).data.injection_partagee,
            injection_complementaire: (participantData as any).data.injection_complementaire,
            updated_at: new Date().toISOString()
          }
        };
        
        // Mettre à jour dans la base de données
        const { error: updateError } = await supabase
          .from('participants')
          .update({ 
            monthly_data: JSON.stringify(updatedMonthlyData)
          })
          .eq('id', participant.id);
        
        if (updateError) {
          console.error(`❌ Erreur mise à jour monthly_data pour ${eanCode}:`, updateError);
        } else {
          console.log(`✅ monthly_data mis à jour pour ${(participantData as any).name} (${eanCode})`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur traitement participant ${eanCode}:`, error);
      }
    }
    
    console.log('✅ Mise à jour monthly_data terminée');
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