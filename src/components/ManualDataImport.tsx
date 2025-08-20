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

  const handleProcess = async () => {
    if (!textData.trim()) {
      toast.error('Veuillez coller vos données Excel');
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      // Diviser en lignes
      const lines = textData.trim().split('\n');
      console.log('📊 Lignes trouvées:', lines.length);

      if (lines.length < 2) {
        throw new Error('Il faut au moins une ligne d\'en-tête et une ligne de données');
      }

      // Première ligne = headers
      const headers = lines[0].split('\t').map(h => h.trim());
      console.log('📋 Headers:', headers);

      // Trouver les colonnes importantes
      const eanIndex = headers.findIndex(h => h.toLowerCase().includes('ean'));
      
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
      
      console.log('🔍 RECHERCHE AMÉLIORÉE DES COLONNES:');
      console.log('📋 Headers originaux:', headers);
      console.log('📍 Index trouvés:', {
        ean: eanIndex,
        volumePartage: volumePartageIndex,
        volumeComplementaire: volumeComplementaireIndex,
        injectionPartage: injectionPartageIndex,
        injectionComplementaire: injectionComplementaireIndex
      });

      if (eanIndex === -1) {
        throw new Error('Colonne EAN non trouvée. Assurez-vous qu\'une colonne contient "EAN"');
      }

      // Charger les participants
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) throw error;

      // DEBUG SPÉCIFIQUE POUR L'EAN PROBLÉMATIQUE
      const targetEan = '541448965001060702';
      console.log('🎯 RECHERCHE SPÉCIFIQUE DE L\'EAN:', targetEan);
      
      const foundParticipant = participants?.find(p => p.ean_code === targetEan);
      console.log('🔍 Participant trouvé dans la base?', !!foundParticipant);
      if (foundParticipant) {
        console.log('✅ Participant trouvé:', foundParticipant.name, foundParticipant.ean_code);
      } else {
        console.log('❌ Participant NON trouvé');
        console.log('🔍 Tous les EAN dans la base:', participants?.map(p => p.ean_code).filter(Boolean));
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

      console.log('👥 Participants avec EAN:', Object.keys(participantMapping).length);
      console.log('🎯 L\'EAN cible est-il dans le mapping?', !!participantMapping[targetEan]);
      if (participantMapping[targetEan]) {
        console.log('✅ Mapping trouvé:', participantMapping[targetEan]);
      } else {
        console.log('❌ Mapping NON trouvé pour:', targetEan);
        console.log('🔍 EAN similaires dans le mapping:', Object.keys(participantMapping).filter(ean => 
          ean.includes('541448') || ean.includes('965001') || ean.includes('060702')
        ));
      }

      // Debug: afficher tous les EAN disponibles
      console.log('🔍 EAN disponibles dans la base:', Object.keys(participantMapping));
      console.log('🔍 Recherche de l\'EAN "541448965001060702"...');
      if (participantMapping[targetEan]) {
        console.log('✅ EAN trouvé:', participantMapping[targetEan]);
      } else {
        console.log('❌ EAN NON TROUVÉ dans le mapping');
        console.log('🔍 EAN similaires:', Object.keys(participantMapping).filter(ean => 
          ean.includes('541448') || ean.includes('965001')
        ));
      }

      // Traiter les données ligne par ligne
      const participantData: { [ean: string]: any } = {};
      const unknownEans = new Set<string>();
      let validRows = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t').map(cell => cell.trim());
        
        if (row.length < headers.length) continue;

        const eanCodeRaw = row[eanIndex]?.trim();
        const eanCode = eanCodeRaw?.replace(/[^0-9]/g, ''); // Nettoyer l'EAN
        if (!eanCode) continue;

        // Debug pour l'EAN spécifique
        if (eanCode === targetEan || eanCodeRaw === targetEan || eanCode.includes('965001')) {
          console.log(`🎯 EAN CIBLE TROUVÉ dans les données: "${eanCode}"`);
          console.log(`🎯 EAN brut: "${eanCodeRaw}"`);
          console.log('📋 Ligne complète:', row);
          console.log('🔍 Mapping disponible?', !!participantMapping[eanCode]);
          console.log('🔍 Mapping avec EAN brut?', !!participantMapping[eanCodeRaw]);
          
          // Tester différentes variantes de l'EAN
          const variants = [eanCode, eanCodeRaw, eanCode.padStart(18, '0'), eanCodeRaw?.padStart(18, '0')];
          console.log('🔍 Test de variantes EAN:', variants);
          variants.forEach(variant => {
            if (variant && participantMapping[variant]) {
              console.log(`✅ VARIANTE TROUVÉE: "${variant}" ->`, participantMapping[variant]);
            }
          });
        }

        if (participantMapping[eanCode]) {
          if (!participantData[eanCode]) {
            participantData[eanCode] = {
              ...participantMapping[eanCode],
              data: {
                volume_partage: 0,
                volume_complementaire: 0,
                injection_partagee: 0,
                injection_complementaire: 0
              }
            };
          }

          // Extraire les valeurs
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
          
          console.log(`🔍 LIGNE ${i} - EAN ${eanCode}:`);
          console.log('  📋 Valeurs brutes:', {
            volumePartage: row[volumePartageIndex],
            volumeComplementaire: row[volumeComplementaireIndex],
            injectionPartage: row[injectionPartageIndex],
            injectionComplementaire: row[injectionComplementaireIndex]
          });
          console.log('  🔢 Valeurs parsées:', {
            volumePartage,
            volumeComplementaire,
            injectionPartage,
            injectionComplementaire
          });
          
          // Vérifier si on a des valeurs non-nulles
          if (volumePartage > 0 || volumeComplementaire > 0 || injectionPartage > 0 || injectionComplementaire > 0) {
            console.log('🎉 VALEURS NON-NULLES TROUVÉES !');
          }

          // Additionner les valeurs
          participantData[eanCode].data.volume_partage += volumePartage;
          participantData[eanCode].data.volume_complementaire += volumeComplementaire;
          participantData[eanCode].data.injection_partagee += injectionPartage;
          participantData[eanCode].data.injection_complementaire += injectionComplementaire;

          validRows++;

          // Debug pour les 3 premières lignes
          if (i <= 3 || eanCode === targetEan) {
            console.log(`🔍 LIGNE ${i} - EAN ${eanCode}:`);
            console.log('  📋 Valeurs brutes:', {
              volumePartage: row[volumePartageIndex],
              volumeComplementaire: row[volumeComplementaireIndex],
              injectionPartage: row[injectionPartageIndex],
              injectionComplementaire: row[injectionComplementaireIndex]
            });
            console.log('  🔢 Valeurs parsées:', {
              volumePartage,
              volumeComplementaire,
              injectionPartage,
              injectionComplementaire
            });
            
            // Debug supplémentaire pour voir les valeurs non-nulles
            if (volumePartage > 0 || volumeComplementaire > 0 || injectionPartage > 0 || injectionComplementaire > 0) {
              console.log('🎉 VALEURS NON-NULLES TROUVÉES !');
            }
          }
        } else {
          unknownEans.add(eanCode);
          
          // Debug pour les EAN non reconnus
          if (eanCode === targetEan || eanCode.includes('965001')) {
            console.log(`❌ EAN NON RECONNU: "${eanCode}"`);
            console.log('🔍 EAN disponibles:', Object.keys(participantMapping).slice(0, 5));
          }
        }
      }

      // Mettre à jour la base de données
      for (const [eanCode, data] of Object.entries(participantData)) {
        const { data: participant, error: findError } = await supabase
          .from('participants')
          .select('id, monthly_data')
          .eq('ean_code', eanCode)
          .single();

        if (!findError && participant) {
          let existingData = {};
          if (participant.monthly_data) {
            try {
              existingData = JSON.parse(participant.monthly_data);
            } catch (e) {
              console.warn('Erreur parsing monthly_data:', e);
            }
          }

          const updatedData = {
            ...existingData,
            [month]: {
              ...(data as any).data,
              updated_at: new Date().toISOString()
            }
          };

          await supabase
            .from('participants')
            .update({ monthly_data: JSON.stringify(updatedData) })
            .eq('id', participant.id);
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
      
      toast.success(`✅ Import réussi ! ${Object.keys(participantData).length} participants mis à jour`);
      
      setTimeout(() => {
        onSuccess(finalResults);
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('Erreur:', error);
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