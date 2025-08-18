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
    const unknownEans = new Set<string>();
    const processedParticipants = new Set<string>();

    try {
      console.log('📁 Traitement du fichier:', file.name);
      onProgress?.('Lecture du fichier Excel...', 10);

      // Lire le fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = (await import('xlsx')).default || await import('xlsx');
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

      let totalRowsProcessed = 0;
      let validRowsImported = 0;

      // Traiter chaque ligne
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row.some(cell => cell)) continue;
        
        totalRowsProcessed++;

        let eanCode = String(row[eanIndex] || '').trim();
        if (!eanCode) {
          continue;
        }

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
          unknownEans.add(eanCode);
          continue; // Ignorer les EANs non reconnus
        }

        processedParticipants.add(matchedEan);

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
        
        validRowsImported++;
      }

      // Notifications pour les EANs non reconnus
      if (unknownEans.size > 0) {
        const unknownList = Array.from(unknownEans).slice(0, 10).join(', ');
        const moreCount = unknownEans.size > 10 ? ` et ${unknownEans.size - 10} autres` : '';
        warnings.push(`${unknownEans.size} EAN(s) non reconnu(s) ignoré(s): ${unknownList}${moreCount}`);
      }

      if (Object.keys(participantData).length === 0) {
        errors.push(`Aucun participant reconnu dans le fichier. ${unknownEans.size} EAN(s) non reconnu(s) ont été ignoré(s).`);
        return { success: false, errors, warnings };
      }

      onProgress?.('Mise à jour des participants...', 80);

      // Mettre à jour chaque participant avec ses données mensuelles
      let participantsUpdated = 0;
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
            warnings.push(`Impossible de récupérer les données de ${participant.name}`);
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
            participantsUpdated++;
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
          totalRowsProcessed,
          validRowsImported,
          participantsFound: participantsUpdated,
          participantsUpdated,
          unknownEansSkipped: unknownEans.size,
          unknownEansList: Array.from(unknownEans)
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