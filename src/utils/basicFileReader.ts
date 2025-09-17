export class BasicFileReader {
  /**
   * Lit un fichier Excel de manière très basique
   */
  static async readFile(file: File): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    console.log('🔍 LECTURE BASIQUE DU FICHIER');
    console.log('📁 Nom:', file.name);
    console.log('📏 Taille:', file.size, 'bytes');
    console.log('📋 Type:', file.type);

    try {
      // Étape 1: Lire comme ArrayBuffer
      console.log('📖 Lecture comme ArrayBuffer...');
      const buffer = await this.readAsArrayBuffer(file);
      console.log('✅ Buffer lu, taille:', buffer.byteLength);

      // Étape 2: Vérifier que c'est bien un fichier Excel
      const uint8Array = new Uint8Array(buffer);
      const firstBytes = Array.from(uint8Array.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      console.log('🔍 Premiers bytes:', firstBytes);

      // Signature Excel: 50 4B (PK) pour les fichiers .xlsx
      if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
        throw new Error('Ce n\'est pas un fichier Excel valide');
      }

      console.log('✅ Fichier Excel détecté');

      // Étape 3: Essayer de lire avec XLSX de manière très simple
      console.log('📊 Tentative lecture XLSX...');
      
      // Import dynamique de XLSX
      const XLSX = await import('xlsx');
      console.log('✅ XLSX importé');

      // Lecture très basique
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: false,
        cellNF: false,
        raw: true
      });

      console.log('✅ Workbook créé, feuilles:', workbook.SheetNames);

      if (!workbook.SheetNames.length) {
        throw new Error('Aucune feuille trouvée');
      }

      // Prendre la première feuille
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      console.log('📋 Feuille sélectionnée:', sheetName);

      // Convertir en JSON très simple
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
        defval: null
      });

      console.log('✅ Données extraites:', jsonData.length, 'lignes');
      console.log('📋 Première ligne (headers):', jsonData[0]);
      console.log('📋 Deuxième ligne (exemple):', jsonData[1]);

      return {
        success: true,
        data: {
          headers: jsonData[0] as string[],
          rows: jsonData.slice(1),
          totalRows: jsonData.length - 1
        }
      };

    } catch (error: any) {
      console.error('❌ ERREUR:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lit un fichier comme ArrayBuffer avec Promise
   */
  private static readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error('Résultat de lecture invalide'));
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.onabort = () => reject(new Error('Lecture annulée'));
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Traite les données extraites pour créer le résultat final
   */
  static async processExtractedData(
    extractedData: { headers: string[]; rows: any[][]; totalRows: number },
    participantMapping: any,
    filename: string,
    onLog?: (log: string) => void
  ): Promise<any> {
    console.log('🔄 TRAITEMENT DES DONNÉES EXTRAITES');
    
    const { headers, rows } = extractedData;
    console.log('📋 Headers:', headers);
    onLog?.(`📋 Headers détectés: ${JSON.stringify(headers)}`);
    
    // Trouver la colonne EAN
    const eanIndex = headers.findIndex(h => 
      String(h).toLowerCase().includes('ean')
    );
    onLog?.(`🔍 Index colonne EAN: ${eanIndex} (${eanIndex >= 0 ? headers[eanIndex] : 'NON TROUVÉE'})`);
    
    // Recherche des colonnes de coûts réseau
    const networkCostColumns = {
      utilisationReseau: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'utilisation du réseau € htva' || 
                      header === 'utilisation du reseau € htva' ||
                      (header.includes('utilisation') && header.includes('réseau') && header.includes('htva'));
        if (result) onLog?.(`🔍 Utilisation réseau trouvée: "${h}" (index ${index})`);
        return result;
      }),
      surcharges: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'surcharges € htva' ||
                      (header.includes('surcharges') && header.includes('htva'));
        if (result) onLog?.(`🔍 Surcharges trouvée: "${h}" (index ${index})`);
        return result;
      }),
      tarifCapacitaire: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'tarif capac. (>2020) € htva' ||
                      header === 'tarif capacitaire € htva' ||
                      (header.includes('tarif') && header.includes('capac') && header.includes('htva'));
        if (result) onLog?.(`🔍 Tarif capacitaire trouvé: "${h}" (index ${index})`);
        return result;
      }),
      tarifMesure: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'tarif mesure & comptage € htva' ||
                      header === 'tarif mesure et comptage € htva' ||
                      (header.includes('tarif') && header.includes('mesure') && header.includes('htva'));
        if (result) onLog?.(`🔍 Tarif mesure trouvé: "${h}" (index ${index})`);
        return result;
      }),
      tarifOSP: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'tarif osp € htva' ||
                      (header.includes('tarif') && header.includes('osp') && header.includes('htva'));
        if (result) onLog?.(`🔍 Tarif OSP trouvé: "${h}" (index ${index})`);
        return result;
      }),
      transportELIA: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'transport - coût elia € htva' ||
                      header === 'transport - cout elia € htva' ||
                      header === 'transport elia € htva' ||
                      (header.includes('transport') && header.includes('elia') && header.includes('htva'));
        if (result) onLog?.(`🔍 Transport ELIA trouvé: "${h}" (index ${index})`);
        return result;
      }),
      redevanceVoirie: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'redevance de voirie € htva' ||
                      header === 'redevance voirie € htva' ||
                      (header.includes('redevance') && header.includes('voirie') && header.includes('htva'));
        if (result) onLog?.(`🔍 Redevance voirie trouvée: "${h}" (index ${index})`);
        return result;
      }),
      totalFraisReseau: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase().trim();
        const result = header === 'total frais de réseau € htva' ||
                      header === 'total frais de reseau € htva' ||
                      header === 'total frais réseau € htva' ||
                      (header.includes('total') && header.includes('frais') && header.includes('réseau') && header.includes('htva'));
        if (result) onLog?.(`🔍 Total frais réseau trouvé: "${h}" (index ${index})`);
        return result;
      })
    };
    
    onLog?.(`🔍 RÉSUMÉ COLONNES COÛTS RÉSEAU:`);
    Object.entries(networkCostColumns).forEach(([key, index]) => {
      onLog?.(`  ${key}: ${index >= 0 ? `✅ "${headers[index]}" (index ${index})` : '❌ NON TROUVÉE'}`);
    });
    
    // Recherche plus flexible des colonnes
    const registreIndex = headers.findIndex(h => {
      const header = String(h).toLowerCase();
      return header.includes('registre') || header.includes('register') || header.includes('compteur');
    });
    onLog?.(`🔍 Index colonne Registre: ${registreIndex} (${registreIndex >= 0 ? headers[registreIndex] : 'NON TROUVÉE'})`);
    
    const volumePartageIndex = headers.findIndex(h => {
      const header = String(h).toLowerCase();
      return (header.includes('partage') || header.includes('partagee')) && 
             header.includes('consommation');
    });
    onLog?.(`🔍 Index Volume Partagé: ${volumePartageIndex} (${volumePartageIndex >= 0 ? headers[volumePartageIndex] : 'NON TROUVÉE'})`);
    
    const volumeComplementaireIndex = headers.findIndex(h => {
      const header = String(h).toLowerCase();
      return header.includes('consommation') && 
             (header.includes('reseau') || header.includes('complementaire') || header.includes('residuel'));
    });
    onLog?.(`🔍 Index Volume Complémentaire: ${volumeComplementaireIndex} (${volumeComplementaireIndex >= 0 ? headers[volumeComplementaireIndex] : 'NON TROUVÉE'})`);
    
    const injectionPartageIndex = headers.findIndex(h => {
      const header = String(h).toLowerCase();
      return (header.includes('partage') || header.includes('partagee')) && header.includes('injection');
    });
    onLog?.(`🔍 Index Injection Partagée: ${injectionPartageIndex} (${injectionPartageIndex >= 0 ? headers[injectionPartageIndex] : 'NON TROUVÉE'})`);
    
    const injectionComplementaireIndex = headers.findIndex(h => {
      const header = String(h).toLowerCase();
      return header.includes('injection') && 
             (header.includes('reseau') || header.includes('complementaire') || header.includes('residuelle') || header.includes('residuel'));
    });
    onLog?.(`🔍 Index Injection Complémentaire: ${injectionComplementaireIndex} (${injectionComplementaireIndex >= 0 ? headers[injectionComplementaireIndex] : 'NON TROUVÉE'})`);
    
    if (eanIndex === -1) {
      console.error('❌ Colonne EAN non trouvée dans:', headers);
      onLog?.('❌ ERREUR: Colonne EAN non trouvée !');
      throw new Error('Colonne EAN non trouvée');
    }
    
    console.log('🔍 Headers disponibles:', headers);
    console.log('✅ Index des colonnes trouvées:', {
      ean: eanIndex,
      registre: registreIndex,
      volumePartage: volumePartageIndex,
      volumeComplementaire: volumeComplementaireIndex,
      injectionPartage: injectionPartageIndex,
      injectionComplementaire: injectionComplementaireIndex
    });
    
    // Vérifier que les colonnes essentielles sont trouvées
    if (volumePartageIndex === -1) {
      console.warn('⚠️ Colonne Volume Partagé non trouvée');
    }
    if (volumeComplementaireIndex === -1) {
      console.warn('⚠️ Colonne Volume Complémentaire non trouvée');
    }
    if (injectionPartageIndex === -1) {
      console.warn('⚠️ Colonne Injection Partagée non trouvée');
    }
    if (injectionComplementaireIndex === -1) {
      console.warn('⚠️ Colonne Injection Réseau non trouvée');
    }
    
    // Structure pour grouper les données par EAN (HIGH + LOW)
    const eanGroups: { [ean: string]: {
      info: any;
      networkCosts: {
        utilisationReseau: number;
        surcharges: number;
        tarifCapacitaire: number;
        tarifMesure: number;
        tarifOSP: number;
        transportELIA: number;
        redevanceVoirie: number;
        totalFraisReseau: number;
      };
      high: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_complementaire: number;
      };
      low: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_complementaire: number;
      };
    } } = {};
    
    const unknownEans = new Set<string>();
    let processedRows = 0;
    
    // LIMITATION: Traiter maximum 1000 lignes pour éviter les crashes
    const maxRows = Math.min(rows.length, 1000);
    console.log('📊 Groupement de', maxRows, 'lignes par EAN (limité à 1000)...');
    onLog?.(`📊 Traitement limité à ${maxRows} lignes sur ${rows.length} disponibles`);
    
    // Traiter par cycles de 10 lignes pour éviter les blocages
    for (let cycle = 0; cycle < Math.ceil(maxRows / 10); cycle++) {
      const startIndex = cycle * 10;
      const endIndex = Math.min(startIndex + 10, maxRows);
      
      onLog?.(`🔄 Cycle ${cycle + 1}: lignes ${startIndex} à ${endIndex - 1}`);
      
      for (let i = startIndex; i < endIndex; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const eanRaw = row[eanIndex];
      if (!eanRaw) continue;
      
      const eanCode = String(eanRaw).trim();
      const registre = String(row[registreIndex] || '').trim().toUpperCase();
      
      if (participantMapping[eanCode]) {
        // Initialiser le groupe pour ce participant si nécessaire
        if (!eanGroups[eanCode]) {
          eanGroups[eanCode] = {
            info: participantMapping[eanCode],
            networkCosts: {
              utilisationReseau: 0,
              surcharges: 0,
              tarifCapacitaire: 0,
              tarifMesure: 0,
              tarifOSP: 0,
              transportELIA: 0,
              redevanceVoirie: 0,
              totalFraisReseau: 0
            },
            high: {
              volume_partage: 0,
              volume_complementaire: 0,
              injection_partagee: 0,
              injection_complementaire: 0
            },
            low: {
              volume_partage: 0,
              volume_complementaire: 0,
              injection_partagee: 0,
              injection_complementaire: 0
            }
          };
        }
        
        // Extraire les coûts réseau (une seule fois par EAN, pas par registre)
        if ((registre === 'HI' || registre === 'HIGH') && networkCostColumns.totalFraisReseau >= 0) {
          const parseNetworkCost = (value: any, columnName?: string) => {
            if (!value) return 0;
            
            // Log de debug pour voir la valeur brute
            if (columnName && i < 5) {
              onLog?.(`🔍 Parsing ${columnName}: valeur brute = "${value}"`);
            }
            
            const cleaned = String(value)
              .replace(/,/g, '.') // Virgule -> point
              .replace(/\s/g, '') // Supprimer espaces
              .replace(/[^\d.-]/g, '') // Garder seulement chiffres, point et tiret
              .replace(/^-+/, '') // Supprimer les tirets en début
              .replace(/-+$/, ''); // Supprimer les tirets en fin
            
            if (columnName && i < 5) {
              onLog?.(`🔍 Parsing ${columnName}: valeur nettoyée = "${cleaned}"`);
            }
            
            const parsed = parseFloat(cleaned);
            const result = isNaN(parsed) ? 0 : Math.abs(parsed); // Valeur absolue pour éviter les négatifs
            
            if (columnName && i < 5) {
              onLog?.(`🔍 Parsing ${columnName}: résultat final = ${result}`);
            }
            
            return result;
          };
          
          // Extraire chaque coût réseau avec logging détaillé
          const networkCosts = {
            utilisationReseau: networkCostColumns.utilisationReseau >= 0 ? parseNetworkCost(row[networkCostColumns.utilisationReseau], 'utilisationReseau') : 0,
            surcharges: networkCostColumns.surcharges >= 0 ? parseNetworkCost(row[networkCostColumns.surcharges], 'surcharges') : 0,
            tarifCapacitaire: networkCostColumns.tarifCapacitaire >= 0 ? parseNetworkCost(row[networkCostColumns.tarifCapacitaire], 'tarifCapacitaire') : 0,
            tarifMesure: networkCostColumns.tarifMesure >= 0 ? parseNetworkCost(row[networkCostColumns.tarifMesure], 'tarifMesure') : 0,
            tarifOSP: networkCostColumns.tarifOSP >= 0 ? parseNetworkCost(row[networkCostColumns.tarifOSP], 'tarifOSP') : 0,
            transportELIA: networkCostColumns.transportELIA >= 0 ? parseNetworkCost(row[networkCostColumns.transportELIA], 'transportELIA') : 0,
            redevanceVoirie: networkCostColumns.redevanceVoirie >= 0 ? parseNetworkCost(row[networkCostColumns.redevanceVoirie], 'redevanceVoirie') : 0,
            totalFraisReseau: networkCostColumns.totalFraisReseau >= 0 ? parseNetworkCost(row[networkCostColumns.totalFraisReseau], 'totalFraisReseau') : 0,
            // Stocker aussi les valeurs brutes pour debug
            utilisationReseauRaw: networkCostColumns.utilisationReseau >= 0 ? String(row[networkCostColumns.utilisationReseau] || '') : '',
            surchargesRaw: networkCostColumns.surcharges >= 0 ? String(row[networkCostColumns.surcharges] || '') : '',
            tarifCapacitaireRaw: networkCostColumns.tarifCapacitaire >= 0 ? String(row[networkCostColumns.tarifCapacitaire] || '') : '',
            tarifMesureRaw: networkCostColumns.tarifMesure >= 0 ? String(row[networkCostColumns.tarifMesure] || '') : '',
            tarifOSPRaw: networkCostColumns.tarifOSP >= 0 ? String(row[networkCostColumns.tarifOSP] || '') : '',
            transportELIARaw: networkCostColumns.transportELIA >= 0 ? String(row[networkCostColumns.transportELIA] || '') : '',
            redevanceVoirieRaw: networkCostColumns.redevanceVoirie >= 0 ? String(row[networkCostColumns.redevanceVoirie] || '') : '',
            totalFraisReseauRaw: networkCostColumns.totalFraisReseau >= 0 ? String(row[networkCostColumns.totalFraisReseau] || '') : ''
          };
          
          // Assigner aux données du groupe
          Object.assign(eanGroups[eanCode].networkCosts, networkCosts);
          
          // Log détaillé pour les premières lignes
          if (i < 5) {
            onLog?.(`💰 LIGNE ${i} - EAN ${eanCode} (${registre}) - COÛTS RÉSEAU EXTRAITS:`);
            onLog?.(`📋 Ligne complète: ${JSON.stringify(row)}`);
            Object.entries(networkCosts).forEach(([key, value]) => {
              if (!key.endsWith('Raw')) {
                const rawKey = key + 'Raw';
                const rawValue = networkCosts[rawKey as keyof typeof networkCosts];
                onLog?.(`  ${key}: ${value}€ (valeur brute: "${rawValue}", index colonne: ${networkCostColumns[key as keyof typeof networkCostColumns]})`);
              }
            });
            
            // Vérifier si au moins un coût est non-nul
            const nonZeroCosts = Object.entries(networkCosts)
              .filter(([key, value]) => !key.endsWith('Raw') && Number(value) > 0);
            if (nonZeroCosts.length > 0) {
              onLog?.(`✅ ${nonZeroCosts.length} coûts réseau non-nuls trouvés pour ${eanCode}`);
            } else {
              onLog?.(`⚠️ ATTENTION: Tous les coûts réseau sont à 0 pour ${eanCode}`);
              onLog?.(`🔍 Vérification des index de colonnes pour ${eanCode}:`);
              Object.entries(networkCostColumns).forEach(([key, index]) => {
                if (index >= 0) {
                  onLog?.(`  ${key} (index ${index}): "${row[index]}"`);
                }
              });
            }
          }
        }
        
        // Extraire les valeurs de la ligne
        const volumePartage = parseFloat(String(row[volumePartageIndex] || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        const volumeComplementaire = parseFloat(String(row[volumeComplementaireIndex] || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        const injectionPartage = parseFloat(String(row[injectionPartageIndex] || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        const injectionComplementaire = parseFloat(String(row[injectionComplementaireIndex] || '0').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        
        // Debug: afficher les valeurs extraites pour les premières lignes
        if (i < 10) {
          console.log(`🔍 LIGNE ${i} - EAN ${eanCode} (${registre}):`);
          onLog?.(`🔍 LIGNE ${i} - EAN ${eanCode} (${registre}):`);
          console.log('  📊 Ligne complète:', row);
          onLog?.(`  📊 Ligne complète: ${JSON.stringify(row)}`);
          console.log('  📍 Index des colonnes:', {
            volumePartageIndex,
            volumeComplementaireIndex,
            injectionPartageIndex,
            injectionComplementaireIndex
          });
          onLog?.(`  📍 Index: VP=${volumePartageIndex}, VC=${volumeComplementaireIndex}, IP=${injectionPartageIndex}, IC=${injectionComplementaireIndex}`);
          console.log('  📋 Valeurs brutes extraites:', {
            volumePartage: row[volumePartageIndex],
            volumeComplementaire: row[volumeComplementaireIndex],
            injectionPartage: row[injectionPartageIndex],
            injectionComplementaire: row[injectionComplementaireIndex]
          });
          onLog?.(`  📋 Valeurs brutes: VP="${row[volumePartageIndex]}", VC="${row[volumeComplementaireIndex]}", IP="${row[injectionPartageIndex]}", IC="${row[injectionComplementaireIndex]}"`);
          console.log('  🔢 Valeurs après parsing:', {
            volumePartage,
            volumeComplementaire,
            injectionPartage,
            injectionComplementaire
          });
          onLog?.(`  🔢 Après parsing: VP=${volumePartage}, VC=${volumeComplementaire}, IP=${injectionPartage}, IC=${injectionComplementaire}`);
          console.log('  ✅ Toutes les valeurs sont-elles 0?', 
            volumePartage === 0 && volumeComplementaire === 0 && injectionPartage === 0 && injectionComplementaire === 0
          );
          onLog?.(`  ✅ Toutes à 0? ${volumePartage === 0 && volumeComplementaire === 0 && injectionPartage === 0 && injectionComplementaire === 0}`);
          
          // Debug supplémentaire pour voir les valeurs non-nulles
          if (volumePartage > 0 || volumeComplementaire > 0 || injectionPartage > 0 || injectionComplementaire > 0) {
            console.log('🎉 VALEURS NON-NULLES TROUVÉES !');
            onLog?.('🎉 VALEURS NON-NULLES TROUVÉES !');
          }
        }
        
        // Assigner aux bonnes catégories HIGH ou LOW
        const target = registre === 'HI' || registre === 'HIGH' ? eanGroups[eanCode].high : eanGroups[eanCode].low;
        
        target.volume_partage += volumePartage;
        target.volume_complementaire += volumeComplementaire;
        target.injection_partagee += injectionPartage;
        target.injection_complementaire += injectionComplementaire;
        
        processedRows++;
        
        if (i % 100 === 0) {
          console.log(`📊 Ligne ${i}: EAN ${eanCode} (${registre}), VP: ${volumePartage}, VC: ${volumeComplementaire}`);
        }
      } else {
        unknownEans.add(eanCode);
      }
      }
      
      // Petite pause entre les cycles pour éviter les blocages
      if (cycle < Math.ceil(maxRows / 10) - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Étape 2: Sommer HIGH + LOW pour chaque EAN et préparer les données finales
    const participantData: { [ean: string]: any } = {};
    Object.entries(eanGroups).forEach(([eanCode, group]) => {
      participantData[eanCode] = {
        ...group.info,
        data: {
          volume_complementaire: group.high.volume_complementaire + group.low.volume_complementaire,
          volume_partage: group.high.volume_partage + group.low.volume_partage,
          injection_complementaire: group.high.injection_complementaire + group.low.injection_complementaire,
          injection_partagee: group.high.injection_partagee + group.low.injection_partagee
        },
        // IMPORTANT: Inclure les coûts réseau dans les données finales
        networkCosts: group.networkCosts
      };
      
      console.log(`✅ EAN ${eanCode} - Total: VP=${participantData[eanCode].data.volume_partage.toFixed(2)}, VC=${participantData[eanCode].data.volume_complementaire.toFixed(2)}`);
      console.log(`💰 EAN ${eanCode} - Coûts réseau inclus:`);
      console.log(`  Utilisation réseau: ${group.networkCosts.utilisationReseau.toFixed(2)}€`);
      console.log(`  Surcharges: ${group.networkCosts.surcharges.toFixed(2)}€`);
      console.log(`  Tarif capacitaire: ${group.networkCosts.tarifCapacitaire.toFixed(2)}€`);
      console.log(`  Tarif mesure: ${group.networkCosts.tarifMesure.toFixed(2)}€`);
      console.log(`  Tarif OSP: ${group.networkCosts.tarifOSP.toFixed(2)}€`);
      console.log(`  Transport ELIA: ${group.networkCosts.transportELIA.toFixed(2)}€`);
      console.log(`  Redevance voirie: ${group.networkCosts.redevanceVoirie.toFixed(2)}€`);
      console.log(`  TOTAL: ${group.networkCosts.totalFraisReseau.toFixed(2)}€`);
    });
    
    console.log('✅ Données accumulées par EAN:', Object.keys(participantData).length);
    onLog?.(`✅ ${Object.keys(participantData).length} participants traités avec succès`);
    
    if (unknownEans.size > 0) {
      console.warn('⚠️ EANs non reconnus:', Array.from(unknownEans).slice(0, 10));
      onLog?.(`⚠️ ${unknownEans.size} EANs non reconnus (premiers: ${Array.from(unknownEans).slice(0, 5).join(', ')})`);
    }
    
    return {
      success: true,
      data: participantData,
      stats: {
        totalRows: rows.length,
        processedRows,
        participantsFound: Object.keys(participantData).length,
        unknownEans: unknownEans.size,
        filename
      }
    };
  }
}