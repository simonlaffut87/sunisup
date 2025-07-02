import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export class ExcelProcessor {
  private static parseAmericanDate(dateStr: string): Date {
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        throw new Error('Date invalide');
      }

      const cleanDateStr = dateStr.trim();
      
      if (cleanDateStr.includes(' ')) {
        const [datePart, timePart] = cleanDateStr.split(' ');
        const [month, day, year] = datePart.split('/').map(Number);
        const [hour = 0, minute = 0] = timePart.split(':').map(Number);
        
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
          throw new Error('Format de date invalide');
        }
        
        return new Date(year, month - 1, day, hour, minute);
      } else {
        const [month, day, year] = cleanDateStr.split('/').map(Number);
        
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
          throw new Error('Format de date invalide');
        }
        
        return new Date(year, month - 1, day);
      }
    } catch (error) {
      throw new Error(`Format de date invalide: ${dateStr}`);
    }
  }

  private static extractMonthFromFilename(filename: string): string {
    try {
      const monthMatch = filename.match(/([A-Z]{3})(\d{4})/i);
      if (monthMatch) {
        const [, monthAbbr, year] = monthMatch;
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[monthAbbr.toUpperCase()];
        if (monthNum) {
          return `${year}-${monthNum}`;
        }
      }
      
      return format(new Date(), 'yyyy-MM');
    } catch (error) {
      return format(new Date(), 'yyyy-MM');
    }
  }

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

  // Fonction pour générer les données d'énergie pour les dashboards
  private static async generateEnergyDataForDashboards(processedData: any): Promise<void> {
    try {
      console.log('🔄 Génération des données d\'énergie pour les dashboards...');
      
      // Charger les participants et utilisateurs
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*');

      if (participantsError) {
        console.warn('⚠️ Erreur chargement participants:', participantsError);
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.warn('⚠️ Erreur chargement utilisateurs:', usersError);
        return;
      }

      // Charger les métadonnées des participants
      const participantMetadata = JSON.parse(localStorage.getItem('participant_metadata') || '{}');

      // Afficher les codes EAN disponibles dans les métadonnées
      console.log('🔍 Codes EAN disponibles dans les métadonnées:');
      Object.entries(participantMetadata).forEach(([participantId, metadata]: [string, any]) => {
        if (metadata.ean_code) {
          console.log(`  - ${metadata.ean_code} (Participant ID: ${participantId})`);
        }
      });

      // Afficher les codes EAN dans les données importées
      console.log('🔍 Codes EAN dans les données importées:');
      Object.keys(processedData.participants).forEach(eanCode => {
        console.log(`  - ${eanCode}`);
      });

      let totalDataPointsGenerated = 0;
      let usersUpdated = 0;

      // Pour chaque participant dans les données importées
      for (const [eanCode, participantData] of Object.entries(processedData.participants)) {
        try {
          console.log(`🔍 Traitement participant EAN: ${eanCode}`);
          
          // Trouver le participant correspondant
          const matchingParticipant = participants?.find(p => {
            const metadata = participantMetadata[p.id] || {};
            return metadata.ean_code === eanCode;
          });

          if (!matchingParticipant) {
            console.log(`⚠️ Participant avec EAN ${eanCode} non trouvé dans la base`);
            continue;
          }

          // Trouver l'utilisateur correspondant
          const matchingUser = users?.find(u => 
            u.name?.toLowerCase().includes(matchingParticipant.name.toLowerCase()) ||
            matchingParticipant.name.toLowerCase().includes(u.name?.toLowerCase() || '') ||
            u.email?.includes(matchingParticipant.name.toLowerCase())
          );

          if (!matchingUser) {
            console.log(`⚠️ Utilisateur pour ${matchingParticipant.name} non trouvé`);
            continue;
          }

          console.log(`✅ Correspondance trouvée: ${eanCode} -> ${matchingParticipant.name} -> User ${matchingUser.id}`);

          // Supprimer les données existantes pour ce mois
          const monthStart = new Date(processedData.month + '-01');
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          
          const { error: deleteError } = await supabase
            .from('energy_data')
            .delete()
            .eq('user_id', matchingUser.id)
            .gte('timestamp', monthStart.toISOString())
            .lte('timestamp', monthEnd.toISOString());

          if (deleteError) {
            console.warn('⚠️ Erreur suppression données existantes:', deleteError);
          }

          // Utiliser les données temporelles si disponibles
          const timeSeriesData = (participantData as any).timeSeriesData || [];
          
          if (timeSeriesData.length > 0) {
            console.log(`📊 Utilisation des données temporelles: ${timeSeriesData.length} points`);
            
            // Insérer les données temporelles directement
            const energyDataPoints = timeSeriesData.map((point: any) => ({
              user_id: matchingUser.id,
              timestamp: point.timestamp,
              consumption: (participantData as any).type === 'consumer' 
                ? (point.volume_complementaire || 0) + (point.volume_partage || 0)
                : (point.injection_complementaire || 0) * 0.15, // Autoconsommation pour producteurs
              shared_energy: (participantData as any).type === 'consumer'
                ? point.volume_partage || 0
                : point.injection_partagee || 0,
              production: (participantData as any).type === 'producer'
                ? (point.injection_complementaire || 0) + (point.injection_partagee || 0)
                : 0
            }));

            // Insérer par lots de 100 avec limite de 10 000 lignes par cycle
            const batchSize = 100;
            const maxBatchesPerCycle = 100; // 100 * 100 = 10 000 lignes maximum par cycle
            let batchesProcessed = 0;
            
            for (let i = 0; i < energyDataPoints.length; i += batchSize) {
              // Si on a atteint la limite de lots par cycle, faire une pause
              if (batchesProcessed >= maxBatchesPerCycle) {
                console.log(`⏸️ Pause après ${batchesProcessed * batchSize} lignes pour éviter un crash`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Pause d'une seconde
                batchesProcessed = 0; // Réinitialiser le compteur
              }
              
              const batch = energyDataPoints.slice(i, i + batchSize);
              
              const { error: insertError } = await supabase
                .from('energy_data')
                .insert(batch);

              if (insertError) {
                console.error('❌ Erreur insertion lot:', insertError);
              } else {
                totalDataPointsGenerated += batch.length;
                batchesProcessed++;
              }
            }

          } else {
            console.log(`📈 Génération de données synthétiques pour ${matchingParticipant.name}`);
            
            // Générer des données synthétiques basées sur les totaux mensuels
            const totalConsumption = (participantData as any).type === 'consumer' 
              ? ((participantData as any).data.volume_complementaire + (participantData as any).data.volume_partage)
              : ((participantData as any).data.injection_complementaire * 0.15);
            
            const totalSharedEnergy = (participantData as any).type === 'consumer'
              ? (participantData as any).data.volume_partage
              : (participantData as any).data.injection_partagee;
            
            const totalProduction = (participantData as any).type === 'producer'
              ? ((participantData as any).data.injection_complementaire + (participantData as any).data.injection_partagee)
              : 0;

            // Générer des données horaires pour tout le mois
            const daysInMonth = monthEnd.getDate();
            const energyDataPoints = [];

            for (let day = 1; day <= daysInMonth; day++) {
              for (let hour = 0; hour < 24; hour++) {
                const timestamp = new Date(monthStart.getFullYear(), monthStart.getMonth(), day, hour);
                
                // Facteurs de variation réalistes
                let hourlyFactor = 1;
                let randomFactor = 0.8 + Math.random() * 0.4;

                if ((participantData as any).type === 'producer') {
                  // Production solaire - pic à midi
                  if (hour >= 6 && hour <= 18) {
                    hourlyFactor = Math.exp(-0.5 * Math.pow((hour - 12) / 4, 2)) * 2;
                  } else {
                    hourlyFactor = 0;
                  }
                } else {
                  // Consommation - pics matin et soir
                  if (hour >= 6 && hour <= 9) {
                    hourlyFactor = 1.5;
                  } else if (hour >= 17 && hour <= 22) {
                    hourlyFactor = 1.8;
                  } else if (hour >= 23 || hour <= 5) {
                    hourlyFactor = 0.3;
                  } else {
                    hourlyFactor = 0.8;
                  }
                }

                const consumption = (totalConsumption / (daysInMonth * 24)) * hourlyFactor * randomFactor;
                const sharedEnergy = (totalSharedEnergy / (daysInMonth * 24)) * hourlyFactor * randomFactor;
                const production = (totalProduction / (daysInMonth * 24)) * hourlyFactor * randomFactor;

                energyDataPoints.push({
                  user_id: matchingUser.id,
                  timestamp: timestamp.toISOString(),
                  consumption: Math.max(0, consumption),
                  shared_energy: Math.max(0, sharedEnergy),
                  production: Math.max(0, production)
                });
              }
            }

            // Insérer par lots avec limite de 10 000 lignes par cycle
            const batchSize = 100;
            const maxBatchesPerCycle = 100; // 100 * 100 = 10 000 lignes maximum par cycle
            let batchesProcessed = 0;
            
            for (let i = 0; i < energyDataPoints.length; i += batchSize) {
              // Si on a atteint la limite de lots par cycle, faire une pause
              if (batchesProcessed >= maxBatchesPerCycle) {
                console.log(`⏸️ Pause après ${batchesProcessed * batchSize} lignes pour éviter un crash`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Pause d'une seconde
                batchesProcessed = 0; // Réinitialiser le compteur
              }
              
              const batch = energyDataPoints.slice(i, i + batchSize);
              
              const { error: insertError } = await supabase
                .from('energy_data')
                .insert(batch);

              if (insertError) {
                console.error('❌ Erreur insertion lot synthétique:', insertError);
              } else {
                totalDataPointsGenerated += batch.length;
                batchesProcessed++;
              }
            }
          }

          usersUpdated++;
          console.log(`✅ Données générées pour ${matchingParticipant.name}`);

        } catch (error) {
          console.error(`❌ Erreur traitement participant ${eanCode}:`, error);
          continue;
        }
      }

      console.log(`🎉 Génération terminée: ${totalDataPointsGenerated} points de données pour ${usersUpdated} utilisateurs`);

    } catch (error) {
      console.error('❌ Erreur génération données dashboard:', error);
    }
  }

  static async processExcelFile(
    file: File,
    participantMapping: { [ean_code: string]: { name: string; type: 'producer' | 'consumer' } },
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
      console.log('📁 Traitement du fichier:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      onProgress?.('Validation du fichier...', 5);

      // Validation du fichier
      if (!file || file.size === 0) {
        errors.push('Le fichier est vide ou invalide');
        return { success: false, errors, warnings };
      }

      // Lire le fichier Excel avec gestion d'erreur robuste
      onProgress?.('Lecture du fichier Excel...', 10);
      let workbook;
      try {
        const arrayBuffer = await file.arrayBuffer();
        workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellText: true,
          raw: false
        });
      } catch (error) {
        console.error('Erreur lecture Excel:', error);
        errors.push('Impossible de lire le fichier Excel. Vérifiez que le fichier n\'est pas corrompu.');
        return { success: false, errors, warnings };
      }
      
      if (!workbook || workbook.SheetNames.length === 0) {
        errors.push('Le fichier Excel ne contient aucune feuille');
        return { success: false, errors, warnings };
      }

      onProgress?.('Extraction des données...', 20);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      let rawData;
      
      try {
        rawData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          raw: false,
          dateNF: 'mm/dd/yyyy'
        }) as any[][];
      } catch (error) {
        console.error('Erreur extraction données:', error);
        errors.push('Impossible de lire les données de la feuille Excel');
        return { success: false, errors, warnings };
      }

      if (!rawData || rawData.length < 2) {
        errors.push('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
        return { success: false, errors, warnings };
      }

      console.log(`📊 ${rawData.length - 1} lignes de données trouvées`);

      // Extraire le mois
      const month = this.extractMonthFromFilename(file.name);

      // Analyser les en-têtes
      onProgress?.('Analyse des colonnes...', 25);
      const headers = rawData[0].map((h: any) => {
        if (h === null || h === undefined) return '';
        return String(h).toLowerCase().trim();
      });
      
      // Identifier les colonnes avec plus de flexibilité
      const eanIndex = headers.findIndex(h => 
        h.includes('ean') || h.includes('code') || h.includes('participant') || h.includes('meter')
      );
      
      const dateIndex = headers.findIndex(h => 
        h.includes('date') || h.includes('heure') || h.includes('timestamp') || h.includes('time') || h.includes('datetime') || h.includes('fromdate')
      );
      
      const flowIndex = headers.findIndex(h => 
        h.includes('flow') || h.includes('type') || h.includes('flux')
      );
      
      const volumeIndex = headers.findIndex(h => 
        h.includes('volume') || h.includes('valeur') || h.includes('value') || h.includes('kwh')
      );

      // Validation des colonnes requises
      if (eanIndex === -1) {
        errors.push('Colonne EAN/Code participant manquante');
      }

      if (dateIndex === -1) {
        errors.push('Colonne Date/Heure (FromDate) manquante');
      }
      
      if (flowIndex === -1) {
        errors.push('Colonne Flow/Type manquante');
      }
      
      if (volumeIndex === -1) {
        errors.push('Colonne Volume (kWh) manquante');
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      console.log('📋 Colonnes identifiées:', {
        ean: eanIndex,
        date: dateIndex,
        flow: flowIndex,
        volume: volumeIndex
      });

      // Structure pour stocker les mesures quart-horaires
      interface MesureQuartHoraire {
        ean: string;
        horodatage: string;
        type: string;
        valeur: number;
      }

      const mesures: MesureQuartHoraire[] = [];
      const participantTimeSeriesData: { [ean_code: string]: {
        name: string;
        type: 'producer' | 'consumer';
        timeSeriesData: { [timestamp: string]: {
          volume_complementaire: number;
          volume_partage: number;
          injection_complementaire: number;
          injection_partagee: number;
        }};
        totals: {
          volume_complementaire: number;
          volume_partage: number;
          injection_complementaire: number;
          injection_partagee: number;
        };
      } } = {};

      // Afficher les codes EAN disponibles dans le mapping
      console.log('🔍 Codes EAN disponibles dans le mapping:');
      Object.keys(participantMapping).forEach(ean => {
        console.log(`  - ${ean} (${participantMapping[ean].name})`);
      });

      const unknownEans = new Set<string>();
      let processedRows = 0;
      let validRows = 0;
      let errorRows = 0;

      // Traiter les lignes par lots pour éviter les crashes
      onProgress?.('Traitement des données...', 30);
      const totalRows = rawData.length - 1;
      const batchSize = 10000; // Limiter à 10 000 lignes par lot
      
      for (let startRow = 1; startRow < rawData.length; startRow += batchSize) {
        const endRow = Math.min(startRow + batchSize, rawData.length);
        
        onProgress?.(`Traitement du lot ${Math.floor(startRow / batchSize) + 1}/${Math.ceil((rawData.length - 1) / batchSize)}...`, 
          30 + ((startRow / totalRows) * 50));
        
        console.log(`📊 Traitement du lot de lignes ${startRow} à ${endRow - 1}`);
        
        // Traiter ce lot de lignes
        for (let i = startRow; i < endRow; i++) {
          try {
            const row = rawData[i];
            
            if (!row || row.length === 0) {
              continue;
            }

            // Extraire les données de base avec gestion d'erreur
            let eanCode = '';
            let dateTimeStr = '';
            let flowType = '';
            let volumeValue = 0;
            
            try {
              eanCode = String(row[eanIndex] || '').trim();
              dateTimeStr = String(row[dateIndex] || '').trim();
              flowType = String(row[flowIndex] || '').trim().toLowerCase();
              volumeValue = this.parseNumericValue(row[volumeIndex]);
            } catch (error) {
              errorRows++;
              continue;
            }

            if (!eanCode || !dateTimeStr || !flowType) {
              errorRows++;
              continue;
            }

            // FILTRAGE AUTOMATIQUE : Vérifier si le participant est membre
            if (!participantMapping[eanCode]) {
              unknownEans.add(eanCode);
              errorRows++;
              continue; // IGNORER cette ligne car EAN non-membre
            }

            // Parser la date avec gestion d'erreur robuste
            let timestamp: Date;
            try {
              if (typeof row[dateIndex] === 'number') {
                // Date Excel (nombre de jours depuis 1900)
                timestamp = new Date((row[dateIndex] - 25569) * 86400 * 1000);
              } else {
                timestamp = this.parseAmericanDate(dateTimeStr);
              }
              
              // Vérifier que la date est valide
              if (isNaN(timestamp.getTime())) {
                errorRows++;
                continue;
              }
            } catch (error) {
              errorRows++;
              continue; // Ignorer les lignes avec des dates invalides
            }

            // Convertir le type de flux en identifiant machine-friendly
            let typeIdentifier = '';
            if (flowType.includes('volume') && flowType.includes('compl')) {
              typeIdentifier = 'volume_complementaire';
            } else if (flowType.includes('volume') && (flowType.includes('partag') || flowType.includes('shared'))) {
              typeIdentifier = 'volume_partage';
            } else if (flowType.includes('injection') && flowType.includes('compl')) {
              typeIdentifier = 'injection_complementaire';
            } else if (flowType.includes('injection') && (flowType.includes('partag') || flowType.includes('shared'))) {
              typeIdentifier = 'injection_partagee';
            } else {
              // Essayer de détecter par mots-clés
              if (flowType.includes('compl') || flowType.includes('grid')) {
                if (participantMapping[eanCode].type === 'producer') {
                  typeIdentifier = 'injection_complementaire';
                } else {
                  typeIdentifier = 'volume_complementaire';
                }
              } else if (flowType.includes('partag') || flowType.includes('shared') || flowType.includes('community')) {
                if (participantMapping[eanCode].type === 'producer') {
                  typeIdentifier = 'injection_partagee';
                } else {
                  typeIdentifier = 'volume_partage';
                }
              } else {
                // Type inconnu, ignorer
                errorRows++;
                continue;
              }
            }

            // Ajouter la mesure
            mesures.push({
              ean: eanCode,
              horodatage: timestamp.toISOString(),
              type: typeIdentifier,
              valeur: volumeValue
            });

            // Initialiser le participant dans la structure de séries temporelles
            if (!participantTimeSeriesData[eanCode]) {
              participantTimeSeriesData[eanCode] = {
                name: participantMapping[eanCode].name,
                type: participantMapping[eanCode].type,
                timeSeriesData: {},
                totals: {
                  volume_complementaire: 0,
                  volume_partage: 0,
                  injection_complementaire: 0,
                  injection_partagee: 0
                }
              };
            }

            // Initialiser le timestamp pour ce participant
            if (!participantTimeSeriesData[eanCode].timeSeriesData[timestamp.toISOString()]) {
              participantTimeSeriesData[eanCode].timeSeriesData[timestamp.toISOString()] = {
                volume_complementaire: 0,
                volume_partage: 0,
                injection_complementaire: 0,
                injection_partagee: 0
              };
            }

            // Mettre à jour la valeur pour ce type et ce timestamp
            participantTimeSeriesData[eanCode].timeSeriesData[timestamp.toISOString()][typeIdentifier] = volumeValue;
            
            // Mettre à jour les totaux
            participantTimeSeriesData[eanCode].totals[typeIdentifier] += volumeValue;

            validRows++;
            processedRows++;

          } catch (error) {
            // Ignorer les erreurs de ligne individuelle et continuer
            console.warn(`Erreur ligne ${i}:`, error);
            errorRows++;
            continue;
          }
        }
        
        // Pause entre les lots pour éviter les crashes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onProgress?.('Finalisation des données...', 85);

      if (validRows === 0) {
        errors.push('Aucune ligne de données valide trouvée pour les participants membres');
        return { success: false, errors, warnings };
      }

      // Convertir les données de séries temporelles en tableaux
      const participants = {};
      let totalVolumeCompl = 0;
      let totalVolumePartage = 0;
      let totalInjectionCompl = 0;
      let totalInjectionPartage = 0;

      Object.entries(participantTimeSeriesData).forEach(([eanCode, data]) => {
        // Convertir l'objet timeSeriesData en tableau
        const timeSeriesArray = Object.entries(data.timeSeriesData).map(([timestamp, values]) => ({
          timestamp,
          ...values
        }));

        participants[eanCode] = {
          name: data.name,
          type: data.type,
          data: {
            volume_complementaire: Math.round(data.totals.volume_complementaire * 100) / 100,
            volume_partage: Math.round(data.totals.volume_partage * 100) / 100,
            injection_complementaire: Math.round(data.totals.injection_complementaire * 100) / 100,
            injection_partagee: Math.round(data.totals.injection_partagee * 100) / 100
          },
          timeSeriesData: timeSeriesArray
        };

        totalVolumeCompl += data.totals.volume_complementaire;
        totalVolumePartage += data.totals.volume_partage;
        totalInjectionCompl += data.totals.injection_complementaire;
        totalInjectionPartage += data.totals.injection_partagee;
      });

      const result = {
        month,
        participants,
        mesures,
        totals: {
          total_volume_complementaire: Math.round(totalVolumeCompl * 100) / 100,
          total_volume_partage: Math.round(totalVolumePartage * 100) / 100,
          total_injection_complementaire: Math.round(totalInjectionCompl * 100) / 100,
          total_injection_partagee: Math.round(totalInjectionPartage * 100) / 100
        },
        upload_date: new Date().toISOString(),
        filename: file.name,
        stats: {
          totalRowsProcessed: totalRows,
          validRowsImported: validRows,
          errorRowsSkipped: errorRows,
          participantsFound: Object.keys(participants).length,
          unknownEansSkipped: unknownEans.size,
          mesuresCount: mesures.length
        }
      };

      // Générer automatiquement les données pour les dashboards
      onProgress?.('Intégration dans les dashboards...', 90);
      await this.generateEnergyDataForDashboards(result);

      // Messages informatifs
      if (unknownEans.size > 0) {
        warnings.push(`${unknownEans.size} code(s) EAN ignoré(s) (non-membres): ${Array.from(unknownEans).slice(0, 5).join(', ')}${unknownEans.size > 5 ? '...' : ''}`);
      }

      console.log('✅ Traitement terminé:', {
        totalRows: totalRows,
        validRows: validRows,
        errorRows: errorRows,
        participants: Object.keys(participants).length,
        unknownEans: unknownEans.size,
        mesures: mesures.length
      });

      onProgress?.('Import terminé !', 100);

      return { success: true, data: result, errors, warnings };

    } catch (error) {
      console.error('❌ Erreur critique:', error);
      errors.push(`Erreur lors du traitement: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  static generateTemplate(): void {
    try {
      const templateData = [
        [
          'EAN', 'FromDate (GMT)', 'ToDate (GMT+)', 'Compteur', 'Partage', 'Flow', 'Volume (kWh)'
        ],
        ['541448000000000001', '04/01/2025 00:00', '04/01/2025 00:15', 'Compteur 1', 'Oui', 'Volume Complémentaire', '2,5'],
        ['541448000000000001', '04/01/2025 00:00', '04/01/2025 00:15', 'Compteur 1', 'Oui', 'Volume Partagé', '0,8'],
        ['541448000000000002', '04/01/2025 00:00', '04/01/2025 00:15', 'Compteur 2', 'Oui', 'Injection Complémentaire', '5,2'],
        ['541448000000000002', '04/01/2025 00:00', '04/01/2025 00:15', 'Compteur 2', 'Oui', 'Injection Partagée', '4,1'],
        ['541448000000000001', '04/01/2025 00:15', '04/01/2025 00:30', 'Compteur 1', 'Oui', 'Volume Complémentaire', '2,3'],
        ['541448000000000001', '04/01/2025 00:15', '04/01/2025 00:30', 'Compteur 1', 'Oui', 'Volume Partagé', '0,7'],
        ['541448000000000002', '04/01/2025 00:15', '04/01/2025 00:30', 'Compteur 2', 'Oui', 'Injection Complémentaire', '4,8'],
        ['541448000000000002', '04/01/2025 00:15', '04/01/2025 00:30', 'Compteur 2', 'Oui', 'Injection Partagée', '3,9'],
        ['...', '...', '...', '...', '...', '...', '...']
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Données Quart-Horaires');
      
      ws['!cols'] = [
        { width: 20 }, // EAN
        { width: 20 }, // FromDate
        { width: 20 }, // ToDate
        { width: 15 }, // Compteur
        { width: 10 }, // Partage
        { width: 25 }, // Flow
        { width: 15 }, // Volume
      ];

      const filename = `template_donnees_APR2025.xlsx`;
      XLSX.writeFile(wb, filename);
      
      console.log('✅ Template généré:', filename);
    } catch (error) {
      console.error('❌ Erreur génération template:', error);
      throw new Error('Impossible de générer le template Excel');
    }
  }
}