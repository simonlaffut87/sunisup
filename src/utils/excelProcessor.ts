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
      console.log('📁 Début traitement fichier:', file.name);
      console.log('📊 Taille réelle du fichier:', file.size, 'bytes (', (file.size / 1024 / 1024).toFixed(2), 'MB)');
      onProgress?.('Lecture du fichier Excel...', 10);

      // Utiliser FileReader pour lire le fichier
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            console.log('📊 Buffer lu avec succès:', e.target.result.byteLength, 'bytes');
            resolve(e.target.result);
          } else {
            reject(new Error('Erreur de lecture du fichier'));
          }
        };
        reader.onerror = () => reject(new Error('Erreur FileReader'));
        reader.readAsArrayBuffer(file);
      });

      onProgress?.('Analyse du fichier...', 20);

      // Lire le workbook
      const workbook = XLSX.read(new Uint8Array(buffer), { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      console.log('📋 Feuilles trouvées:', workbook.SheetNames);

      if (!workbook.SheetNames.length) {
        errors.push('Aucune feuille trouvée dans le fichier Excel');
        return { success: false, errors, warnings };
      }

      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      console.log('📄 Feuille sélectionnée:', sheetName);

      onProgress?.('Extraction des données...', 30);

      // Convertir en JSON avec en-têtes
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        dateNF: 'dd/mm/yyyy'
      });
      console.log('📊 Lignes extraites:', jsonData.length);
      
      // Afficher les premières lignes pour debug
      console.log('📋 Premières lignes:', jsonData.slice(0, 3));

      if (jsonData.length < 2) {
        errors.push('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
        return { success: false, errors, warnings };
      }

      // Analyser les en-têtes
      const headers = jsonData[0] as string[];
      console.log('📋 En-têtes:', headers);

      // Trouver les colonnes importantes
      const eanIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('ean')
      );
      const volumePartageIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('volume') && 
        String(h).toLowerCase().includes('partag')
      );
      const volumeComplIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('volume') && 
        String(h).toLowerCase().includes('compl')
      );
      const injectionPartageIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('injection') && 
        String(h).toLowerCase().includes('partag')
      );
      const injectionResiduelleIndex = headers.findIndex(h => 
        String(h).toLowerCase().includes('injection') && 
        (String(h).toLowerCase().includes('résiduelle') || String(h).toLowerCase().includes('residuelle'))
      );

      console.log('🔍 Index des colonnes:', {
        ean: eanIndex,
        volumePartage: volumePartageIndex,
        volumeCompl: volumeComplIndex,
        injectionPartage: injectionPartageIndex,
        injectionResiduelle: injectionResiduelleIndex
      });

      if (eanIndex === -1) {
        errors.push('Colonne EAN non trouvée dans le fichier');
        return { success: false, errors, warnings };
      }

      // Extraire le mois du nom du fichier
      const month = this.extractMonthFromFilename(file.name);
      console.log('📅 Mois détecté:', month);

      onProgress?.('Traitement des données...', 50);

      // Traiter les données
      const participantData: { [ean: string]: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_residuelle: number;
      } } = {};

      const unknownEans = new Set<string>();
      let totalRowsProcessed = 0;
      let validRowsImported = 0;

      // Traiter chaque ligne de données (ignorer l'en-tête)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        
        if (!row || row.length === 0) continue;
        
        totalRowsProcessed++;

        // Extraire l'EAN
        let eanRaw = row[eanIndex];
        if (!eanRaw) continue;

        let eanCode = String(eanRaw).trim();
        
        // Nettoyer l'EAN (garder seulement les chiffres)
        const cleanEan = eanCode.replace(/[^0-9]/g, '');
        
        // Chercher le participant correspondant
        let matchedParticipant = null;
        
        // Essayer avec l'EAN original
        if (participantMapping[eanCode]) {
          matchedParticipant = participantMapping[eanCode];
        }
        // Essayer avec l'EAN nettoyé
        else if (participantMapping[cleanEan]) {
          matchedParticipant = participantMapping[cleanEan];
          eanCode = cleanEan;
        }
        // Essayer de matcher partiellement
        else {
          for (const [mappedEan, participant] of Object.entries(participantMapping)) {
            if (cleanEan.includes(mappedEan) || mappedEan.includes(cleanEan)) {
              matchedParticipant = participant;
              eanCode = mappedEan;
              break;
            }
          }
        }

        if (!matchedParticipant) {
          unknownEans.add(eanCode);
          continue;
        }

        // Initialiser les données pour ce participant
        if (!participantData[eanCode]) {
          participantData[eanCode] = {
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_residuelle: 0
          };
        }

        // Extraire et additionner les valeurs
        if (volumePartageIndex >= 0) {
          const val = this.parseNumber(row[volumePartageIndex]);
          participantData[eanCode].volume_partage += val;
        }
        
        if (volumeComplIndex >= 0) {
          const val = this.parseNumber(row[volumeComplIndex]);
          participantData[eanCode].volume_complementaire += val;
        }
        
        if (injectionPartageIndex >= 0) {
          const val = this.parseNumber(row[injectionPartageIndex]);
          participantData[eanCode].injection_partagee += val;
        }
        
        if (injectionResiduelleIndex >= 0) {
          const val = this.parseNumber(row[injectionResiduelleIndex]);
          participantData[eanCode].injection_residuelle += val;
        }

        validRowsImported++;
      }

      console.log('📊 Données traitées:', {
        totalRows: totalRowsProcessed,
        validRows: validRowsImported,
        participants: Object.keys(participantData).length,
        unknownEans: unknownEans.size
      });

      if (unknownEans.size > 0) {
        const unknownList = Array.from(unknownEans).slice(0, 5).join(', ');
        const moreCount = unknownEans.size > 5 ? ` et ${unknownEans.size - 5} autres` : '';
        warnings.push(`${unknownEans.size} EAN(s) non reconnu(s) ignoré(s): ${unknownList}${moreCount}`);
      }

      if (Object.keys(participantData).length === 0) {
        errors.push('Aucun participant reconnu dans le fichier');
        return { success: false, errors, warnings };
      }

      onProgress?.('Sauvegarde des données...', 80);

      // Mettre à jour les participants dans Supabase
      const { supabase } = await import('../lib/supabase');
      let participantsUpdated = 0;

      for (const [eanCode, data] of Object.entries(participantData)) {
        try {
          const participant = participantMapping[eanCode];
          
          // Récupérer les données actuelles du participant
          const { data: currentData, error: fetchError } = await supabase
            .from('participants')
            .select('monthly_data')
            .eq('id', participant.id)
            .single();

          if (fetchError) {
            warnings.push(`Erreur récupération ${participant.name}: ${fetchError.message}`);
            continue;
          }

          // Préparer les nouvelles données mensuelles
          let monthlyData = {};
          if (currentData?.monthly_data) {
            try {
              monthlyData = JSON.parse(currentData.monthly_data);
            } catch (e) {
              monthlyData = {};
            }
          }

          // Ajouter les données pour ce mois
          monthlyData[month] = {
            volume_partage: Math.round(data.volume_partage * 100) / 100,
            volume_complementaire: Math.round(data.volume_complementaire * 100) / 100,
            injection_partagee: Math.round(data.injection_partagee * 100) / 100,
            injection_residuelle: Math.round(data.injection_residuelle * 100) / 100,
            updated_at: new Date().toISOString()
          };

          // Mettre à jour le participant
          const { error: updateError } = await supabase
            .from('participants')
            .update({ 
              monthly_data: JSON.stringify(monthlyData),
              updated_at: new Date().toISOString()
            })
            .eq('id', participant.id);

          if (updateError) {
            warnings.push(`Erreur mise à jour ${participant.name}: ${updateError.message}`);
          } else {
            participantsUpdated++;
            console.log(`✅ ${participant.name} mis à jour`);
          }

        } catch (error: any) {
          warnings.push(`Erreur traitement ${participantMapping[eanCode]?.name}: ${error.message}`);
        }
      }

      onProgress?.('Import terminé !', 100);

      const result = {
        month,
        participants: participantData,
        stats: {
          totalRowsProcessed,
          validRowsImported,
          participantsFound: Object.keys(participantData).length,
          participantsUpdated,
          unknownEansSkipped: unknownEans.size,
          unknownEansList: Array.from(unknownEans)
        }
      };

      return { success: true, data: result, errors, warnings };

    } catch (error: any) {
      console.error('❌ Erreur critique:', error);
      errors.push(`Erreur lors du traitement: ${error.message}`);
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
    
    // Convertir en string et remplacer les virgules par des points
    const stringValue = String(value).replace(',', '.');
    const numValue = parseFloat(stringValue);
    
    return isNaN(numValue) ? 0 : Math.max(0, numValue);
  }

  /**
   * Extrait le mois à partir du nom du fichier
   */
  private static extractMonthFromFilename(filename: string): string {
    try {
      // Chercher le pattern APR2025, MAI2025, etc.
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
      
      // Fallback sur le mois actuel
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
    
    // Ajuster la largeur des colonnes
    ws['!cols'] = [
      { width: 15 }, // FromDate
      { width: 15 }, // ToDate  
      { width: 20 }, // EAN
      { width: 12 }, // Compteur
      { width: 20 }, // Partage
      { width: 10 }, // Registre
      { width: 20 }, // Volume Partagé
      { width: 25 }, // Volume Complémentaire
      { width: 20 }, // Injection Partagée
      { width: 25 }  // Injection Résiduelle
    ];
    
    XLSX.writeFile(wb, 'template-import-mensuel.xlsx');
  }
}