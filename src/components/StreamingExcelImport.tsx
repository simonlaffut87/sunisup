import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Info, Loader2, BarChart3, Pause, Play, Square, Users, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { BasicFileReader } from '../utils/basicFileReader';
import { ImportReportModal } from './ImportReportModal';

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
  const [importReport, setImportReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

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

  // Référence pour l'input de fichier
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    try {
      // Import dynamique de XLSX pour le template
      import('xlsx').then(XLSX => {
      const templateData = [
          ['EAN', 'Date', 'Type', 'Volume (kWh)'],
          ['541448000000000001', '2025-04-01', 'Volume Complémentaire', '25.5'],
          ['541448000000000001', '2025-04-01', 'Volume Partagé', '15.2'],
          ['541448000000000002', '2025-04-01', 'Injection Complémentaire', '45.8'],
          ['541448000000000002', '2025-04-01', 'Injection Partagée', '32.1']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        XLSX.writeFile(wb, 'template-import-excel.xlsx');
        toast.success('Template téléchargé avec succès');
      }).catch(error => {
        console.error('Erreur import XLSX:', error);
        toast.error('Erreur lors du téléchargement du template');
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Erreur lors du téléchargement du template');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setState(prev => ({ ...prev, status: 'idle', errors: [], warnings: [] }));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setState(prev => ({ ...prev, status: 'idle', errors: [], warnings: [] }));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const processFile = async () => {
    if (!file) return;

    console.log('🚀 DÉBUT TRAITEMENT COMPLET');
    setState(prev => ({
      ...prev,
      status: 'reading',
      progress: 0,
      errors: [],
      warnings: [],
      participants: {},
      validRows: 0,
      errorRows: 0,
      totalRows: 0
    }));
    setDebugLogs(['🚀 DÉBUT TRAITEMENT COMPLET AVEC FRAIS RÉSEAUX']);

    try {
      // ÉTAPE 1: Lecture du fichier
      setDebugLogs(prev => [...prev, '📖 Lecture du fichier...']);
      setState(prev => ({ ...prev, progress: 10 }));

      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result instanceof ArrayBuffer) {
            resolve(e.target.result);
          } else {
            reject(new Error('Erreur lecture'));
          }
        };
        reader.onerror = () => reject(new Error('Erreur FileReader'));
        reader.readAsArrayBuffer(file);
      });

      setDebugLogs(prev => [...prev, `✅ Buffer lu: ${buffer.byteLength} bytes`]);

      // ÉTAPE 2: Import XLSX et lecture workbook
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      setDebugLogs(prev => [...prev, `✅ ${jsonData.length} lignes extraites`]);
      setState(prev => ({ ...prev, progress: 20, totalRows: jsonData.length - 1 }));

      // ÉTAPE 3: Identifier les colonnes
      const headers: string[] = jsonData[0] as string[];
      setDebugLogs(prev => [...prev, `📋 TOTAL HEADERS: ${headers.length}`]);

      // Fonction helper pour normaliser les headers (enlever accents, espaces multiples, caractères spéciaux)
      const normalizeHeader = (h: string): string => {
        return h
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
          .replace(/[€&().>]/g, '') // Enlever €, &, parenthèses, point, >
          .replace(/-/g, ' ') // Remplacer tirets par espaces
          .replace(/\s+/g, ' ') // Normaliser les espaces
          .trim();
      };

      // Log chaque header avec son index et sa version normalisée
      headers.forEach((h, idx) => {
        if (h) setDebugLogs(prev => [...prev, `  [${idx}] "${h}" → normalized: "${normalizeHeader(h)}"`]);
      });

      const colIndexes = {
        dateDebut: headers.findIndex(h => h && normalizeHeader(h).includes('date debut')),
        ean: headers.findIndex(h => h && h.toLowerCase() === 'ean'),
        volumePartage: headers.findIndex(h => h && normalizeHeader(h).includes('consommation partagee')),
        volumeReseau: headers.findIndex(h => h && normalizeHeader(h).includes('consommation reseau')),
        injectionPartagee: headers.findIndex(h => h && normalizeHeader(h).includes('injection partagee')),
        injectionReseau: headers.findIndex(h => h && normalizeHeader(h).includes('injection reseau')),
        utilisationReseau: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('utilisation') && norm.includes('reseau') && norm.includes('htva');
        }),
        surcharges: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('surcharges') && norm.includes('htva');
        }),
        tarifCapacitaire: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('tarif capac') && norm.includes('htva');
        }),
        tarifMesure: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('tarif mesure') && norm.includes('comptage') && norm.includes('htva');
        }),
        tarifOSP: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('tarif osp') && norm.includes('htva');
        }),
        transportELIA: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('transport') && norm.includes('elia') && norm.includes('htva');
        }),
        redevanceVoirie: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('redevance') && norm.includes('voirie') && norm.includes('htva');
        }),
        totalFraisReseau: headers.findIndex(h => {
          const norm = normalizeHeader(h);
          return norm.includes('total frais') && norm.includes('reseau') && norm.includes('htva');
        })
      };

      setDebugLogs(prev => [...prev, `\n🔍 INDICES DES COLONNES TROUVÉS:`]);
      setDebugLogs(prev => [...prev, `  EAN: ${colIndexes.ean} ${colIndexes.ean >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Volume Partagé: ${colIndexes.volumePartage} ${colIndexes.volumePartage >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Volume Réseau: ${colIndexes.volumeReseau} ${colIndexes.volumeReseau >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Utilisation Réseau: ${colIndexes.utilisationReseau} ${colIndexes.utilisationReseau >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Surcharges: ${colIndexes.surcharges} ${colIndexes.surcharges >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Tarif Capacitaire: ${colIndexes.tarifCapacitaire} ${colIndexes.tarifCapacitaire >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Tarif Mesure: ${colIndexes.tarifMesure} ${colIndexes.tarifMesure >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Tarif OSP: ${colIndexes.tarifOSP} ${colIndexes.tarifOSP >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Transport ELIA: ${colIndexes.transportELIA} ${colIndexes.transportELIA >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Redevance Voirie: ${colIndexes.redevanceVoirie} ${colIndexes.redevanceVoirie >= 0 ? '✅' : '❌'}`]);
      setDebugLogs(prev => [...prev, `  Total Frais Réseau: ${colIndexes.totalFraisReseau} ${colIndexes.totalFraisReseau >= 0 ? '✅' : '❌'}\n`]);

      // Alerter si des colonnes critiques sont manquantes
      const missingCols = [];
      if (colIndexes.utilisationReseau === -1) missingCols.push('Utilisation Réseau');
      if (colIndexes.surcharges === -1) missingCols.push('Surcharges');
      if (colIndexes.tarifCapacitaire === -1) missingCols.push('Tarif Capacitaire');
      if (colIndexes.tarifMesure === -1) missingCols.push('Tarif Mesure');
      if (colIndexes.tarifOSP === -1) missingCols.push('Tarif OSP');
      if (colIndexes.transportELIA === -1) missingCols.push('Transport ELIA');
      if (colIndexes.redevanceVoirie === -1) missingCols.push('Redevance Voirie');
      if (colIndexes.totalFraisReseau === -1) missingCols.push('Total Frais Réseau');

      if (missingCols.length > 0) {
        setDebugLogs(prev => [...prev, `⚠️ ATTENTION: Colonnes manquantes: ${missingCols.join(', ')}`]);
        setDebugLogs(prev => [...prev, `   Les frais réseaux seront à 0 pour ces colonnes!\n`]);
      }

      // ÉTAPE 4: Récupérer tous les participants
      setState(prev => ({ ...prev, progress: 30 }));
      const { data: allParticipants, error: fetchError } = await supabase
        .from('participants')
        .select('id, ean_code, name');

      if (fetchError) throw new Error(`Erreur récupération participants: ${fetchError.message}`);

      const eanToParticipant = new Map();
      allParticipants?.forEach(p => {
        if (p.ean_code) eanToParticipant.set(p.ean_code, p);
      });

      setDebugLogs(prev => [...prev, `✅ ${eanToParticipant.size} participants chargés`]);

      // ÉTAPE 5: Traiter les lignes et agréger par EAN
      setState(prev => ({ ...prev, status: 'processing', progress: 40 }));

      const participantData = new Map<string, any>();
      let validRows = 0;
      let errorRows = 0;
      let month = '';

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const ean = row[colIndexes.ean]?.toString().trim();

        if (!ean) {
          errorRows++;
          continue;
        }

        // Extraire le mois de la première ligne valide
        if (!month && colIndexes.dateDebut >= 0 && row[colIndexes.dateDebut]) {
          const dateStr = row[colIndexes.dateDebut].toString();
          try {
            const date = new Date(dateStr);
            month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          } catch (e) {
            // Si le format est "1-août-25", extraire manuellement
            const match = dateStr.match(/(\d+)-(.*?)-(\d+)/);
            if (match) {
              const monthMap: any = {
                'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
                'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
                'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12',
                'janv': '01', 'févr': '02', 'avr': '04', 'juil': '07',
                'sept': '09', 'oct': '10', 'nov': '11', 'déc': '12'
              };
              const monthName = match[2].toLowerCase().replace('.', '');
              const year = '20' + match[3];
              month = `${year}-${monthMap[monthName] || '01'}`;
            }
          }
        }

        const participant = eanToParticipant.get(ean);
        if (!participant) {
          errorRows++;
          continue;
        }

        validRows++;

        // Agréger les données par EAN
        if (!participantData.has(ean)) {
          participantData.set(ean, {
            id: participant.id,
            name: participant.name,
            volumePartage: 0,
            volumeReseau: 0,
            injectionPartagee: 0,
            injectionReseau: 0,
            networkCosts: {
              utilisationReseau: 0,
              surcharges: 0,
              tarifCapacitaire: 0,
              tarifMesure: 0,
              tarifOSP: 0,
              transportELIA: 0,
              redevanceVoirie: 0,
              totalFraisReseau: 0
            }
          });
        }

        const data = participantData.get(ean);

        // Fonction helper pour parser les nombres européens (virgule comme séparateur décimal)
        const parseEuropeanNumber = (value: any): number => {
          if (value === null || value === undefined || value === '') return 0;
          const strValue = String(value).trim().replace(',', '.');
          const parsed = parseFloat(strValue);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Volumes
        data.volumePartage += parseEuropeanNumber(row[colIndexes.volumePartage]);
        data.volumeReseau += parseEuropeanNumber(row[colIndexes.volumeReseau]);
        data.injectionPartagee += parseEuropeanNumber(row[colIndexes.injectionPartagee]);
        data.injectionReseau += parseEuropeanNumber(row[colIndexes.injectionReseau]);

        // Frais réseaux - Log pour la première ligne de ce participant
        const isFirstLineForParticipant = validRows === 1;
        if (isFirstLineForParticipant) {
          setDebugLogs(prev => [...prev, `\n📊 PREMIÈRE LIGNE pour ${participant.name} (EAN: ${ean}):`]);
          setDebugLogs(prev => [...prev, `  Valeurs brutes dans le fichier:`]);
          setDebugLogs(prev => [...prev, `    Utilisation Réseau [${colIndexes.utilisationReseau}]: "${row[colIndexes.utilisationReseau]}" → ${parseEuropeanNumber(row[colIndexes.utilisationReseau])}`]);
          setDebugLogs(prev => [...prev, `    Surcharges [${colIndexes.surcharges}]: "${row[colIndexes.surcharges]}" → ${parseEuropeanNumber(row[colIndexes.surcharges])}`]);
          setDebugLogs(prev => [...prev, `    Tarif Capacitaire [${colIndexes.tarifCapacitaire}]: "${row[colIndexes.tarifCapacitaire]}" → ${parseEuropeanNumber(row[colIndexes.tarifCapacitaire])}`]);
          setDebugLogs(prev => [...prev, `    Tarif Mesure [${colIndexes.tarifMesure}]: "${row[colIndexes.tarifMesure]}" → ${parseEuropeanNumber(row[colIndexes.tarifMesure])}`]);
          setDebugLogs(prev => [...prev, `    Tarif OSP [${colIndexes.tarifOSP}]: "${row[colIndexes.tarifOSP]}" → ${parseEuropeanNumber(row[colIndexes.tarifOSP])}`]);
          setDebugLogs(prev => [...prev, `    Transport ELIA [${colIndexes.transportELIA}]: "${row[colIndexes.transportELIA]}" → ${parseEuropeanNumber(row[colIndexes.transportELIA])}`]);
          setDebugLogs(prev => [...prev, `    Redevance Voirie [${colIndexes.redevanceVoirie}]: "${row[colIndexes.redevanceVoirie]}" → ${parseEuropeanNumber(row[colIndexes.redevanceVoirie])}`]);
          setDebugLogs(prev => [...prev, `    Total Frais [${colIndexes.totalFraisReseau}]: "${row[colIndexes.totalFraisReseau]}" → ${parseEuropeanNumber(row[colIndexes.totalFraisReseau])}\n`]);
        }

        data.networkCosts.utilisationReseau += parseEuropeanNumber(row[colIndexes.utilisationReseau]);
        data.networkCosts.surcharges += parseEuropeanNumber(row[colIndexes.surcharges]);
        data.networkCosts.tarifCapacitaire += parseEuropeanNumber(row[colIndexes.tarifCapacitaire]);
        data.networkCosts.tarifMesure += parseEuropeanNumber(row[colIndexes.tarifMesure]);
        data.networkCosts.tarifOSP += parseEuropeanNumber(row[colIndexes.tarifOSP]);
        data.networkCosts.transportELIA += parseEuropeanNumber(row[colIndexes.transportELIA]);
        data.networkCosts.redevanceVoirie += parseEuropeanNumber(row[colIndexes.redevanceVoirie]);
        data.networkCosts.totalFraisReseau += parseEuropeanNumber(row[colIndexes.totalFraisReseau]);

        if (i % 10 === 0) {
          setState(prev => ({ ...prev, currentRow: i, progress: 40 + (i / jsonData.length) * 40 }));
        }
      }

      setDebugLogs(prev => [...prev, `✅ ${participantData.size} participants trouvés avec données, ${errorRows} EANs ignorés`]);
      setDebugLogs(prev => [...prev, `📅 Mois détecté: ${month}`]);

      // ÉTAPE 6: Enregistrer dans Supabase
      setState(prev => ({ ...prev, progress: 80 }));
      setDebugLogs(prev => [...prev, '💾 Enregistrement dans Supabase...']);

      let updatedCount = 0;
      for (const [ean, data] of participantData.entries()) {
        try {
          // Log avant enregistrement
          setDebugLogs(prev => [...prev, `\n💾 ENREGISTREMENT ${data.name}:`]);
          setDebugLogs(prev => [...prev, `  Volumes: Partagé=${data.volumePartage.toFixed(2)}, Réseau=${data.volumeReseau.toFixed(2)}`]);
          setDebugLogs(prev => [...prev, `  Frais Réseaux CALCULÉS:`]);
          setDebugLogs(prev => [...prev, `    utilisationReseau: ${data.networkCosts.utilisationReseau.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    surcharges: ${data.networkCosts.surcharges.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    tarifCapacitaire: ${data.networkCosts.tarifCapacitaire.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    tarifMesure: ${data.networkCosts.tarifMesure.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    tarifOSP: ${data.networkCosts.tarifOSP.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    transportELIA: ${data.networkCosts.transportELIA.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    redevanceVoirie: ${data.networkCosts.redevanceVoirie.toFixed(2)}€`]);
          setDebugLogs(prev => [...prev, `    TOTAL: ${data.networkCosts.totalFraisReseau.toFixed(2)}€`]);

          // Récupérer les données existantes
          const { data: existing } = await supabase
            .from('participants')
            .select('monthly_data, billing_data')
            .eq('id', data.id)
            .single();

          const monthlyData = existing?.monthly_data || {};
          const billingData = existing?.billing_data || {};

          // Mettre à jour monthly_data
          monthlyData[month] = {
            volume_partage: data.volumePartage,
            volume_complementaire: data.volumeReseau,
            injection_partagee: data.injectionPartagee,
            injection_complementaire: data.injectionReseau,
            updated_at: new Date().toISOString()
          };

          // Mettre à jour billing_data avec les frais réseaux
          billingData[month] = {
            month: month,
            networkCosts: data.networkCosts,
            updated_at: new Date().toISOString()
          };

          setDebugLogs(prev => [...prev, `  📤 Envoi à Supabase pour mois: ${month}`]);

          // Sauvegarder
          const { error: updateError } = await supabase
            .from('participants')
            .update({
              monthly_data: monthlyData,
              billing_data: billingData,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id);

          if (updateError) {
            setDebugLogs(prev => [...prev, `❌ Erreur MAJ ${data.name}: ${updateError.message}`]);
          } else {
            updatedCount++;
            setDebugLogs(prev => [...prev, `✅ ${data.name}: ENREGISTRÉ avec ${data.networkCosts.totalFraisReseau.toFixed(2)}€ de frais\n`]);
          }
        } catch (error: any) {
          setDebugLogs(prev => [...prev, `❌ Erreur ${data.name}: ${error.message}`]);
        }
      }

      // ÉTAPE 7: Terminé
      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        validRows,
        errorRows,
        participants: Object.fromEntries(participantData),
        mesuresCount: updatedCount,
        month
      }));

      setDebugLogs(prev => [...prev, `🎉 TERMINÉ: ${updatedCount} participants mis à jour avec frais réseaux`]);
      toast.success(`✅ Import terminé ! ${updatedCount} participants mis à jour`);

    } catch (error: any) {
      setDebugLogs(prev => [...prev, `❌ ERREUR: ${error.message}`]);

      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [error.message || 'Erreur inconnue']
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
    setState(prev => ({ ...prev, status: 'idle', canPause: false }));
  };

  const downloadErrorReport = () => {
    const report = [
      'Rapport d\'erreurs d\'import',
      '========================',
      '',
      `Fichier: ${file?.name}`,
      `Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      '',
      `Lignes traitées: ${state.currentRow}`,
      `Lignes valides: ${state.validRows}`,
      `Lignes en erreur: ${state.errorRows}`,
      '',
      'Erreurs:',
      ...state.errors,
      '',
      'Avertissements:',
      ...state.warnings
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-erreurs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-semibold">Import Excel Quart-Horaire</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* File Selection */}
          {state.status === 'idle' && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-brand-teal transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-neutral-700 mb-2">
                  Glissez votre fichier Excel APR2025 ici
                </p>
                <p className="text-neutral-500 mb-4">
                  ou cliquez pour sélectionner un fichier
                </p>
                <p className="text-sm text-gray-400">
                  Format attendu: Volumes_et_tarifs_mensuels_ESTOURETTAXIS_APR2025.xlsx
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file && (
                <div className="bg-brand-teal border border-brand-teal rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-brand-teal" />
                    <span className="font-medium text-brand-teal">{file.name}</span>
                    <span className="text-sm text-brand-teal">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}

              {file && (
                <div className="flex justify-end">
                  <button
                    onClick={processFile}
                    className="bg-brand-gold text-white px-6 py-2 rounded-lg hover:bg-brand-gold-light transition-colors flex items-center space-x-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Commencer l'import</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing Status */}
          {(state.status === 'reading' || state.status === 'processing' || state.status === 'paused') && (
            <div className="space-y-6">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {state.status === 'paused' ? (
                      <Pause className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-brand-teal animate-spin" />
                    )}
                    <span className="font-medium text-brand-teal">
                      {state.status === 'reading' && 'Lecture du fichier...'}
                      {state.status === 'processing' && 'Traitement en cours...'}
                      {state.status === 'paused' && 'Traitement en pause'}
                    </span>
                  </div>
                  
                  {state.canPause && (
                    <div className="flex space-x-2">
                      {state.status === 'processing' && (
                        <button
                          onClick={pauseProcessing}
                          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors flex items-center space-x-1"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      )}
                      {state.status === 'paused' && (
                        <button
                          onClick={resumeProcessing}
                          className="bg-brand-teal text-white px-3 py-1 rounded text-sm hover:bg-brand-teal transition-colors flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Reprendre</span>
                        </button>
                      )}
                      <button
                        onClick={stopProcessing}
                        className="bg-brand-flame/10 text-white px-3 py-1 rounded text-sm hover:bg-brand-flame/10 transition-colors flex items-center space-x-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Arrêter</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="w-full bg-neutral-100 rounded-full h-2">
                    <div
                      className="bg-brand-teal h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-neutral-700">{state.progress}%</div>
                      <div className="text-neutral-500">Progression</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-neutral-700">{state.currentRow.toLocaleString()}</div>
                      <div className="text-neutral-500">Ligne actuelle</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-brand-teal">{state.validRows.toLocaleString()}</div>
                      <div className="text-neutral-500">Lignes valides</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-brand-flame">{state.errorRows.toLocaleString()}</div>
                      <div className="text-neutral-500">Erreurs</div>
                    </div>
                  </div>

                  {state.totalBatches > 0 && (
                    <div className="text-center text-sm text-neutral-600">
                      Lot {state.batchesProcessed} / {state.totalBatches}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Errors */}
              {state.errors.length > 0 && (
                <div className="bg-brand-flame border border-brand-flame rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-brand-flame" />
                    <span className="font-medium text-brand-flame">Erreurs récentes</span>
                  </div>
                  <div className="space-y-1 text-sm text-brand-flame">
                    {state.errors.slice(-5).map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                    {state.errors.length > 5 && (
                      <div className="text-brand-flame italic">
                        ... et {state.errors.length - 5} autres erreurs
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completion Status */}
          {state.status === 'completed' && (
            <div className="space-y-6">
              <div className="bg-brand-teal border border-brand-teal rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-brand-teal mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-teal mb-2">
                  Import terminé avec succès!
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-brand-teal">{state.validRows.toLocaleString()}</div>
                    <div className="text-brand-teal">Lignes traitées</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-brand-teal">{Object.keys(state.participants).length}</div>
                    <div className="text-brand-teal">Participants trouvés</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-brand-teal">{state.mesuresCount || Object.keys(state.participants).length}</div>
                    <div className="text-brand-teal">Participants mis à jour</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-orange-700">{state.errorRows.toLocaleString()}</div>
                    <div className="text-orange-600">EANs ignorés</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-brand-teal">{state.totalRows.toLocaleString()}</div>
                    <div className="text-brand-teal">Lignes totales</div>
                  </div>
                </div>
                
                {/* Message de résumé */}
                <div className="mt-4 p-4 bg-white border border-brand-teal rounded-lg">
                  <p className="text-brand-teal font-medium">
                    ✅ {Object.keys(state.participants).length} participant(s) ont eu leurs données mises à jour avec succès
                  </p>
                  {state.errorRows > 0 && (
                    <p className="text-orange-700 text-sm mt-2">
                      ⚠️ {state.errorRows} EAN(s) non reconnu(s) ont été ignoré(s)
                    </p>
                  )}
                  <div className="mt-3 text-sm text-neutral-600">
                    💡 Les logs de debug ci-dessous montrent le détail du traitement
                  </div>
                </div>
              </div>

              {(state.errors.length > 0 || state.warnings.length > 0) && (
                <div className="flex justify-center">
                  <button
                    onClick={downloadErrorReport}
                    className="bg-brand-teal text-white px-4 py-2 rounded-lg hover:bg-brand-teal-light transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger le rapport</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Status */}
          {state.status === 'error' && (
            <div className="bg-brand-flame border border-brand-flame rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-brand-flame" />
                <h3 className="text-lg font-semibold text-brand-flame">
                  Erreur lors de l'import
                </h3>
              </div>
              
              <div className="space-y-4">
                {state.errors.map((error, index) => (
                  <div key={index} className="bg-white border border-brand-flame rounded p-4">
                    <pre className="text-sm text-brand-flame whitespace-pre-wrap font-mono overflow-x-auto">
                      {error}
                    </pre>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={downloadTemplate}
                  className="bg-brand-teal text-white px-4 py-2 rounded-lg hover:bg-brand-teal-light transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le template</span>
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, status: 'idle', errors: [], warnings: [] }))}
                  className="bg-brand-flame/10 text-white px-4 py-2 rounded-lg hover:bg-brand-flame/10 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Debug Logs */}
          {debugLogs.length > 0 && (state.status === 'processing' || state.status === 'completed' || state.status === 'error') && (
            <div className="bg-white border border-neutral-300 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-neutral-900 mb-3 flex items-center">
                <Info className="w-4 h-4 mr-2" />
                Logs de debug ({debugLogs.length} entrées)
              </h4>
              <div className="bg-white border border-neutral-300 rounded p-3 max-h-60 overflow-y-auto">
                <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-mono">
                  {debugLogs.join('\n')}
                </pre>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    const logText = debugLogs.join('\n');
                    const blob = new Blob([logText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `debug-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-brand-teal hover:text-brand-teal text-sm underline"
                >
                  Télécharger les logs
                </button>
              </div>
            </div>
          )}

          {/* Help Section */}
          {state.status === 'idle' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-brand-teal mt-0.5" />
                <div className="text-sm text-brand-teal">
                  <p className="font-medium mb-2">Format attendu (les EAN non reconnus seront ignorés) :</p>
                  <ul className="list-disc list-inside space-y-1 text-brand-teal">
                    <li>Fichier Excel (.xlsx ou .xls)</li>
                    <li>Colonnes : EAN, Date, Type de flux, Volume (kWh)</li>
                    <li>Codes EAN de 18 chiffres (ex: 541448000000000001)</li>
                    <li>Les codes EAN doivent correspondre aux participants enregistrés</li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={downloadTemplate}
                      className="text-brand-teal hover:text-brand-teal underline text-sm flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger le template d'exemple</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de rapport d'import */}
      <ImportReportModal 
        isOpen={showReportModal} 
        onClose={handleCloseReportModal} 
        report={importReport} 
      />
    </div>
  );
}