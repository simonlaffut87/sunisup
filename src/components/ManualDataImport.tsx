import React, { useState } from 'react';
import { X, Copy, CheckCircle, AlertCircle, Database, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ManualDataImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export function ManualDataImport({ isOpen, onClose, onSuccess }: ManualDataImportProps) {
  const [textData, setTextData] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const addSection = (title: string) => {
    const separator = '='.repeat(50);
    addLog(`\n${separator}`);
    addLog(`📋 ${title.toUpperCase()}`);
    addLog(separator);
  };

  const addSubSection = (title: string) => {
    addLog(`\n--- ${title} ---`);
  };

  const addSuccess = (message: string) => {
    addLog(`✅ SUCCÈS: ${message}`);
  };

  const addError = (message: string) => {
    addLog(`❌ ERREUR: ${message}`);
  };

  const addWarning = (message: string) => {
    addLog(`⚠️ ATTENTION: ${message}`);
  };

  const addInfo = (message: string) => {
    addLog(`ℹ️ INFO: ${message}`);
  };
  const handleProcess = async () => {
    if (!textData.trim()) {
      toast.error('Veuillez coller vos données Excel');
      return;
    }

    setProcessing(true);
    setResults(null);
    setDebugLogs([]);
    
    addSection('DÉBUT DU TRAITEMENT MANUEL');
    addInfo(`Mois sélectionné: ${month}`);
    addInfo(`Taille des données: ${textData.length} caractères`);
    addInfo(`Nombre de lignes: ${textData.trim().split('\n').length}`);

    try {
      // Diviser en lignes
      const lines = textData.trim().split('\n');
      
      addSubSection('ANALYSE DES DONNÉES');
      addInfo(`Lignes trouvées: ${lines.length}`);

      if (lines.length < 2) {
        throw new Error('Il faut au moins une ligne d\'en-tête et une ligne de données');
      }

      // Première ligne = headers
      const headers = lines[0].split('\t').map(h => h.trim());
      addInfo(`Headers détectés: ${headers.length} colonnes`);
      addInfo(`Liste des headers: ${headers.join(' | ')}`);

      // Trouver les colonnes importantes
      const eanIndex = headers.findIndex(h => h.toLowerCase().includes('ean'));
      const registreIndex = headers.findIndex(h => {
        const header = h.toLowerCase();
        return header.includes('registre') || header.includes('register') || header.includes('compteur');
      });
      
      // Recherche plus flexible pour Volume Partagé
      const volumePartageIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('partage') || header.includes('partagee')) && 
               header.includes('consommation');
      });
      
      // Recherche plus flexible pour Volume Complémentaire
      const volumeComplementaireIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return header.includes('consommation') && 
               (header.includes('reseau') || header.includes('complementaire') || header.includes('residuel'));
      });
      
      // Recherche plus flexible pour Injection Partagée
      const injectionPartageIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('partage') || header.includes('partage')) && header.includes('injection');
      });
      
      // Recherche plus flexible pour Injection Complémentaire/Résiduelle
      const injectionComplementaireIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return header.includes('injection') && 
               (header.includes('reseau') || header.includes('complementaire') || header.includes('residuelle') || header.includes('residuel'));
      });
      
      addSubSection('MAPPING DES COLONNES');
      
      if (eanIndex >= 0) {
        addSuccess(`Colonne EAN trouvée: "${headers[eanIndex]}" (position ${eanIndex})`);
      } else {
        addError('Colonne EAN NON TROUVÉE');
      }
      
      if (volumePartageIndex >= 0) {
        addSuccess(`Volume Partagé: "${headers[volumePartageIndex]}" (position ${volumePartageIndex})`);
      } else {
        addWarning('Volume Partagé non trouvé');
      }
      
      if (volumeComplementaireIndex >= 0) {
        addSuccess(`Volume Complémentaire: "${headers[volumeComplementaireIndex]}" (position ${volumeComplementaireIndex})`);
      } else {
        addWarning('Volume Complémentaire non trouvé');
      }
      
      if (injectionPartageIndex >= 0) {
        addSuccess(`Injection Partagée: "${headers[injectionPartageIndex]}" (position ${injectionPartageIndex})`);
      } else {
        addWarning('Injection Partagée non trouvée');
      }
      
      if (injectionComplementaireIndex >= 0) {
        addSuccess(`Injection Réseau: "${headers[injectionComplementaireIndex]}" (position ${injectionComplementaireIndex})`);
      } else {
        addWarning('Injection Réseau non trouvée');
      }
      
      if (registreIndex >= 0) {
        addInfo(`Registre: "${headers[registreIndex]}" (position ${registreIndex})`);
      } else {
        addInfo('Colonne Registre non trouvée (optionnelle)');
      }

      if (eanIndex === -1) {
        throw new Error('Colonne EAN non trouvée. Assurez-vous qu\'une colonne contient "EAN"');
      }

      // Charger les participants
      addSubSection('CHARGEMENT DES PARTICIPANTS');
      addInfo('Connexion à la base de données...');
      
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) {
        addError(`Impossible de charger les participants: ${error.message}`);
        throw error;
      }
      
      addSuccess(`${participants?.length || 0} participants chargés depuis la base`);

      const participantMapping: { [ean: string]: any } = {};
      participants?.forEach(p => {
        if (p.ean_code) {
          participantMapping[p.ean_code] = {
            name: p.name,
            type: p.type,
            id: p.id
          };
        }
      });

      addSuccess(`${Object.keys(participantMapping).length} participants avec code EAN trouvés`);
      addInfo(`EAN disponibles: ${Object.keys(participantMapping).slice(0, 5).join(', ')}${Object.keys(participantMapping).length > 5 ? '...' : ''}`);

      // Traiter les données ligne par ligne
      const participantData: { [ean: string]: any } = {};
      const unknownEans = new Set<string>();
      let validRows = 0;

      addSubSection('TRAITEMENT DES LIGNES DE DONNÉES');
      addInfo(`Traitement de ${lines.length - 1} lignes de données...`);

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t').map(cell => cell.trim());
        
        if (row.length < headers.length) continue;

        const eanCodeRaw = row[eanIndex]?.trim();
        const eanCode = eanCodeRaw?.replace(/[^0-9]/g, ''); // Nettoyer l'EAN
        if (!eanCode) continue;
        
        // Récupérer le registre seulement s'il existe
        const registre = registreIndex >= 0 ? String(row[registreIndex] || '').trim().toUpperCase() : '';


        // Essayer d'abord avec l'EAN nettoyé, puis avec l'EAN brut
        const mappedParticipant = participantMapping[eanCode] || participantMapping[eanCodeRaw];
        
        if (mappedParticipant) {
          const finalEan = participantMapping[eanCode] ? eanCode : eanCodeRaw;
          
          if (!participantData[finalEan]) {
            participantData[finalEan] = {
              ...mappedParticipant,
              data: {
                volume_partage: 0,
                volume_complementaire: 0,
                injection_partagee: 0,
                injection_complementaire: 0
              }
            };
            addLog(`✅ Participant initialisé: ${mappedParticipant.name} (${finalEan})`);
          }

          // Fonction pour nettoyer et parser les valeurs numériques
          const parseValue = (value: any) => {
            if (!value) return 0;
            const cleaned = String(value)
              .replace(/,/g, '.') // Virgule -> point
              .replace(/\s/g, '') // Supprimer espaces
              .replace(/[^\d.-]/g, ''); // Garder seulement chiffres, point et tiret
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };
          
          const volumePartage = parseValue(row[volumePartageIndex]);
          const volumeComplementaire = parseValue(row[volumeComplementaireIndex]);
          const injectionPartage = parseValue(row[injectionPartageIndex]);
          const injectionComplementaire = parseValue(row[injectionComplementaireIndex]);
          
          // Log détaillé seulement pour les 3 premières lignes avec des valeurs
          if (i <= 3 && (volumePartage > 0 || volumeComplementaire > 0 || injectionPartage > 0 || injectionComplementaire > 0)) {
            addInfo(`Ligne ${i} - ${mappedParticipant.name}:`);
            addInfo(`  Volume Partagé: ${volumePartage} kWh`);
            addInfo(`  Volume Complémentaire: ${volumeComplementaire} kWh`);
            addInfo(`  Injection Partagée: ${injectionPartage} kWh`);
            addInfo(`  Injection Complémentaire: ${injectionComplementaire} kWh`);
          }

          // Additionner les valeurs (utiliser finalEan pour la cohérence)
          participantData[finalEan].data.volume_partage += volumePartage;
          participantData[finalEan].data.volume_complementaire += volumeComplementaire;
          participantData[finalEan].data.injection_partagee += injectionPartage;
          participantData[finalEan].data.injection_complementaire += injectionComplementaire;

          validRows++;

        } else {
          unknownEans.add(eanCode);
          
          // Log seulement les 3 premiers EAN non reconnus
          if (unknownEans.size <= 3) {
            addWarning(`EAN non reconnu: ${eanCode}`);
          }
        }
      }

      addSubSection('RÉSUMÉ DU TRAITEMENT');
      addSuccess(`${validRows} lignes valides traitées`);
      addSuccess(`${Object.keys(participantData).length} participants mis à jour`);
      if (unknownEans.size > 0) {
        addWarning(`${unknownEans.size} EAN non reconnus ignorés`);
      }

      // Mettre à jour la base de données
      addSubSection('SAUVEGARDE EN BASE DE DONNÉES');
      addInfo('Début de la mise à jour des participants...');
      
      let updateSuccessCount = 0;
      let updateErrorCount = 0;
      
      for (const [eanCode, data] of Object.entries(participantData)) {
        addInfo(`Traitement: ${(data as any).name} (${eanCode})`);
        
        const { data: participant, error: findError } = await supabase
          .from('participants')
          .select('id, monthly_data, name')
          .eq('ean_code', eanCode)
          .limit(1);

        if (findError) {
          addError(`Impossible de trouver le participant ${eanCode}: ${findError.message}`);
          updateErrorCount++;
          continue;
        }
        
        if (!participant || participant.length === 0) {
          addError(`Participant non trouvé pour EAN: ${eanCode}`);
          updateErrorCount++;
          continue;
        }
        
        const participantData = participant[0];
        addInfo(`Participant trouvé: ${participantData.name}`);
        
        let existingData = {};
        if (participantData.monthly_data) {
          try {
            if (typeof participantData.monthly_data === 'string') {
              existingData = JSON.parse(participantData.monthly_data);
            } else {
              existingData = participantData.monthly_data;
            }
          } catch (e) {
            addWarning(`Erreur parsing données existantes pour ${participantData.name}`);
            existingData = {};
          }
        } else {
          
          // Log seulement pour les 3 premiers participants trouvés
          if (Object.keys(participantData).length <= 3) {
          }
        }

        const newMonthData = {
          volume_partage: (data as any).data.volume_partage,
          volume_complementaire: (data as any).data.volume_complementaire,
          injection_partagee: (data as any).data.injection_partagee,
          injection_complementaire: (data as any).data.injection_complementaire,
          updated_at: new Date().toISOString()
        };
        
        const updatedData = {
          ...existingData,
          [month]: newMonthData
        };
        
        // Log détaillé seulement pour les 2 premiers participants
        if (updateSuccessCount + updateErrorCount < 2) {
          addInfo(`Données pour ${month}:`);
          addInfo(`  Volume Partagé: ${newMonthData.volume_partage} kWh`);
          addInfo(`  Volume Complémentaire: ${newMonthData.volume_complementaire} kWh`);
          addInfo(`  Injection Partagée: ${newMonthData.injection_partagee} kWh`);
          addInfo(`  Injection Complémentaire: ${newMonthData.injection_complementaire} kWh`);
        }

        const { data: updateResult, error: updateError } = await supabase
          .from('participants')
          .update({ 
            monthly_data: updatedData
          })
          .eq('id', participantData.id)
          .select('monthly_data');

        if (updateError) {
          addError(`Échec sauvegarde ${participantData.name}: ${updateError.message}`);
          updateErrorCount++;
        } else {
          addSuccess(`Sauvegarde réussie: ${participantData.name}`);
          updateSuccessCount++;
          
          // Vérification seulement pour les 2 premiers
          if (updateSuccessCount <= 2) {
            addInfo('Vérification de la sauvegarde...');
          }
          
          const { data: verifyData, error: verifyError } = await supabase
            .from('participants')
            .select('monthly_data')
            .eq('id', participantData.id)
            .limit(1);
          
          if (verifyError) {
            addWarning(`Erreur vérification ${participantData.name}: ${verifyError.message}`);
          } else {
            if (verifyData && verifyData.length > 0 && verifyData[0].monthly_data && verifyData[0].monthly_data[month]) {
              if (updateSuccessCount <= 2) {
                addSuccess(`Données ${month} confirmées en base pour ${participantData.name}`);
              }
            } else {
              addError(`Données ${month} non trouvées après sauvegarde pour ${participantData.name}`);
            }
          }
        }
      }
      
      addLog(`📊 RÉSUMÉ FINAL: ${updateSuccessCount} succès, ${updateErrorCount} erreurs`);
      
      // ÉTAPE 7: Vérification globale finale
      addLog('🔍 VÉRIFICATION GLOBALE FINALE...');
      const { data: allParticipants, error: finalCheckError } = await supabase
        .from('participants')
        .select('name, ean_code, monthly_data')
        .not('monthly_data', 'is', null);
      
      if (finalCheckError) {
        addLog(`❌ ERREUR VÉRIFICATION GLOBALE: ${JSON.stringify(finalCheckError)}`);
      } else {
        addLog(`✅ VÉRIFICATION GLOBALE: ${allParticipants?.length || 0} participants avec monthly_data`);
        allParticipants?.forEach(p => {
          if (p.monthly_data && p.monthly_data[month]) {
            addLog(`✅ ${p.name} (${p.ean_code}): données ${month} présentes`);
          }
        });
      }

      // ÉTAPE 8: Sauvegarde localStorage
      addSubSection('SAUVEGARDE LOCALE');
      try {
        const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
        
        monthlyData[month] = {
          month,
          participants: participantData,
          stats: {
            totalRowsProcessed: lines.length - 1,
            validRowsImported: validRows,
            participantsFound: Object.keys(participantData).length,
            unknownEansSkipped: unknownEans.size
          },
          upload_date: new Date().toISOString(),
          filename: `manual-import-${month}.txt`
        };
        
        localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
        addSuccess(`Données sauvegardées localement pour ${month}`);
      } catch (error) {
        addError(`Erreur sauvegarde locale: ${error.message}`);
      }

      addSubSection('VÉRIFICATION FINALE');
      try {
        const { data: allParticipants, error: finalError } = await supabase
          .from('participants')
          .select('name, ean_code, monthly_data')
          .not('monthly_data', 'is', null);
        
        if (finalError) {
          addLog(`❌ ERREUR vérification finale: ${JSON.stringify(finalError)}`);
        } else {
          addSuccess(`${allParticipants?.length || 0} participants avec données mensuelles en base`);
          
          // Vérifier seulement les participants traités
          let confirmedCount = 0;
          Object.keys(participantData).forEach(eanCode => {
            const foundInDB = allParticipants?.find(p => p.ean_code === eanCode);
            if (foundInDB && foundInDB.monthly_data && foundInDB.monthly_data[month]) {
              confirmedCount++;
            }
          });
          
          if (confirmedCount === Object.keys(participantData).length) {
            addSuccess(`Toutes les données ${month} confirmées en base !`);
          } else {
            addWarning(`${confirmedCount}/${Object.keys(participantData).length} participants confirmés en base`);
          }
        }
      } catch (error) {
        addWarning(`Erreur vérification finale: ${error.message}`);
      }
      const finalResults = {
        month,
        participants: participantData,
        stats: {
          totalRowsProcessed: lines.length - 1,
          validRowsImported: validRows,
          participantsFound: Object.keys(participantData).length,
          unknownEansSkipped: unknownEans.size
        },
        headers,
        columnIndices: {
          ean: eanIndex,
          volumePartage: volumePartageIndex,
          volumeComplementaire: volumeComplementaireIndex,
          injectionPartage: injectionPartageIndex,
          injectionComplementaire: injectionComplementaireIndex
        }
      };

      setResults(finalResults);
      
      addSection('IMPORT TERMINÉ');
      if (updateSuccessCount > 0) {
        addSuccess(`IMPORT RÉUSSI ! ${updateSuccessCount} participants mis à jour`);
      } else {
        addError('IMPORT ÉCHOUÉ ! Aucun participant mis à jour');
      }
      
      addSubSection('RÉSUMÉ FINAL');
      if (updateSuccessCount > 0) {
        addSuccess(`${updateSuccessCount} participants mis à jour avec succès`);
      }
      if (updateErrorCount > 0) {
        addError(`${updateErrorCount} participants n'ont pas pu être mis à jour`);
      }
      
      if (updateSuccessCount === 0) {
        throw new Error('Aucun participant n\'a pu être mis à jour en base de données');
      }
    } catch (error) {
      addError(`Erreur générale: ${error.message}`);
      setProcessing(false);
      addError(`ERREUR GÉNÉRALE: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Copy className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-semibold">Import Manuel (Copier-Coller)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📋 Instructions :</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Ouvrez votre fichier Excel</li>
              <li>Sélectionnez TOUTES les données (Ctrl+A)</li>
              <li>Copiez (Ctrl+C)</li>
              <li>Collez dans la zone ci-dessous (Ctrl+V)</li>
              <li>Cliquez sur "Traiter les données"</li>
            </ol>
          </div>

          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mois des données
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Données Excel (copiées-collées)
            </label>
            <textarea
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              placeholder="Collez ici les données copiées depuis Excel..."
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono text-sm"
              disabled={processing}
            />
            <p className="text-xs text-gray-500 mt-1">
              {textData.split('\n').length - 1} lignes collées
            </p>
          </div>

          {/* Process Button */}
          <div className="flex justify-end">
            <button
              onClick={handleProcess}
              disabled={processing || !textData.trim()}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Traiter les données</span>
                </>
              )}
            </button>
          </div>

          {/* Debug Logs */}
          {debugLogs.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                📋 LOGS D'IMPORT ({debugLogs.length} entrées)
              </h4>
              <div className="bg-white border-2 border-yellow-200 rounded p-4 max-h-80 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {debugLogs.map((log, index) => (
                    <div key={index} className={`${
                      log.includes('❌') ? 'text-red-600' :
                      log.includes('✅') ? 'text-green-600' :
                      log.includes('⚠️') ? 'text-orange-600' :
                      log.includes('ℹ️') ? 'text-blue-600' :
                      log.includes('===') ? 'text-purple-600 font-bold' :
                      log.includes('---') ? 'text-indigo-600 font-medium' :
                      'text-gray-700'
                    } p-1 ${log.includes('===') || log.includes('---') ? 'border-b border-gray-200' : ''}`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 text-center">
                <button
                  onClick={() => {
                    const logText = debugLogs.join('\n');
                    navigator.clipboard.writeText(logText);
                    toast.success('Logs copiés dans le presse-papiers');
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-sm underline flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copier tous les logs
                </button>
              </div>
            </div>
          )}
          {/* Results */}
          {results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Import réussi !</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-600">Lignes traitées</div>
                  <div className="text-xl font-bold text-gray-900">{results.stats.totalRowsProcessed}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-600">Participants trouvés</div>
                  <div className="text-xl font-bold text-green-600">{results.stats.participantsFound}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-600">Lignes valides</div>
                  <div className="text-xl font-bold text-blue-600">{results.stats.validRowsImported}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-sm text-gray-600">EANs ignorés</div>
                  <div className="text-xl font-bold text-orange-600">{results.stats.unknownEansSkipped}</div>
                </div>
              </div>

              {/* Debug Info */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <h4 className="font-medium text-gray-900 mb-2">Informations de debug :</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Headers trouvés :</strong> {JSON.stringify(results.headers)}</div>
                  <div><strong>Index EAN :</strong> {results.columnIndices.ean}</div>
                  <div><strong>Index Volume Partagé :</strong> {results.columnIndices.volumePartage}</div>
                  <div><strong>Index Volume Complémentaire :</strong> {results.columnIndices.volumeComplementaire}</div>
                  <div><strong>Index Injection Partagée :</strong> {results.columnIndices.injectionPartage}</div>
                  <div><strong>Index Injection Complémentaire :</strong> {results.columnIndices.injectionComplementaire}</div>
                </div>
              </div>

              {/* Participants Data */}
              {Object.keys(results.participants).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Participants mis à jour :</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(results.participants).map(([ean, data]: [string, any]) => (
                      <div key={ean} className="bg-white border border-gray-200 rounded p-3 text-sm">
                        <div className="font-medium">{data.name} ({ean})</div>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-gray-600">
                          <div>Vol. Partagé: {data.data.volume_partage.toFixed(2)} kWh</div>
                          <div>Vol. Complémentaire: {data.data.volume_complementaire.toFixed(2)} kWh</div>
                          <div>Inj. Partagée: {data.data.injection_partagee.toFixed(2)} kWh</div>
                          <div>Inj. Complémentaire: {data.data.injection_complementaire.toFixed(2)} kWh</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action après traitement */}
          {results && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  const logText = debugLogs.join('\n');
                  navigator.clipboard.writeText(logText);
                  toast.success('Logs copiés dans le presse-papiers');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copier les logs</span>
              </button>
              <button
                onClick={() => {
                  onSuccess(results);
                  onClose();
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmer et fermer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}