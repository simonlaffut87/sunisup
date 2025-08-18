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

    console.log('🚀 DÉBUT IMPORT BASIQUE');
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

    try {
      // Étape 1: Charger les participants
      console.log('📋 Chargement des participants...');
      setState(prev => ({ ...prev, progress: 10 }));
      
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) {
        console.error('❌ Erreur participants:', error);
        throw error;
      }
      
      console.log('✅ Participants chargés:', participants?.length || 0);

      // Créer le mapping
      const participantMapping = participants.reduce((acc, p) => {
        if (p.ean_code) {
          acc[p.ean_code] = {
            name: p.name,
            type: p.type,
            id: p.id
          };
        }
        return acc;
      }, {});
      
      console.log('🗺️ Mapping créé:', Object.keys(participantMapping).length, 'participants');

      // Étape 2: Lire le fichier
      console.log('📖 Lecture du fichier...');
      setState(prev => ({ ...prev, progress: 30, status: 'processing' }));
      
      const readResult = await BasicFileReader.readFile(file);
      
      if (!readResult.success) {
        console.error('❌ Erreur lecture:', readResult.error);
        throw new Error(readResult.error || 'Erreur de lecture');
      }
      
      console.log('✅ Fichier lu avec succès');
      
      // Étape 3: Traiter les données
      console.log('⚙️ Traitement des données...');
      setState(prev => ({ ...prev, progress: 70 }));
      
      const processedData = BasicFileReader.processExtractedData(
        readResult.data!,
        participantMapping,
        file.name
      );
      
      console.log('✅ Données traitées:', processedData);

      // Étape 4: Finaliser
      console.log('🎯 Finalisation...');
      setState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        validRows: processedData.stats.validRowsImported,
        errorRows: processedData.stats.unknownEansSkipped,
        totalRows: processedData.stats.totalRowsProcessed,
        mesuresCount: processedData.stats.participantsUpdated,
        participants: processedData.participants,
        month: processedData.month
      }));
      
      console.log('🎉 Import terminé avec succès !');
      
      // Créer le rapport d'import
      const report = {
        filename: file.name,
        month: processedData.month,
        stats: processedData.stats,
        participants: processedData.participants,
        errors: [],
        warnings: []
      };
      
      setImportReport(processedData);
      
      // Attendre un peu pour que l'utilisateur voie le succès
      setTimeout(() => {
        setShowReportModal(true);
      }, 1000);
      
      // Notifier le parent du succès
      onSuccess(processedData);
      
      // Afficher un toast de succès
      toast.success(`✅ Import réussi ! ${processedData.stats.validRowsImported} lignes importées`);
      
    } catch (error: any) {
      console.error('Error processing file:', error);
      console.error('Stack trace:', error.stack);
      
      setState(prev => ({
        ...prev,
        status: 'error',
        errors: [error.message || 'Erreur inconnue']
      }));
      
      toast.error(`❌ Erreur d'import: ${error.message}`);
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
                  Glissez votre fichier Excel APR2025 ici
                </p>
                <p className="text-gray-500 mb-4">
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
                    className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-700">{state.validRows.toLocaleString()}</div>
                    <div className="text-green-600">Lignes traitées</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-700">{Object.keys(state.participants).length}</div>
                    <div className="text-blue-600">Participants trouvés</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-700">{state.mesuresCount || Object.keys(state.participants).length}</div>
                    <div className="text-green-600">Participants mis à jour</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-orange-700">{state.errorRows.toLocaleString()}</div>
                    <div className="text-orange-600">EANs ignorés</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-purple-700">{state.totalRows.toLocaleString()}</div>
                    <div className="text-purple-600">Lignes totales</div>
                  </div>
                </div>
                
                {/* Message de résumé */}
                <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✅ {Object.keys(state.participants).length} participant(s) ont eu leurs données mises à jour avec succès
                  </p>
                  {state.errorRows > 0 && (
                    <p className="text-orange-700 text-sm mt-2">
                      ⚠️ {state.errorRows} EAN(s) non reconnu(s) ont été ignoré(s)
                    </p>
                  )}
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Erreur lors de l'import
                </h3>
              </div>
              
              <div className="space-y-4">
                {state.errors.map((error, index) => (
                  <div key={index} className="bg-white border border-red-200 rounded p-4">
                    <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono overflow-x-auto">
                      {error}
                    </pre>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={downloadTemplate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le template</span>
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, status: 'idle', errors: [], warnings: [] }))}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Help Section */}
          {state.status === 'idle' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Format attendu (les EAN non reconnus seront ignorés) :</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Fichier Excel (.xlsx ou .xls)</li>
                    <li>Colonnes : EAN, Date, Type de flux, Volume (kWh)</li>
                    <li>Codes EAN de 18 chiffres (ex: 541448000000000001)</li>
                    <li>Les codes EAN doivent correspondre aux participants enregistrés</li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={downloadTemplate}
                      className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center space-x-1"
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