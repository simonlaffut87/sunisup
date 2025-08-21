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

  const handleProcess = async () => {
    if (!textData.trim()) {
      toast.error('Veuillez coller vos données Excel');
      return;
    }

    setProcessing(true);
    setResults(null);
    setDebugLogs([]);
    addLog('🚀 DÉBUT DU TRAITEMENT MANUEL');

    try {
      // Diviser en lignes
      const lines = textData.trim().split('\n');
      addLog(`📊 Lignes trouvées: ${lines.length}`);

      if (lines.length < 2) {
        throw new Error('Il faut au moins une ligne d\'en-tête et une ligne de données');
      }

      // Première ligne = headers
      const headers = lines[0].split('\t').map(h => h.trim());
      addLog(`📋 Headers: ${JSON.stringify(headers)}`);

      // Trouver les colonnes importantes
      const eanIndex = headers.findIndex(h => h.toLowerCase().includes('ean'));
      const registreIndex = headers.findIndex(h => {
        const header = h.toLowerCase();
        return header.includes('registre') || header.includes('register') || header.includes('compteur');
      });
      
      // Recherche plus flexible pour Volume Partagé
      const volumePartageIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('partage') || header.includes('partage')) && header.includes('volume');
      });
      
      // Recherche plus flexible pour Volume Complémentaire
      const volumeComplementaireIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('complementaire') || header.includes('complementaire')) && header.includes('volume');
      });
      
      // Recherche plus flexible pour Injection Partagée
      const injectionPartageIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('partage') || header.includes('partage')) && header.includes('injection');
      });
      
      // Recherche plus flexible pour Injection Complémentaire/Résiduelle
      const injectionComplementaireIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[éè]/g, 'e');
        return (header.includes('complementaire') || header.includes('residuelle') || header.includes('residuel')) && header.includes('injection');
      });
      
      addLog('🔍 RECHERCHE DES COLONNES:');
      addLog(`📍 Index EAN: ${eanIndex} (${eanIndex >= 0 ? headers[eanIndex] : 'NON TROUVÉ'})`);
      addLog(`📍 Index Volume Partagé: ${volumePartageIndex} (${volumePartageIndex >= 0 ? headers[volumePartageIndex] : 'NON TROUVÉ'})`);
      addLog(`📍 Index Volume Complémentaire: ${volumeComplementaireIndex} (${volumeComplementaireIndex >= 0 ? headers[volumeComplementaireIndex] : 'NON TROUVÉ'})`);
      addLog(`📍 Index Injection Partagée: ${injectionPartageIndex} (${injectionPartageIndex >= 0 ? headers[injectionPartageIndex] : 'NON TROUVÉ'})`);
      addLog(`📍 Index Injection Complémentaire: ${injectionComplementaireIndex} (${injectionComplementaireIndex >= 0 ? headers[injectionComplementaireIndex] : 'NON TROUVÉ'})`);
      addLog(`📍 Index Registre: ${registreIndex} (${registreIndex >= 0 ? headers[registreIndex] : 'NON TROUVÉ - OK pour injections'})`);

      if (eanIndex === -1) {
        throw new Error('Colonne EAN non trouvée. Assurez-vous qu\'une colonne contient "EAN"');
      }

      // Charger les participants
      addLog('👥 Chargement des participants depuis la base...');
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) throw error;

      const targetEan = '541448965001060702';
      addLog(`🎯 RECHERCHE SPÉCIFIQUE DE L'EAN: ${targetEan}`);
      
      const foundParticipant = participants?.find(p => p.ean_code === targetEan);
      addLog(`🔍 Participant trouvé dans la base? ${!!foundParticipant}`);
      if (foundParticipant) {
        addLog(`✅ Participant trouvé: ${foundParticipant.name} (${foundParticipant.ean_code})`);
      } else {
        addLog('❌ Participant NON trouvé dans la base');
        addLog(`🔍 EAN disponibles: ${participants?.map(p => p.ean_code).filter(Boolean).join(', ')}`);
      }

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

      addLog(`👥 Participants avec EAN: ${Object.keys(participantMapping).length}`);
      addLog(`🎯 L'EAN cible est-il dans le mapping? ${!!participantMapping[targetEan]}`);
      if (participantMapping[targetEan]) {
        addLog(`✅ Mapping trouvé: ${JSON.stringify(participantMapping[targetEan])}`);
      } else {
        addLog(`❌ Mapping NON trouvé pour: ${targetEan}`);
        const similarEans = Object.keys(participantMapping).filter(ean => 
          ean.includes('541448') || ean.includes('965001') || ean.includes('060702')
        );
        addLog(`🔍 EAN similaires: ${similarEans.join(', ')}`);
      }

      addLog(`🔍 Tous les EAN disponibles: ${Object.keys(participantMapping).join(', ')}`);

      // Traiter les données ligne par ligne
      const participantData: { [ean: string]: any } = {};
      const unknownEans = new Set<string>();
      let validRows = 0;

      addLog(`📊 Traitement de ${lines.length - 1} lignes de données...`);

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t').map(cell => cell.trim());
        
        if (row.length < headers.length) continue;

        const eanCodeRaw = row[eanIndex]?.trim();
        const eanCode = eanCodeRaw?.replace(/[^0-9]/g, ''); // Nettoyer l'EAN
        if (!eanCode) continue;
        
        // Récupérer le registre seulement s'il existe
        const registre = registreIndex >= 0 ? String(row[registreIndex] || '').trim().toUpperCase() : '';

        // Debug pour l'EAN spécifique
        if (eanCode === targetEan || eanCodeRaw === targetEan || eanCode.includes('965001')) {
          addLog(`🎯 EAN CIBLE TROUVÉ dans les données: "${eanCode}"`);
          addLog(`🎯 EAN brut: "${eanCodeRaw}"`);
          addLog(`🎯 Registre: "${registre}" (index: ${registreIndex})`);
          addLog(`📋 Ligne complète: ${JSON.stringify(row)}`);
          addLog(`🔍 Mapping disponible avec EAN nettoyé? ${!!participantMapping[eanCode]}`);
          addLog(`🔍 Mapping disponible avec EAN brut? ${!!participantMapping[eanCodeRaw]}`);
          
          // Tester différentes variantes de l'EAN
          const variants = [eanCode, eanCodeRaw, eanCode?.padStart(18, '0'), eanCodeRaw?.padStart(18, '0')];
          addLog(`🔍 Test de variantes EAN: ${JSON.stringify(variants)}`);
          variants.forEach(variant => {
            if (variant && participantMapping[variant]) {
              addLog(`✅ VARIANTE TROUVÉE: "${variant}" -> ${JSON.stringify(participantMapping[variant])}`);
            }
          });
        }

        // Essayer d'abord avec l'EAN nettoyé, puis avec l'EAN brut
        const mappedParticipant = participantMapping[eanCode] || participantMapping[eanCodeRaw];
        
        if (mappedParticipant) {
          const finalEan = participantMapping[eanCode] ? eanCode : eanCodeRaw;
          
          if (!participantData[finalEan]) {
            participantData[finalEan] = {
              ...mappedParticipant,
              data: {
                // Stocker toutes les colonnes avec leurs valeurs
                allColumns: {},
                // Garder les totaux énergétiques pour compatibilité
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
          
          // Stocker TOUTES les colonnes de cette ligne
          const allColumnData: { [columnName: string]: any } = {};
          headers.forEach((header, index) => {
            const rawValue = row[index];
            const cleanedValue = rawValue ? String(rawValue).trim() : '';
            
            // Pour les colonnes numériques, parser la valeur
            if (header.toLowerCase().includes('volume') || 
                header.toLowerCase().includes('injection') ||
                header.toLowerCase().includes('tarif') ||
                header.toLowerCase().includes('prix') ||
                header.toLowerCase().includes('montant')) {
              allColumnData[header] = parseValue(rawValue);
            } else {
              allColumnData[header] = cleanedValue;
            }
          });
          
          // Ajouter les données de cette ligne aux données du participant
          if (!participantData[finalEan].data.allColumns[i]) {
            participantData[finalEan].data.allColumns[i] = allColumnData;
          }
          
          const volumePartage = parseValue(row[volumePartageIndex]);
          const volumeComplementaire = parseValue(row[volumeComplementaireIndex]);
          const injectionPartage = parseValue(row[injectionPartageIndex]);
          const injectionComplementaire = parseValue(row[injectionComplementaireIndex]);
          
          // Debug pour l'EAN cible ou les premières lignes
          if (eanCode === targetEan || eanCodeRaw === targetEan || i <= 5) {
            addLog(`🔍 LIGNE ${i} - EAN ${finalEan} (registre: "${registre}"):`);
            addLog(`  📋 Valeurs brutes: VP="${row[volumePartageIndex]}", VC="${row[volumeComplementaireIndex]}", IP="${row[injectionPartageIndex]}", IC="${row[injectionComplementaireIndex]}"`);
            addLog(`  🔢 Valeurs parsées: VP=${volumePartage}, VC=${volumeComplementaire}, IP=${injectionPartage}, IC=${injectionComplementaire}`);
            addLog(`  📊 Toutes les colonnes stockées: ${Object.keys(allColumnData).length} colonnes`);
            
            if (volumePartage > 0 || volumeComplementaire > 0 || injectionPartage > 0 || injectionComplementaire > 0) {
              addLog('🎉 VALEURS NON-NULLES TROUVÉES !');
            }
          }

          // Additionner les valeurs (utiliser finalEan pour la cohérence)
          participantData[finalEan].data.volume_partage += volumePartage;
          participantData[finalEan].data.volume_complementaire += volumeComplementaire;
          participantData[finalEan].data.injection_partagee += injectionPartage;
          participantData[finalEan].data.injection_complementaire += injectionComplementaire;

          validRows++;

        } else {
          unknownEans.add(eanCode);
          
          // Debug pour les EAN non reconnus
          if (eanCode === targetEan || eanCode.includes('965001')) {
            addLog(`❌ EAN NON RECONNU: "${eanCode}" (brut: "${eanCodeRaw}")`);
            addLog(`🔍 Premiers EAN disponibles: ${Object.keys(participantMapping).slice(0, 5).join(', ')}`);
          }
        }
      }

      addLog(`📊 Traitement terminé: ${validRows} lignes valides, ${unknownEans.size} EAN non reconnus`);
      addLog(`👥 Participants mis à jour: ${Object.keys(participantData).length}`);

      // Mettre à jour la base de données
      addLog('💾 Mise à jour de la base de données...');
      for (const [eanCode, data] of Object.entries(participantData)) {
        addLog(`💾 Mise à jour participant EAN: ${eanCode}`);
        
        const { data: participant, error: findError } = await supabase
          .from('participants')
          .select('id, monthly_data')
          .eq('ean_code', eanCode)
          .single();

        if (!findError && participant) {
          addLog(`✅ Participant trouvé en base: ${participant.id}`);
          
          let existingData = {};
          if (participant.monthly_data) {
            try {
              existingData = JSON.parse(participant.monthly_data);
            } catch (e) {
              addLog(`⚠️ Erreur parsing monthly_data pour ${eanCode}: ${e}`);
            }
          }

          const updatedData = {
            ...existingData,
            [month]: {
              // Stocker toutes les données de colonnes
              allColumns: (data as any).data.allColumns,
              headers: headers,
              // Garder les totaux énergétiques
              volume_partage: (data as any).data.volume_partage,
              volume_complementaire: (data as any).data.volume_complementaire,
              injection_partagee: (data as any).data.injection_partagee,
              injection_complementaire: (data as any).data.injection_complementaire,
              updated_at: new Date().toISOString()
            }
          };
          
          addLog(`💾 Données à sauvegarder pour ${eanCode}: totaux énergétiques + ${Object.keys((data as any).data.allColumns).length} lignes détaillées`);

          const { error: updateError } = await supabase
            .from('participants')
            .update({ monthly_data: JSON.stringify(updatedData) })
            .eq('id', participant.id);

          if (updateError) {
            addLog(`❌ Erreur mise à jour ${eanCode}: ${updateError.message}`);
          } else {
            addLog(`✅ Mise à jour réussie pour ${(data as any).name} (${eanCode}) - ${Object.keys((data as any).data.allColumns).length} lignes + totaux: VP:${(data as any).data.volume_partage}, VC:${(data as any).data.volume_complementaire}, IP:${(data as any).data.injection_partagee}, IC:${(data as any).data.injection_complementaire}`);
          }
        } else {
          addLog(`❌ Participant non trouvé en base pour EAN: ${eanCode}`);
          if (findError) {
            addLog(`❌ Erreur de recherche: ${findError.message}`);
          }
        }
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
      addLog(`🎉 IMPORT TERMINÉ AVEC SUCCÈS !`);
      
      toast.success(`✅ Import réussi ! ${Object.keys(participantData).length} participants mis à jour`);
      
      setTimeout(() => {
        onSuccess(finalResults);
        onClose();
      }, 3000);

    } catch (error: any) {
      addLog(`❌ ERREUR: ${error.message}`);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setProcessing(false);
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Logs de debug ({debugLogs.length} entrées)
              </h4>
              <div className="bg-white border border-gray-200 rounded p-3 max-h-60 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {debugLogs.map((log, index) => (
                    <div key={index} className={`${
                      log.includes('❌') ? 'text-red-600' :
                      log.includes('✅') ? 'text-green-600' :
                      log.includes('🎯') ? 'text-purple-600' :
                      log.includes('⚠️') ? 'text-orange-600' :
                      'text-gray-700'
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
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
        </div>
      </div>
    </div>
  );
}