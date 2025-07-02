import React, { useState, useCallback } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  participantType: 'producer' | 'consumer';
  userId?: string;
  onSuccess: () => void;
}

interface EnergyDataRow {
  timestamp: string;
  consumption: number;
  production?: number;
  shared_energy: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: EnergyDataRow[];
  summary: {
    totalRows: number;
    validRows: number;
    dateRange: { start: string; end: string } | null;
  };
}

export function ExcelImportModal({ 
  isOpen, 
  onClose, 
  participantId, 
  participantName, 
  participantType,
  userId,
  onSuccess 
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'import'>('upload');

  const downloadTemplate = () => {
    // Créer un template Excel avec des données d'exemple
    const templateData = [
      ['Date/Heure', 'Consommation (kWh)', participantType === 'producer' ? 'Production (kWh)' : '', 'Énergie Partagée (kWh)'],
      ['2024-01-01 00:00', '2.5', participantType === 'producer' ? '0' : '', '0.8'],
      ['2024-01-01 00:15', '2.3', participantType === 'producer' ? '0' : '', '0.7'],
      ['2024-01-01 00:30', '2.1', participantType === 'producer' ? '0' : '', '0.6'],
      ['2024-01-01 00:45', '2.0', participantType === 'producer' ? '0' : '', '0.5'],
      ['2024-01-01 01:00', '1.8', participantType === 'producer' ? '0' : '', '0.4'],
      ['...', '...', participantType === 'producer' ? '...' : '', '...'],
    ].map(row => participantType === 'consumer' ? [row[0], row[1], row[3]] : row);

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données Énergétiques');
    
    // Ajuster la largeur des colonnes
    ws['!cols'] = [
      { width: 20 }, // Date/Heure
      { width: 20 }, // Consommation
      ...(participantType === 'producer' ? [{ width: 20 }] : []), // Production
      { width: 20 }, // Énergie Partagée
    ];

    XLSX.writeFile(wb, `template_donnees_energetiques_${participantType}.xlsx`);
  };

  const validateExcelData = useCallback((data: any[][]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validData: EnergyDataRow[] = [];

    if (data.length < 2) {
      errors.push('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données');
      return { isValid: false, errors, warnings, data: [], summary: { totalRows: 0, validRows: 0, dateRange: null } };
    }

    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const expectedHeaders = participantType === 'producer' 
      ? ['date', 'consommation', 'production', 'énergie partagée']
      : ['date', 'consommation', 'énergie partagée'];

    // Vérifier les en-têtes
    const hasDateColumn = headers.some(h => h.includes('date') || h.includes('heure') || h.includes('timestamp'));
    const hasConsumptionColumn = headers.some(h => h.includes('consommation') || h.includes('consumption'));
    const hasSharedEnergyColumn = headers.some(h => h.includes('partagée') || h.includes('shared') || h.includes('partage'));
    const hasProductionColumn = headers.some(h => h.includes('production'));

    if (!hasDateColumn) {
      errors.push('Colonne date/heure manquante. Attendu: une colonne contenant "date", "heure" ou "timestamp"');
    }
    if (!hasConsumptionColumn) {
      errors.push('Colonne consommation manquante. Attendu: une colonne contenant "consommation" ou "consumption"');
    }
    if (!hasSharedEnergyColumn) {
      errors.push('Colonne énergie partagée manquante. Attendu: une colonne contenant "partagée", "shared" ou "partage"');
    }
    if (participantType === 'producer' && !hasProductionColumn) {
      warnings.push('Colonne production manquante pour un producteur. Les valeurs de production seront mises à 0');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings, data: [], summary: { totalRows: 0, validRows: 0, dateRange: null } };
    }

    // Identifier les index des colonnes
    const dateIndex = headers.findIndex(h => h.includes('date') || h.includes('heure') || h.includes('timestamp'));
    const consumptionIndex = headers.findIndex(h => h.includes('consommation') || h.includes('consumption'));
    const sharedEnergyIndex = headers.findIndex(h => h.includes('partagée') || h.includes('shared') || h.includes('partage'));
    const productionIndex = headers.findIndex(h => h.includes('production'));

    let validRowCount = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    // Traiter les données (ignorer la ligne d'en-tête)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;

      if (!row || row.length === 0 || row.every(cell => !cell)) {
        continue; // Ignorer les lignes vides
      }

      try {
        // Valider et parser la date
        const dateValue = row[dateIndex];
        if (!dateValue) {
          warnings.push(`Ligne ${rowNumber}: Date manquante, ligne ignorée`);
          continue;
        }

        let timestamp: Date;
        if (typeof dateValue === 'number') {
          // Date Excel (nombre de jours depuis 1900)
          timestamp = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          // Chaîne de caractères
          timestamp = new Date(String(dateValue));
        }

        if (isNaN(timestamp.getTime())) {
          warnings.push(`Ligne ${rowNumber}: Format de date invalide "${dateValue}", ligne ignorée`);
          continue;
        }

        // Valider la consommation
        const consumptionValue = parseFloat(String(row[consumptionIndex] || 0));
        if (isNaN(consumptionValue) || consumptionValue < 0) {
          warnings.push(`Ligne ${rowNumber}: Valeur de consommation invalide "${row[consumptionIndex]}", mise à 0`);
        }

        // Valider l'énergie partagée
        const sharedEnergyValue = parseFloat(String(row[sharedEnergyIndex] || 0));
        if (isNaN(sharedEnergyValue) || sharedEnergyValue < 0) {
          warnings.push(`Ligne ${rowNumber}: Valeur d'énergie partagée invalide "${row[sharedEnergyIndex]}", mise à 0`);
        }

        // Valider la production (pour les producteurs)
        let productionValue = 0;
        if (participantType === 'producer' && productionIndex >= 0) {
          productionValue = parseFloat(String(row[productionIndex] || 0));
          if (isNaN(productionValue) || productionValue < 0) {
            warnings.push(`Ligne ${rowNumber}: Valeur de production invalide "${row[productionIndex]}", mise à 0`);
            productionValue = 0;
          }
        }

        // Vérifications logiques
        if (sharedEnergyValue > Math.max(consumptionValue, productionValue)) {
          warnings.push(`Ligne ${rowNumber}: L'énergie partagée (${sharedEnergyValue}) ne peut pas être supérieure à la consommation/production`);
        }

        const energyRow: EnergyDataRow = {
          timestamp: timestamp.toISOString(),
          consumption: Math.max(0, consumptionValue || 0),
          shared_energy: Math.max(0, sharedEnergyValue || 0),
          ...(participantType === 'producer' && { production: Math.max(0, productionValue) })
        };

        validData.push(energyRow);
        validRowCount++;

        // Mettre à jour la plage de dates
        if (!minDate || timestamp < minDate) minDate = timestamp;
        if (!maxDate || timestamp > maxDate) maxDate = timestamp;

      } catch (error) {
        warnings.push(`Ligne ${rowNumber}: Erreur de traitement - ${error.message}`);
      }
    }

    if (validRowCount === 0) {
      errors.push('Aucune ligne de données valide trouvée');
    }

    const dateRange = minDate && maxDate ? {
      start: format(minDate, 'dd/MM/yyyy HH:mm'),
      end: format(maxDate, 'dd/MM/yyyy HH:mm')
    } : null;

    return {
      isValid: errors.length === 0 && validRowCount > 0,
      errors,
      warnings,
      data: validData,
      summary: {
        totalRows: data.length - 1, // Exclure l'en-tête
        validRows: validRowCount,
        dateRange
      }
    };
  }, [participantType]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setValidationResult(null);
    setStep('validate');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        toast.error('Le fichier Excel ne contient aucune feuille');
        setStep('upload');
        return;
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      const validation = validateExcelData(data as any[][]);
      setValidationResult(validation);

      if (validation.isValid) {
        toast.success(`Validation réussie: ${validation.summary.validRows} lignes valides trouvées`);
      } else {
        toast.error(`Validation échouée: ${validation.errors.length} erreur(s) trouvée(s)`);
      }

    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Erreur lors de la lecture du fichier Excel');
      setStep('upload');
    }
  }, [validateExcelData]);

  const handleImport = async () => {
    if (!validationResult?.isValid || !validationResult.data.length || !userId) {
      toast.error('Données invalides ou utilisateur non trouvé');
      return;
    }

    setUploading(true);
    setStep('import');

    try {
      // Supprimer les données existantes pour éviter les doublons
      const { error: deleteError } = await supabase
        .from('energy_data')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('Warning deleting existing data:', deleteError);
      }

      // Insérer les nouvelles données par lots de 100
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < validationResult.data.length; i += batchSize) {
        const batch = validationResult.data.slice(i, i + batchSize).map(row => ({
          user_id: userId,
          timestamp: row.timestamp,
          consumption: row.consumption,
          shared_energy: row.shared_energy,
          production: row.production || 0
        }));

        const { error: insertError } = await supabase
          .from('energy_data')
          .insert(batch);

        if (insertError) {
          throw insertError;
        }

        insertedCount += batch.length;
      }

      toast.success(
        `Import réussi!\n\n` +
        `• ${insertedCount} lignes importées\n` +
        `• Participant: ${participantName}\n` +
        `• Période: ${validationResult.summary.dateRange?.start} - ${validationResult.summary.dateRange?.end}\n` +
        `• Type: ${participantType === 'producer' ? 'Producteur' : 'Consommateur'}`
      );

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Erreur lors de l\'import des données: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setValidationResult(null);
    setStep('upload');
    setUploading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Import de données Excel</h2>
              <p className="text-gray-600 mt-1">
                {participantName} ({participantType === 'producer' ? 'Producteur' : 'Consommateur'})
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Instructions et template */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">Format de fichier requis</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>Votre fichier Excel doit contenir les colonnes suivantes :</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Date/Heure</strong> : Format YYYY-MM-DD HH:MM ou DD/MM/YYYY HH:MM</li>
                    <li><strong>Consommation (kWh)</strong> : Valeur numérique positive</li>
                    {participantType === 'producer' && (
                      <li><strong>Production (kWh)</strong> : Valeur numérique positive</li>
                    )}
                    <li><strong>Énergie Partagée (kWh)</strong> : Valeur numérique positive</li>
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger le template Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      handleFileSelect(selectedFile);
                    }
                  }}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Sélectionner un fichier Excel
                  </h3>
                  <p className="text-gray-600">
                    Formats supportés: .xlsx, .xls, .csv
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Cliquez ici ou glissez-déposez votre fichier
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Validation */}
          {step === 'validate' && validationResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Résultats de validation</h3>
                <button
                  onClick={() => setStep('upload')}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{validationResult.summary.totalRows}</div>
                  <div className="text-sm text-gray-600">Lignes totales</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{validationResult.summary.validRows}</div>
                  <div className="text-sm text-gray-600">Lignes valides</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Période</div>
                  <div className="text-xs text-blue-700">
                    {validationResult.summary.dateRange ? (
                      <>
                        <div>Du: {validationResult.summary.dateRange.start}</div>
                        <div>Au: {validationResult.summary.dateRange.end}</div>
                      </>
                    ) : (
                      'Non déterminée'
                    )}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <h4 className="font-medium text-red-900">Erreurs ({validationResult.errors.length})</h4>
                  </div>
                  <ul className="text-sm text-red-800 space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <h4 className="font-medium text-yellow-900">Avertissements ({validationResult.warnings.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {validationResult.warnings.slice(0, 10).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {validationResult.warnings.length > 10 && (
                        <li className="text-yellow-600 italic">... et {validationResult.warnings.length - 10} autres avertissements</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Success */}
              {validationResult.isValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-medium text-green-900">Validation réussie</h4>
                  </div>
                  <p className="text-sm text-green-800 mt-1">
                    Le fichier est prêt à être importé. {validationResult.summary.validRows} lignes de données seront ajoutées.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Annuler
                </button>
                {validationResult.isValid && userId && (
                  <button
                    onClick={handleImport}
                    disabled={uploading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importer les données
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Import Progress */}
          {step === 'import' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-t-4 border-b-4 border-green-500 rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Import en cours...</h3>
              <p className="text-gray-600">
                Veuillez patienter pendant l'import des données dans la base de données.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}