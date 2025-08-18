import { supabase } from '../lib/supabase';

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
      console.log('📁 Traitement du fichier:', file.name);
      onProgress?.('Lecture du fichier Excel...', 10);

      // Lire le fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const { default: XLSX } = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (!workbook || workbook.SheetNames.length === 0) {
        errors.push('Le fichier Excel ne contient aucune feuille');
        return { success: false, errors, warnings };
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (!rawData || rawData.length < 2) {
        errors.push('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
        return { success: false, errors, warnings };
      }

      // Extraire le mois du nom du fichier
      const month = this.extractMonthFromFilename(file.name);
      console.log('📅 Mois détecté:', month);

      onProgress?.('Analyse des colonnes...', 20);

      // Analyser les en-têtes
      const headers = rawData[0].map((h: any) => String(h || '').toLowerCase().trim());
      
      // Identifier les colonnes
      const eanIndex = headers.findIndex(h => h.includes('ean'));
      const volumePartageIndex = headers.findIndex(h => h.includes('volume') && h.includes('partag'));
      const volumeComplIndex = headers.findIndex(h => h.includes('volume') && h.includes('compl'));
      const injectionPartageIndex = headers.findIndex(h => h.includes('injection') && h.includes('partag'));
      const injectionResiduelleIndex = headers.findIndex(h => h.includes('injection') && h.includes('résiduelle'));

      console.log('📋 Colonnes trouvées:', {
        ean: eanIndex,
        volumePartage: volumePartageIndex,
        volumeCompl: volumeComplIndex,
        injectionPartage: injectionPartageIndex,
        injectionResiduelle: injectionResiduelleIndex
      });

      if (eanIndex === -1) {
        errors.push('Colonne EAN manquante');
        return { success: false, errors, warnings };
      }

      onProgress?.('Traitement des données...', 30);

      // Collecter les données par EAN
      const participantData: { [ean: string]: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_residuelle: number;
      } } = {};

      const eansInFile = new Set<string>();
      const eansInDatabase = Object.keys(participantMapping);
      
      console.log('🔍 EANs dans la base:', eansInDatabase);

      // Traiter chaque ligne
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        let eanCode = String(row[eanIndex] || '').trim();
        if (!eanCode) continue;

        eansInFile.add(eanCode);

        // Essayer de matcher l'EAN avec les participants
        let matchedEan = null;
        if (participantMapping[eanCode]) {
          matchedEan = eanCode;
        } else {
          // Essayer des variantes
          const variants = [
            eanCode.replace(/\s+/g, ''), // Sans espaces
            eanCode.replace(/[^0-9]/g, ''), // Seulement chiffres
          ];
          
          for (const variant of variants) {
            if (participantMapping[variant]) {
              matchedEan = variant;
              break;
            }
          }
        }

        if (!matchedEan) {
          continue; // Ignorer les EANs non reconnus
        }

        // Initialiser les données pour ce participant
        if (!participantData[matchedEan]) {
          participantData[matchedEan] = {
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_residuelle: 0
          };
        }

        // Extraire les valeurs
        const volumePartage = this.parseNumericValue(row[volumePartageIndex]);
        const volumeCompl = this.parseNumericValue(row[volumeComplIndex]);
        const injectionPartage = this.parseNumericValue(row[injectionPartageIndex]);
        const injectionResiduelle = this.parseNumericValue(row[injectionResiduelleIndex]);

        // Additionner les valeurs
        participantData[matchedEan].volume_partage += volumePartage;
        participantData[matchedEan].volume_complementaire += volumeCompl;
        participantData[matchedEan].injection_partagee += injectionPartage;
        participantData[matchedEan].injection_residuelle += injectionResiduelle;
      }

      console.log('🔍 EANs trouvés dans le fichier:', Array.from(eansInFile));
      console.log('✅ Participants matchés:', Object.keys(participantData));

      if (Object.keys(participantData).length === 0) {
        const eansInFileArray = Array.from(eansInFile);
        errors.push(
          `Aucun EAN du fichier ne correspond aux participants.\n\n` +
          `EANs dans le fichier (${eansInFileArray.length}): ${eansInFileArray.slice(0, 5).join(', ')}${eansInFileArray.length > 5 ? '...' : ''}\n` +
          `EANs dans la base (${eansInDatabase.length}): ${eansInDatabase.slice(0, 5).join(', ')}${eansInDatabase.length > 5 ? '...' : ''}\n\n` +
          `Vérifiez que les codes EAN des participants correspondent exactement.`
        );
        return { success: false, errors, warnings };
      }

      onProgress?.('Mise à jour des participants...', 80);

      // Mettre à jour chaque participant avec ses données mensuelles
      for (const [eanCode, data] of Object.entries(participantData)) {
        const participant = participantMapping[eanCode];
        
        try {
          // Récupérer les données mensuelles existantes
          const { data: currentParticipant, error: fetchError } = await supabase
            .from('participants')
            .select('*')
            .eq('id', participant.id)
            .single();

          if (fetchError) {
            console.error('Erreur récupération participant:', fetchError);
            continue;
          }

          // Préparer les nouvelles données mensuelles
          let monthlyData = {};
          try {
            monthlyData = currentParticipant.monthly_data ? JSON.parse(currentParticipant.monthly_data) : {};
          } catch (e) {
            monthlyData = {};
          }

          // Ajouter/écraser les données pour ce mois
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
            console.error('Erreur mise à jour participant:', updateError);
            warnings.push(`Erreur mise à jour ${participant.name}: ${updateError.message}`);
          } else {
            console.log(`✅ Participant mis à jour: ${participant.name}`);
          }

        } catch (error) {
          console.error(`Erreur traitement ${participant.name}:`, error);
          warnings.push(`Erreur traitement ${participant.name}: ${error.message}`);
        }
      }

      onProgress?.('Import terminé !', 100);

      const result = {
        month,
        participants: participantData,
        stats: {
          totalRowsProcessed: rawData.length - 1,
          validRowsImported: Object.keys(participantData).length,
          participantsFound: Object.keys(participantData).length,
          unknownEansSkipped: eansInFile.size - Object.keys(participantData).length
        }
      };

      return { success: true, data: result, errors, warnings };

    } catch (error) {
      console.error('❌ Erreur critique:', error);
      errors.push(`Erreur lors du traitement: ${error.message}`);
      return { success: false, errors, warnings };
    }
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
        if (monthNum) return `${year}-${monthNum}`;
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
   * Parse une valeur numérique
   */
  private static parseNumericValue(value: any): number {
    try {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      
      const stringValue = String(value).replace(',', '.');
      const numValue = parseFloat(stringValue);
      return isNaN(numValue) ? 0 : Math.max(0, numValue);
    } catch (error) {
      return 0;
    }
  }
}