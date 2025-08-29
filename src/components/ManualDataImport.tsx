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
    addLog('🚀 DÉBUT DU TRAITEMENT MANUEL - DIAGNOSTIC COMPLET');
    addLog(`📅 Mois sélectionné: ${month}`);
    addLog(`📊 Taille des données: ${textData.length} caractères`);

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
      addLog('🔗 URL Supabase: ' + (import.meta.env.VITE_SUPABASE_URL ? 'Configurée' : 'MANQUANTE'));
      
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*');

      if (error) {
        addLog(`❌ ERREUR CHARGEMENT PARTICIPANTS: ${JSON.stringify(error)}`);
        throw error;
      }
      
      addLog(`✅ ${participants?.length || 0} participants chargés depuis la base`);

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
          
          // Debug pour l'EAN cible ou les premières lignes
          if (eanCode === targetEan || eanCodeRaw === targetEan || i <= 5) {
            addLog(`🔍 LIGNE ${i} - EAN ${finalEan} (registre: "${registre}"):`);
            addLog(`  📋 Valeurs brutes: VP="${row[volumePartageIndex]}", VC="${row[volumeComplementaireIndex]}", IP="${row[injectionPartageIndex]}", IC="${row[injectionComplementaireIndex]}"`);
            addLog(`  🔢 Valeurs parsées: VP=${volumePartage}, VC=${volumeComplementaire}, IP=${injectionPartage}, IC=${injectionComplementaire}`);
            
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

      // DIAGNOSTIC DÉTAILLÉ DES DONNÉES À SAUVEGARDER
      addLog('🔍 DIAGNOSTIC DÉTAILLÉ DES DONNÉES:');
      Object.entries(participantData).forEach(([ean, data]: [string, any]) => {
        addLog(`📊 EAN ${ean}: ${data.name}`);
        addLog(`  📈 VP: ${data.data.volume_partage}, VC: ${data.data.volume_complementaire}`);
        addLog(`  📈 IP: ${data.data.injection_partagee}, IC: ${data.data.injection_complementaire}`);
        addLog(`  🆔 ID participant: ${data.id}`);
      });

      // Mettre à jour la base de données
      addLog('💾 DÉBUT MISE À JOUR BASE DE DONNÉES...');
      addLog(`🔗 Connexion Supabase: ${supabase ? 'OK' : 'ERREUR'}`);
      
      let updateSuccessCount = 0;
      let updateErrorCount = 0;
      
      for (const [eanCode, data] of Object.entries(participantData)) {
        addLog(`💾 TRAITEMENT PARTICIPANT EAN: ${eanCode}`);
        addLog(`👤 Nom: ${(data as any).name}`);
        addLog(`🆔 ID: ${(data as any).id}`);
        
        // ÉTAPE 1: Recherche du participant
        addLog(`🔍 Recherche participant avec EAN: ${eanCode}`);
        const { data: participant, error: findError } = await supabase
          .from('participants')
          .select('id, monthly_data, name')
          .eq('ean_code', eanCode)
          .single();

        if (findError) {
          addLog(`❌ ERREUR RECHERCHE PARTICIPANT: ${JSON.stringify(findError)}`);
          updateErrorCount++;
          continue;
        }
        
        if (!participant) {
          addLog(`❌ PARTICIPANT NON TROUVÉ pour EAN: ${eanCode}`);
          updateErrorCount++;
          continue;
        }
        
        addLog(`✅ PARTICIPANT TROUVÉ: ${participant.name} (ID: ${participant.id})`);
        
        // ÉTAPE 2: Récupération des données existantes
        addLog(`📊 monthly_data actuel: ${JSON.stringify(participant.monthly_data)}`);
        
        let existingData = {};
        if (participant.monthly_data) {
          try {
            if (typeof participant.monthly_data === 'string') {
              existingData = JSON.parse(participant.monthly_data);
              addLog(`✅ monthly_data parsé depuis string`);
            } else {
              existingData = participant.monthly_data;
              addLog(`✅ monthly_data utilisé directement (objet)`);
            }
            addLog(`📊 Données existantes: ${JSON.stringify(existingData)}`);
          } catch (e) {
            addLog(`⚠️ Erreur parsing monthly_data pour ${eanCode}: ${e}`);
            existingData = {};
          }
        } else {
          addLog(`📊 Aucune donnée monthly_data existante`);
        }

        // ÉTAPE 3: Préparation des nouvelles données
        const newMonthData = {
          volume_partage: (data as any).data.volume_partage,
          volume_complementaire: (data as any).data.volume_complementaire,
          injection_partagee: (data as any).data.injection_partagee,
          injection_complementaire: (data as any).data.injection_complementaire,
          updated_at: new Date().toISOString()
        };
        
        addLog(`📊 NOUVELLES DONNÉES pour ${month}:`);
        addLog(`  📈 VP: ${newMonthData.volume_partage}`);
        addLog(`  📈 VC: ${newMonthData.volume_complementaire}`);
        addLog(`  📈 IP: ${newMonthData.injection_partagee}`);
        addLog(`  📈 IC: ${newMonthData.injection_complementaire}`);
        
        // ÉTAPE 4: Fusion avec les données existantes
        const updatedData = {
          ...existingData,
          [month]: newMonthData
        };
        
        addLog(`💾 DONNÉES COMPLÈTES À SAUVEGARDER:`);
        addLog(`📊 Nombre de mois: ${Object.keys(updatedData).length}`);
        addLog(`📊 Mois disponibles: ${Object.keys(updatedData).join(', ')}`);
        addLog(`📊 Données pour ${month}: ${JSON.stringify(updatedData[month])}`);

        // ÉTAPE 5: Sauvegarde dans la base
        addLog(`💾 SAUVEGARDE EN BASE pour participant ID: ${participant.id}`);
        
        const { data: updateResult, error: updateError } = await supabase
          .from('participants')
          .update({ 
            monthly_data: updatedData
          })
          .eq('id', participant.id)
          .select('monthly_data');

        if (updateError) {
          addLog(`❌ ERREUR MISE À JOUR: ${JSON.stringify(updateError)}`);
          updateErrorCount++;
        } else {
          addLog(`✅ MISE À JOUR RÉUSSIE pour ${participant.name}`);
          addLog(`📊 Données retournées par update: ${JSON.stringify(updateResult)}`);
          updateSuccessCount++;
          
          // ÉTAPE 6: Vérification immédiate
          addLog(`🔍 VÉRIFICATION IMMÉDIATE...`);
          const { data: verifyData, error: verifyError } = await supabase
            .from('participants')
            .select('monthly_data')
            .eq('id', participant.id)
            .single();
          
          if (verifyError) {
            addLog(`❌ ERREUR VÉRIFICATION: ${JSON.stringify(verifyError)}`);
          } else {
            addLog(`🔍 VÉRIFICATION RÉUSSIE:`);
            addLog(`📊 monthly_data vérifié: ${JSON.stringify(verifyData.monthly_data)}`);
            
            if (verifyData.monthly_data && verifyData.monthly_data[month]) {
              addLog(`✅ DONNÉES DU MOIS ${month} CONFIRMÉES EN BASE !`);
              addLog(`📊 Valeurs confirmées: ${JSON.stringify(verifyData.monthly_data[month])}`);
            } else {
              addLog(`❌ DONNÉES DU MOIS ${month} NON TROUVÉES EN BASE !`);
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
      addLog('💾 SAUVEGARDE LOCALSTORAGE...');
      try {
        const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
        addLog(`📊 localStorage avant: ${Object.keys(monthlyData).length} mois`);
        
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
        addLog(`✅ localStorage sauvegardé pour ${month}`);
        addLog(`📊 localStorage après: ${Object.keys(monthlyData).length} mois`);
      } catch (error) {
        addLog(`❌ ERREUR localStorage: ${error}`);
      }

      // ÉTAPE 9: VÉRIFICATION FINALE GLOBALE DE LA BASE DE DONNÉES
      addLog('🔍 VÉRIFICATION FINALE GLOBALE...');
      try {
        const { data: allParticipants, error: finalError } = await supabase
          .from('participants')
          .select('name, ean_code, monthly_data')
          .not('monthly_data', 'is', null);
        
        if (finalError) {
          addLog(`❌ ERREUR vérification finale: ${JSON.stringify(finalError)}`);
        } else {
          addLog(`📊 VÉRIFICATION: ${allParticipants?.length || 0} participants avec monthly_data en base`);
          
          // Vérifier spécifiquement les participants qu'on vient de traiter
          Object.keys(participantData).forEach(eanCode => {
            const foundInDB = allParticipants?.find(p => p.ean_code === eanCode);
            if (foundInDB) {
              addLog(`✅ ${foundInDB.name} (${eanCode}): monthly_data présent en base`);
              if (foundInDB.monthly_data && foundInDB.monthly_data[month]) {
                addLog(`✅ Données du mois ${month} confirmées pour ${foundInDB.name}`);
              } else {
                addLog(`❌ Données du mois ${month} MANQUANTES pour ${foundInDB.name} !`);
              }
            } else {
              addLog(`❌ Participant ${eanCode} NON trouvé en base !`);
            }
          });
        }
      } catch (error) {
        addLog(`❌ ERREUR vérification finale: ${error.message}`);
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
      addLog(`🎉 IMPORT TERMINÉ - VÉRIFIEZ LES LOGS CI-DESSUS POUR CONFIRMER LA SAUVEGARDE !`);
      
      if (updateSuccessCount > 0) {
        toast.success(`✅ Import réussi ! ${updateSuccessCount} participants mis à jour en base pour ${month}`);
      } else {
        addLog(`❌ AUCUN PARTICIPANT MIS À JOUR EN BASE !`);
        toast.error(`❌ ERREUR CRITIQUE: Aucun participant mis à jour en base ! Vérifiez les logs de debug.`);
      }
      
      // Ne plus fermer automatiquement - laisser l'utilisateur voir les logs
      // setTimeout(() => {
      //   onSuccess(finalResults);
      //   onClose();
      // }, 3000);

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
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                🔍 LOGS DE DEBUG DÉTAILLÉS ({debugLogs.length} entrées)
              </h4>
              <div className="bg-white border-2 border-yellow-200 rounded p-4 max-h-80 overflow-y-auto">
                <div className="space-y-1 text-xs font-mono">
                  {debugLogs.map((log, index) => (
                    <div key={index} className={`${
                      log.includes('❌') ? 'text-red-600' :
                      log.includes('✅') ? 'text-green-600' :
                      log.includes('🎯') ? 'text-purple-600' :
                      log.includes('⚠️') ? 'text-orange-600' :
                      log.includes('💾') ? 'text-blue-600 font-bold' :
                      log.includes('🔍') ? 'text-indigo-600' :
                      'text-gray-700'
                    } p-1 border-b border-gray-100`}>
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