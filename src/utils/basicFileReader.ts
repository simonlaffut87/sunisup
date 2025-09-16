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
        const header = String(h).toLowerCase();
        const result = header.includes('utilisation') && header.includes('réseau') && header.includes('htva');
        if (result) onLog?.(`🔍 Utilisation réseau trouvée: "${h}" (index ${index})`);
        return result;
      }),
      surcharges: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('surcharges') && header.includes('htva');
        if (result) onLog?.(`🔍 Surcharges trouvée: "${h}" (index ${index})`);
        return result;
      }),
      tarifCapacitaire: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('tarif') && header.includes('capac') && header.includes('htva');
        if (result) onLog?.(`🔍 Tarif capacitaire trouvé: "${h}" (index ${index})`);
        return result;
      }),
      tarifMesure: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('tarif') && header.includes('mesure') && header.includes('comptage') && header.includes('htva');
        if (result) onLog?.(`🔍 Tarif mesure trouvé: "${h}" (index ${index})`);
        return result;
      }),
      tarifOSP: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('tarif') && header.includes('osp') && header.includes('htva');
        if (result) onLog?.(`🔍 Tarif OSP trouvé: "${h}" (index ${index})`);
        return result;
      }),
      transportELIA: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('transport') && header.includes('elia') && header.includes('htva');
        if (result) onLog?.(`🔍 Transport ELIA trouvé: "${h}" (index ${index})`);
        return result;
      }),
      redevanceVoirie: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('redevance') && header.includes('voirie') && header.includes('htva');
        if (result) onLog?.(`🔍 Redevance voirie trouvée: "${h}" (index ${index})`);
        return result;
      }),
      totalFraisReseau: headers.findIndex((h, index) => {
        const header = String(h).toLowerCase();
        const result = header.includes('total') && header.includes('frais') && header.includes('réseau') && header.includes('htva');
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
          const parseNetworkCost = (value: any) => {
            if (!value) return 0;
            const cleaned = String(value)
              .replace(/,/g, '.') // Virgule -> point
              .replace(/\s/g, '') // Supprimer espaces
              .replace(/[^\d.-]/g, ''); // Garder seulement chiffres, point et tiret
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : Math.abs(parsed); // Valeur absolue pour éviter les négatifs
          };
          
          // Extraire chaque coût réseau avec logging détaillé
          const networkCosts = {
            utilisationReseau: networkCostColumns.utilisationReseau >= 0 ? parseNetworkCost(row[networkCostColumns.utilisationReseau]) : 0,
            surcharges: networkCostColumns.surcharges >= 0 ? parseNetworkCost(row[networkCostColumns.surcharges]) : 0,
            tarifCapacitaire: networkCostColumns.tarifCapacitaire >= 0 ? parseNetworkCost(row[networkCostColumns.tarifCapacitaire]) : 0,
            tarifMesure: networkCostColumns.tarifMesure >= 0 ? parseNetworkCost(row[networkCostColumns.tarifMesure]) : 0,
            tarifOSP: networkCostColumns.tarifOSP >= 0 ? parseNetworkCost(row[networkCostColumns.tarifOSP]) : 0,
            transportELIA: networkCostColumns.transportELIA >= 0 ? parseNetworkCost(row[networkCostColumns.transportELIA]) : 0,
            redevanceVoirie: networkCostColumns.redevanceVoirie >= 0 ? parseNetworkCost(row[networkCostColumns.redevanceVoirie]) : 0,
            totalFraisReseau: networkCostColumns.totalFraisReseau >= 0 ? parseNetworkCost(row[networkCostColumns.totalFraisReseau]) : 0,
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
            Object.entries(networkCosts).forEach(([key, value]) => {
              if (!key.endsWith('Raw')) {
                const rawKey = key + 'Raw';
                const rawValue = networkCosts[rawKey as keyof typeof networkCosts];
                onLog?.(`  ${key}: ${value}€ (valeur brute: "${rawValue}")`);
              }
            });
            
            // Vérifier si au moins un coût est non-nul
            const nonZeroCosts = Object.entries(networkCosts)
              .filter(([key, value]) => !key.endsWith('Raw') && Number(value) > 0);
            if (nonZeroCosts.length > 0) {
              onLog?.(`✅ ${nonZeroCosts.length} coûts réseau non-nuls trouvés pour ${eanCode}`);
            } else {
              onLog?.(`⚠️ ATTENTION: Tous les coûts réseau sont à 0 pour ${eanCode} - vérifiez les données source`);
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
    
    console.log('✅ Données accumulées par EAN:', Object.keys(participantData).length, 'participants');
    console.log('📊 Chaque participant a maintenant 4 valeurs (HIGH + LOW sommées)');
    
    const month = this.extractMonth(filename);
    console.log('📅 Mois extrait du fichier:', month, 'depuis:', filename);
    
    const result = {
      month,
      participants: participantData,
      stats: {
        totalRowsProcessed: maxRows,
        validRowsImported: processedRows,
        participantsFound: Object.keys(participantData).length,
        unknownEansSkipped: unknownEans.size,
        participantsUpdated: Object.keys(participantData).length,
        mesuresCount: Object.keys(participantData).length * 4 // 4 valeurs par participant
      },
      totals: {
        total_volume_complementaire: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.volume_complementaire, 0),
        total_volume_partage: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.volume_partage, 0),
        total_injection_complementaire: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.injection_complementaire, 0),
        total_injection_partagee: Object.values(participantData).reduce((sum: number, p: any) => sum + p.data.injection_partagee, 0)
      },
      upload_date: new Date().toISOString(),
      filename
    };
    
    console.log('✅ RÉSULTAT FINAL:', result);
    console.log('📊 Mesures finales:', result.stats.mesuresCount, '(4 par participant)');
    
    // Sauvegarder dans localStorage ET mettre à jour la base de données
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      console.log('💾 Données existantes avant sauvegarde:', Object.keys(monthlyData));
      monthlyData[month] = result;
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('💾 Sauvegardé dans localStorage pour le mois:', month);
      console.log('💾 Données après sauvegarde:', Object.keys(monthlyData));
      
      // Mettre à jour la colonne monthly_data de chaque participant
      await this.updateParticipantsMonthlyData(result.participants, month);
      
      // Mettre à jour la colonne billing_data avec les coûts réseau
      await this.updateParticipantsBillingData(result.participants, month);
      
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde:', error);
    }
    
    return result;
  }

  /**
   * Met à jour la colonne billing_data des participants avec les coûts réseau
   */
  private static async updateParticipantsBillingData(participants: any, month: string) {
    console.log('💰 Mise à jour billing_data pour', Object.keys(participants).length, 'participants...');
    
    try {
      // Import dynamique de supabase
      const { supabase } = await import('../lib/supabase');
      
      let successCount = 0;
      let errorCount = 0;
    
      for (const [eanCode, participantData] of Object.entries(participants)) {
        try {
          // Vérifier si ce participant a des coûts réseau
          if (!participantData.networkCosts) {
            console.log(`⚠️ Pas de coûts réseau pour EAN: ${eanCode}`);
            continue;
          }
          
          console.log(`💰 Traitement coûts réseau EAN: ${eanCode}`);
          
          // Trouver le participant par son EAN
          const { data: participant, error: findError } = await supabase
            .from('participants')
            .select('id, billing_data, name')
            .eq('ean_code', eanCode)
            .single();
          
          if (findError || !participant) {
            console.warn(`⚠️ Participant avec EAN ${eanCode} non trouvé:`, findError);
            errorCount++;
            continue;
          }
          
          console.log(`✅ Participant trouvé: ${participant.name} (ID: ${participant.id})`);
          
          // Parser les données de facturation existantes
          let existingBillingData = {};
          if (participant.billing_data) {
            try {
              if (typeof participant.billing_data === 'string') {
                existingBillingData = JSON.parse(participant.billing_data);
              } else {
                existingBillingData = participant.billing_data;
              }
              console.log(`💰 Données billing existantes pour ${participant.name}:`, Object.keys(existingBillingData));
            } catch (e) {
              console.warn(`⚠️ Erreur parsing billing_data existant pour ${eanCode}:`, e);
              existingBillingData = {};
            }
          }
          
          // Préparer les nouvelles données de coûts réseau pour ce mois
          const newBillingData = {
            month: month,
            networkCosts: {
              utilisationReseau: participantData.networkCosts.utilisationReseau,
              surcharges: participantData.networkCosts.surcharges,
              tarifCapacitaire: participantData.networkCosts.tarifCapacitaire,
              tarifMesure: participantData.networkCosts.tarifMesure,
              tarifOSP: participantData.networkCosts.tarifOSP,
              transportELIA: participantData.networkCosts.transportELIA,
              redevanceVoirie: participantData.networkCosts.redevanceVoirie,
              totalFraisReseau: participantData.networkCosts.totalFraisReseau
            },
            rawData: {
              // Stocker aussi les valeurs brutes pour debug
              utilisationReseauRaw: participantData.networkCosts.utilisationReseauRaw || '',
              surchargesRaw: participantData.networkCosts.surchargesRaw || '',
              tarifCapacitaireRaw: participantData.networkCosts.tarifCapacitaireRaw || '',
              tarifMesureRaw: participantData.networkCosts.tarifMesureRaw || '',
              tarifOSPRaw: participantData.networkCosts.tarifOSPRaw || '',
              transportELIARaw: participantData.networkCosts.transportELIARaw || '',
              redevanceVoirieRaw: participantData.networkCosts.redevanceVoirieRaw || '',
              totalFraisReseauRaw: participantData.networkCosts.totalFraisReseauRaw || ''
            },
            updated_at: new Date().toISOString()
          };
          
          console.log(`💰 NOUVELLES DONNÉES BILLING pour ${participant.name} - ${month}:`);
          console.log(`💰 Structure complète:`, JSON.stringify(newBillingData, null, 2));
          
          // Ajouter/mettre à jour les données pour ce mois
          const updatedBillingData = {
            ...existingBillingData,
            [month]: newBillingData
          };
          
          console.log(`💾 Données billing complètes à sauvegarder:`, updatedBillingData);
          
          // Mettre à jour dans la base de données
          console.log(`💾 DÉBUT SAUVEGARDE billing_data pour ${participant.name} (ID: ${participant.id})`);
          console.log(`💰 Données à sauvegarder:`, JSON.stringify(updatedBillingData, null, 2));
          
          const { data: updateResult, error: updateError } = await supabase
            .from('participants')
            .update({ 
              billing_data: updatedBillingData
            })
            .eq('id', participant.id)
            .select('billing_data');
          
          if (updateError) {
            console.error(`❌ ERREUR mise à jour billing_data pour ${eanCode}:`, {
              error: updateError,
              participantId: participant.id,
              eanCode: eanCode,
              dataToSave: updatedBillingData
            });
            errorCount++;
          } else {
            console.log(`✅ SAUVEGARDE billing_data RÉUSSIE pour ${participant.name} (${eanCode}) - mois ${month}`);
            console.log(`💰 Données billing retournées par la base:`, updateResult);
            successCount++;
            
            // Vérification immédiate
            console.log(`🔍 VÉRIFICATION billing_data pour ${participant.name}...`);
            const { data: verifyData, error: verifyError } = await supabase
              .from('participants')
              .select('billing_data, name')
              .eq('id', participant.id)
              .single();
            
            if (!verifyError && verifyData) {
              console.log(`🔍 VÉRIFICATION billing_data RÉUSSIE pour ${verifyData.name}:`);
              console.log(`💰 billing_data complet en base:`, JSON.stringify(verifyData.billing_data, null, 2));
              
              if (verifyData.billing_data && verifyData.billing_data[month]) {
                console.log(`✅ CONFIRMATION: Données billing du mois ${month} bien présentes en base pour ${verifyData.name} !`);
                console.log(`💰 Coûts réseau confirmés pour ${month}:`, JSON.stringify(verifyData.billing_data[month].networkCosts, null, 2));
                
                // Vérifier que les valeurs ne sont pas toutes à 0
                const costs = verifyData.billing_data[month].networkCosts;
                const totalNonZero = Object.values(costs).filter((v: any) => Number(v) > 0).length;
                if (totalNonZero > 0) {
                  console.log(`✅ ${totalNonZero} coûts réseau non-nuls confirmés pour ${verifyData.name}`);
                } else {
                  console.warn(`⚠️ ATTENTION: Tous les coûts réseau sont à 0 pour ${verifyData.name} - vérifiez les données source`);
                }
              } else {
                console.error(`❌ PROBLÈME: Données billing du mois ${month} NON trouvées en base après sauvegarde pour ${verifyData.name} !`);
                console.log(`📊 Structure billing_data actuelle:`, verifyData.billing_data);
              }
            } else {
              console.error(`❌ ERREUR VÉRIFICATION billing_data pour ${participant.name}:`, verifyError);
            }
          }
          
        } catch (error) {
          console.error(`❌ ERREUR traitement billing_data participant ${eanCode}:`, error);
          errorCount++;
        }
      }
      
      console.log(`💰 RÉSUMÉ billing_data: ${successCount} succès, ${errorCount} erreurs`);
      
    } catch (error) {
      console.error('❌ ERREUR GÉNÉRALE lors de la mise à jour billing_data:', error);
      throw error;
    }
  }

  /**
   * Met à jour la colonne monthly_data des participants dans la base de données
   */
  private static async updateParticipantsMonthlyData(participants: any, month: string) {
    console.log('🔄 Mise à jour monthly_data pour', Object.keys(participants).length, 'participants...');
    
    try {
      // Import dynamique de supabase
      const { supabase } = await import('../lib/supabase');
      
      let successCount = 0;
      let errorCount = 0;
    
      for (const [eanCode, participantData] of Object.entries(participants)) {
        try {
          console.log(`🔍 Traitement EAN: ${eanCode}`);
          
          // Trouver le participant par son EAN
          const { data: participant, error: findError } = await supabase
            .from('participants')
            .select('id, monthly_data, name')
            .eq('ean_code', eanCode)
            .single();
          
          if (findError || !participant) {
            console.warn(`⚠️ Participant avec EAN ${eanCode} non trouvé:`, findError);
            errorCount++;
            continue;
          }
          
          console.log(`✅ Participant trouvé: ${participant.name} (ID: ${participant.id})`);
          
          // Parser les données mensuelles existantes
          let existingMonthlyData = {};
          if (participant.monthly_data) {
            try {
              if (typeof participant.monthly_data === 'string') {
                existingMonthlyData = JSON.parse(participant.monthly_data);
              } else {
                existingMonthlyData = participant.monthly_data;
              }
              console.log(`📊 Données existantes pour ${participant.name}:`, Object.keys(existingMonthlyData));
            } catch (e) {
              console.warn(`⚠️ Erreur parsing monthly_data existant pour ${eanCode}:`, e);
              existingMonthlyData = {};
            }
          }
          
          // Préparer les nouvelles données pour ce mois
          const newMonthData = {
            volume_partage: (participantData as any).data.volume_partage,
            volume_complementaire: (participantData as any).data.volume_complementaire,
            injection_partagee: (participantData as any).data.injection_partagee,
            injection_complementaire: (participantData as any).data.injection_complementaire,
            updated_at: new Date().toISOString()
          };
          
          console.log(`📊 Nouvelles données pour ${month}:`, newMonthData);
          
          // Ajouter/mettre à jour les données pour ce mois
          const updatedMonthlyData = {
            ...existingMonthlyData,
            [month]: newMonthData
          };
          
          console.log(`💾 Données complètes à sauvegarder:`, updatedMonthlyData);
          
          // Mettre à jour dans la base de données - FORCER LA SAUVEGARDE
          console.log(`💾 DÉBUT SAUVEGARDE pour participant ID: ${participant.id}`);
          const { data: updateResult, error: updateError } = await supabase
            .from('participants')
            .update({ 
              monthly_data: updatedMonthlyData
            })
            .eq('id', participant.id)
            .select('monthly_data');
          
          if (updateError) {
            console.error(`❌ ERREUR CRITIQUE mise à jour monthly_data pour ${eanCode}:`, {
              error: updateError,
              participantId: participant.id,
              eanCode: eanCode,
              dataToSave: updatedMonthlyData
            });
            errorCount++;
          } else {
            console.log(`✅ SAUVEGARDE RÉUSSIE pour ${participant.name} (${eanCode}) - mois ${month}`);
            console.log(`📊 Données retournées par la base:`, updateResult);
            successCount++;
            
            // Vérification immédiate OBLIGATOIRE
            console.log(`🔍 VÉRIFICATION IMMÉDIATE pour ${participant.name}...`);
            const { data: verifyData, error: verifyError } = await supabase
              .from('participants')
              .select('monthly_data')
              .eq('id', participant.id)
              .single();
            
            if (!verifyError && verifyData) {
              console.log(`🔍 VÉRIFICATION RÉUSSIE pour ${participant.name}:`);
              console.log(`📊 monthly_data en base:`, verifyData.monthly_data);
              
              if (verifyData.monthly_data && verifyData.monthly_data[month]) {
                console.log(`✅ CONFIRMATION: Données du mois ${month} bien présentes en base !`);
                console.log(`📊 Valeurs confirmées:`, verifyData.monthly_data[month]);
              } else {
                console.error(`❌ PROBLÈME: Données du mois ${month} NON trouvées en base après sauvegarde !`);
                console.log(`📊 Structure monthly_data actuelle:`, verifyData.monthly_data);
              }
            } else {
              console.error(`❌ ERREUR VÉRIFICATION pour ${participant.name}:`, verifyError);
            }
          }
          
        } catch (error) {
          console.error(`❌ ERREUR CRITIQUE traitement participant ${eanCode}:`, {
            error: error,
            message: error.message,
            stack: error.stack
          });
          errorCount++;
        }
      }
      
      console.log(`📊 RÉSUMÉ FINAL mise à jour monthly_data: ${successCount} succès, ${errorCount} erreurs`);
      
      if (successCount === 0) {
        console.error(`❌ AUCUNE SAUVEGARDE RÉUSSIE ! Vérifiez les permissions Supabase et la structure de la table.`);
        throw new Error(`Aucun participant n'a pu être mis à jour en base de données`);
      }
      
    } catch (error) {
      console.error('❌ ERREUR GÉNÉRALE lors de la mise à jour monthly_data:', {
        error: error,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private static extractMonth(filename: string): string {
    console.log('🔍 Extraction du mois depuis:', filename);
    
    try {
      // Chercher des patterns de mois dans le nom du fichier
      const patterns = [
        // Format APR2025, MAY2025, etc.
        /([A-Z]{3})(\d{4})/i,
        // Format 04-2025, 05-2025, etc.
        /(\d{1,2})-(\d{4})/,
        // Format 2025-04, 2025-05, etc.
        /(\d{4})-(\d{1,2})/,
        // Format avril, mai, etc.
        /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i
      ];
      
      // Essayer le pattern APR2025
      const monthMatch = filename.match(patterns[0]);
      if (monthMatch) {
        const [, monthAbbr, year] = monthMatch;
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        const monthNum = monthMap[monthAbbr.toUpperCase()];
        if (monthNum) {
          const result = `${year}-${monthNum}`;
          console.log('✅ Mois extrait:', result, 'depuis pattern APR2025');
          return result;
        }
      }
      
      // Si aucun pattern trouvé, utiliser le mois actuel
      const now = new Date();
      const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('⚠️ Aucun pattern trouvé, utilisation du mois actuel:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erreur extraction mois:', error);
      const now = new Date();
      const result = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('🔄 Fallback vers mois actuel:', result);
      return result;
    }
  }
  
  /**
   * Nettoie les données mensuelles stockées
   */
  static clearMonthlyData() {
    try {
      localStorage.removeItem('monthly_data');
      console.log('🧹 Données mensuelles nettoyées');
      return true;
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return false;
    }
  }
  
  /**
   * Supprime un mois spécifique
   */
  static removeMonth(month: string) {
    try {
      const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
      delete monthlyData[month];
      localStorage.setItem('monthly_data', JSON.stringify(monthlyData));
      console.log('🗑️ Mois supprimé:', month);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression mois:', error);
      return false;
    }
  }
}