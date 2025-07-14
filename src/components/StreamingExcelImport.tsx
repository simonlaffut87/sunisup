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

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setState(prev => ({ ...prev, status: 'reading', progress: 0 }));
    processingRef.current.shouldStop = false;
    processingRef.current.isPaused = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      processingRef.current.data = data;
      processingRef.current.headers = data[0] as string[];

      // Find column indices
      const headers = processingRef.current.headers;
      processingRef.current.columnIndices = {
        ean: headers.findIndex(h => h?.toLowerCase().includes('ean')),
        date: headers.findIndex(h => h?.toLowerCase().includes('date') || h?.toLowerCase().includes('horodatage')),
        flow: headers.findIndex(h => h?.toLowerCase().includes('flow') || h?.toLowerCase().includes('flux')),
        volume: headers.findIndex(h => h?.toLowerCase().includes('volume') || h?.toLowerCase().includes('valeur'))
      };

      // Load participants
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) throw error;

      processingRef.current.participantMapping = participants.reduce((acc, p) => {
        if (p.ean_code) {
          acc[p.ean_code] = p;
        }
        return acc;
      }, {});

      setState(prev => ({
        ...prev,
        status: 'processing',
        totalRows: data.length - 1,
        canPause: true
      }));

      await processData();
    } catch (error) {
      console.error('Error processing file:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [...prev.errors, `Erreur lors du traitement du fichier: ${error.message}`]
      }));
    }
  };

  const processData = async () => {
    const BATCH_SIZE = 100;
    const data = processingRef.current.data.slice(1); // Skip header
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    
    setState(prev => ({ ...prev, totalBatches }));

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      if (processingRef.current.shouldStop) break;

      while (processingRef.current.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (processingRef.current.shouldStop) break;
      }

      const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));
      await processBatch(batch, i);

      setState(prev => ({
        ...prev,
        batchesProcessed: Math.floor(i / BATCH_SIZE) + 1,
        progress: Math.round(((i + batch.length) / data.length) * 100)
      }));
    }

    if (!processingRef.current.shouldStop) {
      await saveMesures();
      setState(prev => ({ ...prev, status: 'completed' }));
      toast.success('Import terminé avec succès!');
      onSuccess(processingRef.current.mesures);
    }
  };

  const processBatch = async (batch: any[], startIndex: number) => {
    const { columnIndices } = processingRef.current;
    
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const rowIndex = startIndex + i + 2; // +2 for header and 0-based index

      setState(prev => ({ ...prev, currentRow: rowIndex }));

      try {
        const ean = row[columnIndices.ean];
        const dateValue = row[columnIndices.date];
        const flowValue = row[columnIndices.flow];
        const volumeValue = row[columnIndices.volume];

        if (!ean || !dateValue) {
          setState(prev => ({
            ...prev,
            errorRows: prev.errorRows + 1,
            errors: [...prev.errors, `Ligne ${rowIndex}: EAN ou date manquant`]
          }));
          continue;
        }

        // Convert date
        let date: Date;
        if (typeof dateValue === 'number') {
          date = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          date = new Date(dateValue);
        }

        if (isNaN(date.getTime())) {
          setState(prev => ({
            ...prev,
            errorRows: prev.errorRows + 1,
            errors: [...prev.errors, `Ligne ${rowIndex}: Date invalide`]
          }));
          continue;
        }

        const horodatage = format(date, 'yyyy-MM-dd HH:mm:ss');

        // Add consumption data
        if (volumeValue !== undefined && volumeValue !== null) {
          processingRef.current.mesures.push({
            ean: ean.toString(),
            horodatage,
            type: 'consumption',
            valeur: parseFloat(volumeValue) || 0
          });
        }

        // Add production data if flow exists
        if (flowValue !== undefined && flowValue !== null) {
          processingRef.current.mesures.push({
            ean: ean.toString(),
            horodatage,
            type: 'production',
            valeur: parseFloat(flowValue) || 0
          });
        }

        setState(prev => ({ ...prev, validRows: prev.validRows + 1 }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          errorRows: prev.errorRows + 1,
          errors: [...prev.errors, `Ligne ${rowIndex}: ${error.message}`]
        }));
      }
    }
  };

  const saveMesures = async () => {
    const mesures = processingRef.current.mesures;
    if (mesures.length === 0) return;

    // Group by participant and save
    const groupedByEan = mesures.reduce((acc, mesure) => {
      if (!acc[mesure.ean]) acc[mesure.ean] = [];
      acc[mesure.ean].push(mesure);
      return acc;
    }, {} as { [ean: string]: typeof mesures });

    for (const [ean, eanMesures] of Object.entries(groupedByEan)) {
      const participant = processingRef.current.participantMapping[ean];
      if (!participant) continue;

      // Convert to energy_data format
      const energyData = eanMesures.map(mesure => ({
        user_id: null, // Will be set by trigger or admin
        timestamp: mesure.horodatage,
        consumption: mesure.type === 'consumption' ? mesure.valeur : 0,
        production: mesure.type === 'production' ? mesure.valeur : 0,
        shared_energy: 0
      }));

      // Insert in batches
      const SAVE_BATCH_SIZE = 1000;
      for (let i = 0; i < energyData.length; i += SAVE_BATCH_SIZE) {
        const batch = energyData.slice(i, i + SAVE_BATCH_SIZE);
        const { error } = await supabase
          .from('energy_data')
          .insert(batch);

        if (error) {
          console.error('Error saving batch:', error);
          setState(prev => ({
            ...prev,
            errors: [...prev.errors, `Erreur sauvegarde EAN ${ean}: ${error.message}`]
          }));
        }
      }
    }

    setState(prev => ({ ...prev, mesuresCount: mesures.length }));
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
      `Date: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold">Import Excel Streaming</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* File Selection */}
          {state.status === 'idle' && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Glissez votre fichier Excel ici
                </p>
                <p className="text-gray-500 mb-4">
                  ou cliquez pour sélectionner un fichier
                </p>
                <p className="text-sm text-gray-400">
                  Formats supportés: .xlsx, .xls
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">{file.name}</span>
                    <span className="text-sm text-green-600">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}

              {file && (
                <div className="flex justify-end">
                  <button
                    onClick={processFile}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {state.status === 'paused' ? (
                      <Pause className="w-5 h-5 text-orange-600" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    <span className="font-medium text-blue-800">
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
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Reprendre</span>
                        </button>
                      )}
                      <button
                        onClick={stopProcessing}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center space-x-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Arrêter</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-700">{state.progress}%</div>
                      <div className="text-gray-500">Progression</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-700">{state.currentRow.toLocaleString()}</div>
                      <div className="text-gray-500">Ligne actuelle</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{state.validRows.toLocaleString()}</div>
                      <div className="text-gray-500">Lignes valides</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{state.errorRows.toLocaleString()}</div>
                      <div className="text-gray-500">Erreurs</div>
                    </div>
                  </div>

                  {state.totalBatches > 0 && (
                    <div className="text-center text-sm text-gray-600">
                      Lot {state.batchesProcessed} / {state.totalBatches}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Errors */}
              {state.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-800">Erreurs récentes</span>
                  </div>
                  <div className="space-y-1 text-sm text-red-700">
                    {state.errors.slice(-5).map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                    {state.errors.length > 5 && (
                      <div className="text-red-500 italic">
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Import terminé avec succès!
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-700">{state.validRows.toLocaleString()}</div>
                    <div className="text-green-600">Lignes traitées</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-700">{state.mesuresCount.toLocaleString()}</div>
                    <div className="text-green-600">Mesures importées</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-700">{state.errorRows.toLocaleString()}</div>
                    <div className="text-red-600">Erreurs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-700">{Object.keys(state.participants).length}</div>
                    <div className="text-blue-600">Participants</div>
                  </div>
                </div>
              </div>

              {(state.errors.length > 0 || state.warnings.length > 0) && (
                <div className="flex justify-center">
                  <button
                    onClick={downloadErrorReport}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-4">
                Erreur lors de l'import
              </h3>
              <div className="space-y-2 text-sm text-red-700 text-left max-h-40 overflow-y-auto">
                {state.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
              <button
                onClick={() => setState(prev => ({ ...prev, status: 'idle', errors: [], warnings: [] }))}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
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