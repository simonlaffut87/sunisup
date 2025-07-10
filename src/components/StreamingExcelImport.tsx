import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Info, Loader2, BarChart3, Pause, Play, Square, Users, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface StreamingExcelImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

interface ProcessingState {
  status: 'idle' | 'reading' | 'processing' | 'paused' | 'completed' | 'error';
  progress: number;
  currentRow: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  participants: { [ean: string]: any };
  errors: string[];
  warnings: string[];
  canPause: boolean;
  month: string;
  mesuresCount: number;
  batchesProcessed: number;
  totalBatches: number;
}

export function StreamingExcelImport({ isOpen, onClose, onSuccess }: StreamingExcelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    currentRow: 0,
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    participants: {},
    errors: [],
    warnings: [],
    canPause: false,
    month: '',
    mesuresCount: 0,
    batchesProcessed: 0,
    totalBatches: 0
  });

  const processingRef = useRef<{
    shouldStop: boolean;
    isPaused: boolean;
    data: any[];
    participantMapping: any;
    headers: string[];
    columnIndices: {
      ean: number;
      date: number;
      flow: number;
      volume: number;
    };
    mesures: Array<{
      ean: string;
      horodatage: string;
      type: string;
      valeur: number;
    }>;
  }>({
    shouldStop: false,
    isPaused: false,
    data: [],
    participantMapping: {},
    headers: [],
    columnIndices: {
      ean: -1,
      date: -1,
      flow: -1,
      volume: -1
    },
    mesures: []
  });

  // Mapping des participants
  const getParticipantMapping = async () => {
    try {
      console.log('🔍 Chargement des participants depuis Supabase...');
      
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*');

      if (participantsError) {
        console.warn('⚠️ Erreur chargement participants:', participantsError);
        throw participantsError;
      }

      // Créer le mapping EAN -> participant
      const mapping: { [ean_code: string]: { name: string; type: 'producer' | 'consumer'; id: string } } = {};
      
      // Ajouter les participants avec code EAN
      participantsData.forEach(participant => {
        if (participant.ean_code) {
          mapping[participant.ean_code] = {
            name: participant.name,
            type: participant.type,
            id: participant.id
          };
          console.log(`✅ Participant mappé: ${participant.ean_code} -> ${participant.name} (${participant.type})`);
        } else {
          console.log(`⚠️ Participant sans EAN: ${participant.name}`);
        }
      });

      // Afficher tous les codes EAN disponibles dans les métadonnées
      console.log('🔍 Codes EAN disponibles dans les métadonnées:');
      Object.entries(participantMetadata).forEach(([participantId, metadata]: [string, any]) => {
        if (metadata.ean_code) {
          console.log(`  - ${metadata.ean_code} (Participant ID: ${participantId})`);
          
          // Vérifier si ce participant existe dans participantsData
          const participant = participantsData.find(p => p.id === participantId);
          if (participant) {
            console.log(`    ✓ Participant trouvé: ${participant.name}`);
          } else {
            console.log(`    ✗ Participant non trouvé dans la base`);
          }
        }
      });

      console.log(`🎯 Mapping final: ${Object.keys(mapping).length} participants avec codes EAN`);
      
      return mapping;
    } catch (error) {
      console.error('❌ Erreur lors du chargement du mapping:', error);
      return {};
    }
  };

  const parseNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const stringValue = String(value).replace(',', '.');
    const numValue = parseFloat(stringValue);
    return isNaN(numValue) ? 0 : Math.max(0, numValue);
  };

  const parseDate = (dateStr: string): Date | null => {
    try {
      if (!dateStr) return null;
      
      const cleanDateStr = String(dateStr).trim();
      
      if (cleanDateStr.includes(' ')) {
        const [datePart, timePart] = cleanDateStr.split(' ');
        const [month, day, year] = datePart.split('/').map(Number);
        const [hour = 0, minute = 0] = timePart.split(':').map(Number);
        
        if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
        return new Date(year, month - 1, day, hour, minute);
      } else {
        const [month, day, year] = cleanDateStr.split('/').map(Number);
        if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
        return new Date(year, month - 1, day);
      }
    } catch {
      return null;
    }
  };

  const extractMonthFromFilename = (filename: string): string => {
    const monthMatch = filename.match(/([A-Z]{3})(\d{4})/i);
    if (monthMatch) {
      const [, monthAbbr, year] = monthMatch;
      const monthMap: { [key: string]: string } = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
      };
      const monthNum = monthMap[monthAbbr.toUpperCase()];
      if (monthNum) return `${year}-${monthNum}`;
    }
    return new Date().toISOString().slice(0, 7);
  };

  const identifyColumns = (headers: string[]) => {
    // Identifier les colonnes avec plus de flexibilité
    const eanIndex = headers.findIndex(h => 
      h.includes('ean') || h.includes('code') || h.includes('participant') || h.includes('meter')
    );
    
    const dateIndex = headers.findIndex(h => 
      h.includes('date') || h.includes('heure') || h.includes('timestamp') || h.includes('time') || 
      h.includes('datetime') || h.includes('fromdate')
    );
    
    const flowIndex = headers.findIndex(h => 
      h.includes('flow') || h.includes('type') || h.includes('flux')
    );
    
    const volumeIndex = headers.findIndex(h => 
      h.includes('volume') || h.includes('valeur') || h.includes('value') || h.includes('kwh')
    );

    return {
      ean: eanIndex,
      date: dateIndex,
      flow: flowIndex,
      volume: volumeIndex
    };
  };

  const mapFlowTypeToIdentifier = (flowType: string, participantType: 'producer' | 'consumer'): string => {
    flowType = flowType.toLowerCase().trim();
    
    if (flowType.includes('volume') && (flowType.includes('compl') || flowType.includes('complementaire'))) {
      return 'volume_complementaire';
    } 
    else if (flowType.includes('volume') && (flowType.includes('partag') || flowType.includes('shared'))) {
      return 'volume_partage';
    } 
    else if (flowType.includes('injection') && (flowType.includes('compl') || flowType.includes('complementaire'))) {
      return 'injection_complementaire';
    } 
    else if (flowType.includes('injection') && (flowType.includes('partag') || flowType.includes('shared'))) {
      return 'injection_partagee';
    }
    // Essayer de détecter par mots-clés
    else if (flowType.includes('compl') || flowType.includes('grid')) {
      if (participantType === 'producer') {
        return 'injection_complementaire';
      } else {
        return 'volume_complementaire';
      }
    } 
    else if (flowType.includes('partag') || flowType.includes('shared') || flowType.includes('community')) {
      if (participantType === 'producer') {
        return 'injection_partagee';
      } else {
        return 'volume_partage';
      }
    }
    
    // Type inconnu, utiliser un type par défaut basé sur le type de participant
    return participantType === 'producer' ? 'injection_complementaire' : 'volume_complementaire';
  };

  const processChunk = async (startRow: number, chunkSize: number = 1000): Promise<boolean> => {
  const processChunk = async (startRow: number, chunkSize: number = 100): Promise<boolean> => {
    const { data, participantMapping, columnIndices, mesures } = processingRef.current;
    const endRow = Math.min(startRow + chunkSize, data.length);
    
    let chunkValidRows = 0;
    let chunkErrorRows = 0;
    const unknownEans = new Set<string>();
    const participantData: { [ean: string]: {
      timestamps: { [timestamp: string]: {
        volume_complementaire: number;
        volume_partage: number;
        injection_complementaire: number;
        injection_partagee: number;
      }}
    }} = {};

    // Limiter à 100 lignes par cycle d'import pour éviter les crashes
    const maxRowsPerCycle = 100;
    let rowsProcessedInCycle = 0;

    for (let i = startRow; i < endRow; i++) {
      // Vérifier si on doit s'arrêter
      if (processingRef.current.shouldStop) {
        return false;
      }

      // Vérifier si on est en pause
      while (processingRef.current.isPaused && !processingRef.current.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Vérifier si on a atteint la limite de lignes par cycle
      if (rowsProcessedInCycle >= maxRowsPerCycle) {
        console.log(`⏸️ Pause après ${rowsProcessedInCycle} lignes pour éviter un crash`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pause de 2 secondes
        rowsProcessedInCycle = 0; // Réinitialiser le compteur
      }

      try {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const eanCode = String(row[columnIndices.ean] || '').trim();
        const dateTimeStr = String(row[columnIndices.date] || '').trim();
        const flowType = String(row[columnIndices.flow] || '').trim();
        const volumeValue = parseNumericValue(row[columnIndices.volume]);

        if (!eanCode || !dateTimeStr || !flowType || volumeValue === 0) {
          chunkErrorRows++;
          continue;
        }

        // Filtrer les EAN non-membres
        if (!participantMapping[eanCode]) {
          unknownEans.add(eanCode);
          chunkErrorRows++;
          continue; // IGNORER cette ligne car EAN non-membre
        }

        const timestamp = parseDate(dateTimeStr);
        if (!timestamp) {
          chunkErrorRows++;
          continue;
        }

        // Convertir le type de flux en identifiant machine-friendly
        const typeIdentifier = mapFlowTypeToIdentifier(flowType, participantMapping[eanCode].type);

        // Ajouter la mesure quart-horaire
        mesures.push({
          ean: eanCode,
          horodatage: timestamp.toISOString(),
          type: typeIdentifier,
          valeur: volumeValue
        });

        // Initialiser les structures pour ce participant
        if (!participantData[eanCode]) {
          participantData[eanCode] = {
            timestamps: {}
          };
        }

        // Initialiser ce timestamp pour ce participant
        const timestampStr = timestamp.toISOString();
        if (!participantData[eanCode].timestamps[timestampStr]) {
          participantData[eanCode].timestamps[timestampStr] = {
            volume_complementaire: 0,
            volume_partage: 0,
            injection_complementaire: 0,
            injection_partagee: 0
          };
        }

        // Mettre à jour la valeur pour ce type et ce timestamp
        participantData[eanCode].timestamps[timestampStr][typeIdentifier] = volumeValue;

        // Mettre à jour l'état avec les participants
        setState(prev => {
          const newParticipants = { ...prev.participants };
          
          if (!newParticipants[eanCode]) {
            newParticipants[eanCode] = {
              name: participantMapping[eanCode].name,
              type: participantMapping[eanCode].type,
              id: participantMapping[eanCode].id,
              timeSeriesData: [],
              totals: {
                volume_complementaire: 0,
                volume_partage: 0,
                injection_complementaire: 0,
                injection_partagee: 0
              }
            };
          }

          // Mettre à jour les totaux pour ce participant
          newParticipants[eanCode].totals[typeIdentifier] += volumeValue;

          // Calculer le nombre total de lots
          const totalBatches = Math.ceil(prev.totalRows / chunkSize);

          return {
            ...prev,
            participants: newParticipants,
            currentRow: i,
            validRows: prev.validRows + 1,
            errorRows: prev.errorRows + chunkErrorRows,
            progress: Math.round((i / prev.totalRows) * 100),
            mesuresCount: prev.mesuresCount + 1,
            batchesProcessed: Math.floor(i / chunkSize) + 1,
            totalBatches
          };
        });

        chunkValidRows++;
        rowsProcessedInCycle++;

      } catch (error) {
        chunkErrorRows++;
        console.warn(`Erreur ligne ${i}:`, error);
        continue;
      }
    }

    // Ajouter les EAN inconnus aux warnings
    if (unknownEans.size > 0) {
      setState(prev => ({
        ...prev,
        warnings: [...prev.warnings, `${unknownEans.size} code(s) EAN ignoré(s) (non-membres): ${Array.from(unknownEans).slice(0, 5).join(', ')}${unknownEans.size > 5 ? '...' : ''}`]
      }));
    }

    // Convertir les données de participantData en timeSeriesData pour l'état
    Object.entries(participantData).forEach(([eanCode, data]) => {
      setState(prev => {
        const newParticipants = { ...prev.participants };
        
        // Ajouter les points de données temporelles
        Object.entries(data.timestamps).forEach(([timestamp, values]) => {
          newParticipants[eanCode].timeSeriesData.push({
            timestamp,
            ...values
          });
        });

        return {
          ...prev,
          participants: newParticipants
        };
      });
    });

    // Petite pause pour permettre au UI de se mettre à jour
    await new Promise(resolve => setTimeout(resolve, 50));

    return endRow < data.length;
  };

  const generateEnergyDataForDashboards = async (processedData: any): Promise<void> => {
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
          const matchingParticipant = participants?.find(p => p.ean_code === eanCode);

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

          // Utiliser les mesures quart-horaires pour générer les données energy_data
          // Regrouper les mesures par timestamp pour ce participant
          const mesuresByTimestamp = {};
          
          processedData.mesures
            .filter((m: any) => m.ean === eanCode)
            .forEach((mesure: any) => {
              if (!mesuresByTimestamp[mesure.horodatage]) {
                mesuresByTimestamp[mesure.horodatage] = {
                  volume_complementaire: 0,
                  volume_partage: 0,
                  injection_complementaire: 0,
                  injection_partagee: 0
                };
              }
              mesuresByTimestamp[mesure.horodatage][mesure.type] = mesure.valeur;
            });

          // Convertir en points de données energy_data
          const energyDataPoints = Object.entries(mesuresByTimestamp).map(([timestamp, values]: [string, any]) => {
            const isProducer = participantData.type === 'producer';
            
            return {
              user_id: matchingUser.id,
              timestamp,
              consumption: isProducer 
                ? (values.injection_complementaire || 0) * 0.15 // Autoconsommation pour producteurs (15% de l'injection)
                : (values.volume_complementaire || 0) + (values.volume_partage || 0),
              shared_energy: isProducer
                ? values.injection_partagee || 0
                : values.volume_partage || 0,
              production: isProducer
                ? (values.injection_complementaire || 0) + (values.injection_partagee || 0)
                : 0
            };
          });

          if (energyDataPoints.length > 0) {
            console.log(`📊 Génération de ${energyDataPoints.length} points de données pour ${matchingParticipant.name}`);
            
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
            
            usersUpdated++;
            console.log(`✅ Données générées pour ${matchingParticipant.name}`);
          } else {
            console.warn(`⚠️ Aucune donnée temporelle pour ${matchingParticipant.name}`);
          }

        } catch (error) {
          console.error(`❌ Erreur traitement participant ${eanCode}:`, error);
          continue;
        }
      }

      console.log(`🎉 Génération terminée: ${totalDataPointsGenerated} points de données pour ${usersUpdated} utilisateurs`);

    } catch (error) {
      console.error('❌ Erreur génération données dashboard:', error);
    }
  };

  const startProcessing = async () => {
    if (!file) return;

    try {
      setState(prev => ({ 
        ...prev, 
        status: 'reading', 
        progress: 0,
        errors: [],
        warnings: []
      }));

      // Lire le fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: true,
        raw: false
      });

      if (!workbook || workbook.SheetNames.length === 0) {
        throw new Error('Fichier Excel invalide');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: '',
        raw: false
      }) as any[][];

      if (rawData.length < 2) {
        throw new Error('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
      }

      // Extraire le mois du nom de fichier
      const month = extractMonthFromFilename(file.name);
      
      // Analyser les en-têtes
      const headers = rawData[0].map((h: any) => {
        if (h === null || h === undefined) return '';
        return String(h).toLowerCase().trim();
      });
      
      // Identifier les colonnes
      const columnIndices = identifyColumns(headers);
      
      // Vérifier les colonnes requises
      if (columnIndices.ean === -1) {
        throw new Error('Colonne EAN/Code participant manquante');
      }

      if (columnIndices.date === -1) {
        throw new Error('Colonne Date/Heure (FromDate) manquante');
      }
      
      if (columnIndices.flow === -1) {
        throw new Error('Colonne Flow/Type manquante');
      }
      
      if (columnIndices.volume === -1) {
        throw new Error('Colonne Volume (kWh) manquante');
      }

      // Charger le mapping des participants
      const participantMapping = await getParticipantMapping();

      // Afficher les codes EAN disponibles dans le mapping
      console.log('🔍 Codes EAN disponibles dans le mapping:');
      Object.keys(participantMapping).forEach(ean => {
        console.log(`  - ${ean} (${participantMapping[ean].name})`);
      });

      // Préparer les données pour le traitement
      processingRef.current = {
        shouldStop: false,
        isPaused: false,
        data: rawData,
        participantMapping,
        headers,
        columnIndices,
        mesures: []
      };

      // Calculer le nombre total de lots - RÉDUIT pour éviter les crashes
      const chunkSize = 100; // Traiter seulement 100 lignes à la fois
      const totalBatches = Math.ceil((rawData.length - 1) / chunkSize);

      setState(prev => ({
        ...prev,
        status: 'processing',
        totalRows: rawData.length - 1,
        canPause: true,
        month,
        totalBatches
      }));

      console.log(`🚀 Début du traitement: ${rawData.length - 1} lignes en ${totalBatches} lots`);
      console.log('📋 Colonnes identifiées:', columnIndices);

      // Traitement par chunks
      let currentRow = 1; // Ignorer l'en-tête
      
      while (currentRow < rawData.length && !processingRef.current.shouldStop) {
        // Pause plus longue entre les chunks pour éviter les crashes
        if (currentRow > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const hasMore = await processChunk(currentRow, chunkSize);
        currentRow += chunkSize;
        
        if (!hasMore) break;
      }

      if (!processingRef.current.shouldStop) {
        // Finaliser l'import
        setState(prev => {
          const participants = {};
          let totalVolumeCompl = 0;
          let totalVolumePartage = 0;
          let totalInjectionCompl = 0;
          let totalInjectionPartage = 0;

          Object.entries(prev.participants).forEach(([eanCode, data]: [string, any]) => {
            participants[eanCode] = {
              name: data.name,
              type: data.type,
              id: data.id,
              data: {
                volume_complementaire: Math.round(data.totals.volume_complementaire * 100) / 100,
                volume_partage: Math.round(data.totals.volume_partage * 100) / 100,
                injection_complementaire: Math.round(data.totals.injection_complementaire * 100) / 100,
                injection_partagee: Math.round(data.totals.injection_partagee * 100) / 100
              },
              timeSeriesData: data.timeSeriesData
            };

            totalVolumeCompl += data.totals.volume_complementaire;
            totalVolumePartage += data.totals.volume_partage;
            totalInjectionCompl += data.totals.injection_complementaire;
            totalInjectionPartage += data.totals.injection_partagee;
          });

          const result = {
            month: prev.month,
            participants,
            mesures: processingRef.current.mesures,
            totals: {
              total_volume_complementaire: Math.round(totalVolumeCompl * 100) / 100,
              total_volume_partage: Math.round(totalVolumePartage * 100) / 100,
              total_injection_complementaire: Math.round(totalInjectionCompl * 100) / 100,
              total_injection_partagee: Math.round(totalInjectionPartage * 100) / 100
            },
            upload_date: new Date().toISOString(),
            filename: file.name,
            stats: {
              totalRowsProcessed: prev.totalRows,
              validRowsImported: prev.validRows,
              errorRowsSkipped: prev.errorRows,
              participantsFound: Object.keys(participants).length,
              mesuresCount: prev.mesuresCount
            }
          };

          // Sauvegarder dans localStorage
          try {
            const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
            monthlyData[result.month] = result;
            localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
            console.log('💾 Données sauvegardées');
            
            // Générer les données pour les dashboards
            generateEnergyDataForDashboards(result);
          } catch (error) {
            console.error('❌ Erreur sauvegarde:', error);
          }

          const monthLabel = format(new Date(result.month + '-01'), 'MMMM yyyy', { locale: fr });
          
          toast.success(
            `🎉 Import terminé !\n\n` +
            `📅 Mois: ${monthLabel}\n` +
            `👥 ${Object.keys(participants).length} participants\n` +
            `📊 ${prev.mesuresCount.toLocaleString()} mesures quart-horaires\n` +
            `🚫 ${prev.errorRows} lignes ignorées`
          );

          setTimeout(() => {
            onSuccess(result);
          }, 2000);

          return {
            ...prev,
            status: 'completed',
            progress: 100,
            canPause: false
          };
        });
      }

    } catch (error) {
      console.error('❌ Erreur traitement:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [error.message],
        canPause: false
      }));
      toast.error(`❌ Erreur: ${error.message}`);
    }
  };

  const pauseProcessing = () => {
    processingRef.current.isPaused = true;
    setState(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeProcessing = () => {
    processingRef.current.isPaused = false;
    setState(prev => ({ ...prev, status: 'processing' }));
  };

  const stopProcessing = () => {
    processingRef.current.shouldStop = true;
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      currentRow: 0,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      participants: {},
      canPause: false,
      mesuresCount: 0,
      batchesProcessed: 0,
      totalBatches: 0
    }));
  };

  const handleClose = () => {
    if (state.status === 'processing') {
      if (confirm('Un import est en cours. Voulez-vous vraiment fermer ?')) {
        stopProcessing();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setState(prev => ({
      ...prev,
      status: 'idle',
      progress: 0,
      currentRow: 0,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      participants: {},
      errors: [],
      warnings: [],
      mesuresCount: 0,
      batchesProcessed: 0,
      totalBatches: 0
    }));
  };

  const downloadTemplate = () => {
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
      
      toast.success('✅ Template téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur génération template:', error);
      toast.error('❌ Erreur lors du téléchargement du template');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🚀 Import Quart-Horaire</h2>
              <p className="text-gray-600 mt-1">
                Import robuste avec filtrage automatique des EAN
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
              disabled={state.status === 'processing' && !state.canPause}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900 mb-2">✨ Import Quart-Horaire Unifié</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• 🔗 <strong>Correspondance automatique par EAN</strong> - Lien direct avec les participants</p>
                  <p>• 🛡️ <strong>Traitement sécurisé</strong> - Import par lots de 100 lignes pour éviter les crashes</p>
                  <p>• 🔍 <strong>Filtrage intelligent</strong> - Seuls les EAN enregistrés sont importés</p>
                  <p>• ⏸️ <strong>Contrôle en temps réel</strong> - Pause/reprise disponible</p>
                  <p>• 📊 <strong>Données temporelles conservées</strong> - Mesures quart-horaires intactes</p>
                  <p>• ⚡ <strong>Anti-crash</strong> - Pauses automatiques toutes les 100 lignes</p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={downloadTemplate}
                    disabled={state.status === 'processing' || state.status === 'reading'}
                    className="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          {state.status === 'idle' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      handleFileSelect(selectedFile);
                    }
                  }}
                  className="hidden"
                  id="streaming-excel-upload"
                />
                <label htmlFor="streaming-excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sélectionner le fichier Excel quart-horaire
                  </h3>
                  <p className="text-gray-600">
                    Correspondance automatique par code EAN
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Seules les données des participants avec EAN enregistré seront importées
                  </p>
                </label>
              </div>

              {file && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">📁 {file.name}</p>
                      <p className="text-sm text-blue-700">
                        Taille: {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={startProcessing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      🚀 Démarrer l'import unifié
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Section */}
          {(state.status === 'reading' || state.status === 'processing' || state.status === 'paused') && (
            <div className="space-y-6">
              <div className="text-center">
                {state.status !== 'paused' && (
                  <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                )}
                {state.status === 'paused' && (
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Pause className="w-10 h-10 text-amber-500" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {state.status === 'reading' && '📖 Lecture du fichier...'}
                  {state.status === 'processing' && '⚡ Traitement en cours...'}
                  {state.status === 'paused' && '⏸️ Import en pause'}
                </h3>
                <p className="text-gray-600">
                  Correspondance automatique par code EAN avec les participants enregistrés
                </p>
                {state.batchesProcessed > 0 && state.totalBatches > 0 && (
                  <p className="text-sm text-gray-600">
                    Lot {state.batchesProcessed}/{state.totalBatches} • Traitement par lots de 100 lignes
                  </p>
                )}
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progression</span>
                  <span>{state.progress}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      state.status === 'paused' ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${state.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Statistiques en temps réel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-gray-900">{state.currentRow.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Ligne actuelle</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-600">{state.validRows.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Lignes valides</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-blue-600">{Object.keys(state.participants).length}</div>
                  <div className="text-xs text-gray-600">Participants</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-600">{state.mesuresCount.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Mesures</div>
                </div>
              </div>

              {/* Participants détectés */}
              {Object.keys(state.participants).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="font-medium text-blue-900">Participants détectés ({Object.keys(state.participants).length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(state.participants).map(([ean, data]: [string, any]) => (
                        <div key={ean} className="flex items-center text-sm">
                          <div className={`w-2 h-2 rounded-full mr-2 ${data.type === 'producer' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                          <span className="text-blue-800 font-medium">{data.name}</span>
                          <span className="text-blue-600 ml-2 text-xs">({ean.slice(-6)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {state.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <h4 className="font-medium text-yellow-900">Avertissements ({state.warnings.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {state.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Contrôles */}
              {state.canPause && (
                <div className="flex justify-center space-x-3">
                  {state.status === 'processing' && (
                    <button
                      onClick={pauseProcessing}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                  )}
                  {state.status === 'paused' && (
                    <button
                      onClick={resumeProcessing}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Reprendre
                    </button>
                  )}
                  <button
                    onClick={stopProcessing}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Arrêter
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Section */}
          {state.status === 'completed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">🎉 Import terminé !</h3>
              <p className="text-green-700 mb-4">
                Les données ont été importées et associées automatiquement aux participants via leur code EAN.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-green-600">Lignes traitées</div>
                    <div className="font-bold text-green-900">{state.totalRows.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-green-600">Mesures importées</div>
                    <div className="font-bold text-green-900">{state.mesuresCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-green-600">Participants</div>
                    <div className="font-bold text-green-900">{Object.keys(state.participants).length}</div>
                  </div>
                  <div>
                    <div className="text-green-600">Taux de succès</div>
                    <div className="font-bold text-green-900">
                      {state.totalRows > 0 ? Math.round((state.validRows / state.totalRows) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Section */}
          {state.status === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Erreur d'import</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                {state.errors.map((error, index) => (
                  <p key={index} className="text-red-700 text-sm">{error}</p>
                ))}
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, status: 'idle', errors: [] }))}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}