import React, { useState } from 'react';
import { FileText, Download, X, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface InvoiceTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    id: string;
    name: string;
    address: string;
    email: string;
    ean_code: string;
    type: 'producer' | 'consumer';
    commodity_rate: number;
    entry_date: string;
    monthly_data?: string;
    billing_data?: string;
  };
  selectedPeriod: {
    startMonth: string;
    endMonth: string;
  };
}

export function InvoiceTemplate({ isOpen, onClose, participant, selectedPeriod }: InvoiceTemplateProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Calculer les vraies données de facturation
  const calculateBillingData = React.useMemo(() => {
    try {
      console.log('💰 Calcul des données de facturation pour:', participant.name);
      console.log('📅 Période:', selectedPeriod);

      // Charger les données mensuelles du participant
      let monthlyData = {};
      if (participant.monthly_data) {
        try {
          monthlyData = typeof participant.monthly_data === 'string' 
            ? JSON.parse(participant.monthly_data)
            : participant.monthly_data;
        } catch (e) {
          console.warn('Erreur parsing monthly_data:', e);
        }
      }

      // Générer la liste des mois dans la période
      const startDate = new Date(selectedPeriod.startMonth + '-01');
      const endDate = new Date(selectedPeriod.endMonth + '-01');
      const months = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthKey);
      }

      console.log('📅 Mois à traiter:', months);

      // Calculer les totaux pour la période
      let totalVolumePartage = 0;
      let totalVolumeComplementaire = 0;
      let totalInjectionPartagee = 0;
      let totalInjectionComplementaire = 0;
      const monthlyDetails = [];

      months.forEach(monthKey => {
        const monthData = monthlyData[monthKey];
        if (monthData) {
          const volumePartage = monthData.volume_partage || 0;
          const volumeComplementaire = monthData.volume_complementaire || 0;
          const injectionPartagee = monthData.injection_partagee || 0;
          const injectionComplementaire = monthData.injection_complementaire || 0;

          totalVolumePartage += volumePartage;
          totalVolumeComplementaire += volumeComplementaire;
          totalInjectionPartagee += injectionPartagee;
          totalInjectionComplementaire += injectionComplementaire;

          monthlyDetails.push({
            month: monthKey,
            monthName: format(new Date(monthKey + '-01'), 'MMMM yyyy', { locale: fr }),
            volumePartage,
            volumeComplementaire,
            injectionPartagee,
            injectionComplementaire
          });
        }
      });

      // Calculer les montants financiers
      const commodityRate = participant.commodity_rate || 100; // €/MWh
      const networkRate = 150; // €/MWh (prix réseau estimé)
      const injectionNetworkRate = 50; // €/MWh (prix injection réseau)

      // Montants pour consommateur
      const montantVolumePartage = (totalVolumePartage / 1000) * commodityRate;
      const montantVolumeComplementaire = (totalVolumeComplementaire / 1000) * networkRate;
      
      // Montants pour producteur
      const montantInjectionPartagee = (totalInjectionPartagee / 1000) * commodityRate;
      const montantInjectionComplementaire = (totalInjectionComplementaire / 1000) * injectionNetworkRate;

      // Calcul du total selon le type
      let sousTotal = 0;
      if (participant.type === 'consumer') {
        sousTotal = montantVolumePartage + montantVolumeComplementaire;
      } else {
        sousTotal = montantInjectionPartagee + montantInjectionComplementaire;
      }

      const tva = sousTotal * 0.21;
      const totalFinal = sousTotal + tva;

      return {
        energy: {
          totalVolumePartage,
          totalVolumeComplementaire,
          totalInjectionPartagee,
          totalInjectionComplementaire,
          volumeTotal: totalVolumePartage + totalVolumeComplementaire,
          injectionTotale: totalInjectionPartagee + totalInjectionComplementaire
        },
        amounts: {
          montantVolumePartage: Math.round(montantVolumePartage * 100) / 100,
          montantVolumeComplementaire: Math.round(montantVolumeComplementaire * 100) / 100,
          montantInjectionPartagee: Math.round(montantInjectionPartagee * 100) / 100,
          montantInjectionComplementaire: Math.round(montantInjectionComplementaire * 100) / 100,
          sousTotal: Math.round(sousTotal * 100) / 100,
          tva: Math.round(tva * 100) / 100,
          totalFinal: Math.round(totalFinal * 100) / 100
        },
        rates: {
          commodityRate,
          networkRate,
          injectionNetworkRate
        },
        statistics: {
          pourcentageLocal: totalVolumePartage + totalVolumeComplementaire > 0 
            ? Math.round((totalVolumePartage / (totalVolumePartage + totalVolumeComplementaire)) * 100)
            : 0,
          pourcentagePartage: totalInjectionPartagee + totalInjectionComplementaire > 0
            ? Math.round((totalInjectionPartagee / (totalInjectionPartagee + totalInjectionComplementaire)) * 100)
            : 0,
          economieRealisee: participant.type === 'consumer' 
            ? Math.round(((totalVolumePartage / 1000) * (networkRate - commodityRate)) * 100) / 100
            : 0,
          revenusSup: participant.type === 'producer'
            ? Math.round(((totalInjectionPartagee / 1000) * (commodityRate - injectionNetworkRate)) * 100) / 100
            : 0
        }
      };

    } catch (error) {
      console.error('❌ Erreur calcul facturation:', error);
      return {
        energy: { totalVolumePartage: 0, totalVolumeComplementaire: 0, totalInjectionPartagee: 0, totalInjectionComplementaire: 0, volumeTotal: 0, injectionTotale: 0 },
        amounts: { montantVolumePartage: 0, montantVolumeComplementaire: 0, montantInjectionPartagee: 0, montantInjectionComplementaire: 0, sousTotal: 0, tva: 0, totalFinal: 0 },
        rates: { commodityRate: 100, networkRate: 150, injectionNetworkRate: 50 },
        statistics: { pourcentageLocal: 0, pourcentagePartage: 0, economieRealisee: 0, revenusSup: 0 }
      };
    }
  }, [participant, selectedPeriod]);

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('💾 Sauvegarde des données de facturation...');
      
      // Générer la liste des mois dans la période
      const startDate = new Date(selectedPeriod.startMonth + '-01');
      const endDate = new Date(selectedPeriod.endMonth + '-01');
      const months = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthKey);
      }

      // Créer l'objet de données de facturation complet
      const billingData = {
        // Informations de la facture
        invoiceNumber: `SIU-${format(new Date(), 'yyyy-MM')}-${participant.id.slice(-6).toUpperCase()}`,
        invoiceDate: format(new Date(), 'dd/MM/yyyy'),
        dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy'),
        
        // Période de facturation
        period: {
          startMonth: selectedPeriod.startMonth,
          endMonth: selectedPeriod.endMonth,
          startDate: format(new Date(selectedPeriod.startMonth + '-01'), 'dd/MM/yyyy'),
          endDate: format(new Date(selectedPeriod.endMonth + '-01'), 'dd/MM/yyyy'),
          periodText: months.length === 1 
            ? format(new Date(months[0] + '-01'), 'MMMM yyyy', { locale: fr })
            : `${format(new Date(months[0] + '-01'), 'MMMM yyyy', { locale: fr })} à ${format(new Date(months[months.length - 1] + '-01'), 'MMMM yyyy', { locale: fr })}`
        },
        
        // Données énergétiques totales (en kWh)
        energy: calculateBillingData.energy,
        
        // Tarifs appliqués
        rates: calculateBillingData.rates,
        
        // Montants financiers
        amounts: calculateBillingData.amounts,
        
        // Pourcentages et statistiques
        statistics: calculateBillingData.statistics,
        
        // Métadonnées
        metadata: {
          generatedAt: new Date().toISOString(),
          participantType: participant.type,
          participantName: participant.name,
          participantEan: participant.ean_code,
          monthsIncluded: months.length,
          dataSource: 'monthly_data',
          period: selectedPeriod
        }
      };

      // Sauvegarder dans la colonne billing_data
      const { error } = await supabase
        .from('participants')
        .update({ 
          billing_data: JSON.stringify(billingData)
        })
        .eq('id', participant.id);

      if (error) {
        console.error('❌ Erreur sauvegarde billing_data:', error);
        toast.error('Erreur lors de la sauvegarde des données de facturation');
      } else {
        console.log('✅ Données de facturation sauvegardées dans billing_data');
        toast.success('Données de facturation sauvegardées');
        setIsSaved(true);
      }

    } catch (error) {
      console.error('❌ Erreur calcul facturation:', error);
      toast.error('Erreur lors du calcul des données de facturation');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    // Si pas sauvegardé, supprimer les données de billing_data
    if (!isSaved) {
      try {
        console.log('🗑️ Suppression des données de facturation non sauvegardées...');
        
        // Supprimer les billing_data du participant
        const { error } = await supabase
          .from('participants')
          .update({ 
            billing_data: null
          })
          .eq('id', participant.id);

        if (error) {
          console.error('❌ Erreur suppression billing_data:', error);
        } else {
          console.log('✅ Données de facturation supprimées');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
      }
    }
    
    // Reset des états
    setIsSaved(false);
    onClose();
  };

  const invoiceNumber = `SIU-${format(new Date(), 'yyyy-MM')}-${participant.id.slice(-6).toUpperCase()}`;
  const invoiceDate = format(new Date(), 'dd/MM/yyyy');
  const dueDate = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy');

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Logique pour télécharger le PDF
    console.log('Téléchargement de la facture pour:', participant.name);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header avec boutons d'action */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Facture - {participant.name}
            </h2>
            {!isSaved && (
              <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-orange-700 font-medium">Non sauvegardée</span>
              </div>
            )}
            {isSaved && (
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
                <Save className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Sauvegardée</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving || isSaved}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaved ? 'Sauvegardé' : 'Sauvegarder'}
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Imprimer
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </button>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenu de la facture */}
        <div className="p-8 bg-white" id="invoice-content">
          {/* En-tête de la facture */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center space-x-4">
              <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="w-16 h-16" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sun Is Up ASBL</h1>
                <p className="text-gray-600">Communauté d'énergie locale</p>
                <div className="text-sm text-gray-500 mt-2">
                  <p>Rue de la Science 14B</p>
                  <p>1040 Bruxelles</p>
                  <p>TVA: BE 0123.456.789</p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <h2 className="text-xl font-bold text-amber-600 mb-2">
                {participant.type === 'producer' ? 'Facture de production' : 'Facture d\'électricité locale'}
              </h2>
              <div className="text-sm text-gray-600">
                <p><strong>N° Facture:</strong> {invoiceNumber}</p>
                <p><strong>Date:</strong> {invoiceDate}</p>
                <p><strong>Échéance:</strong> {dueDate}</p>
              </div>
            </div>
          </div>

          {/* Informations client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Facturé à :</h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="font-medium text-gray-900">{participant.name}</p>
                <p className="text-gray-600">{participant.address}</p>
                {participant.company_number && (
                  <p className="text-gray-600 mt-2">
                    <strong>N° entreprise:</strong> {participant.company_number}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Période de facturation :</h3>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-amber-800">
                  <strong>Du:</strong> {format(new Date(selectedPeriod.startMonth + '-01'), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-amber-800">
                  <strong>Au:</strong> {format(new Date(new Date(selectedPeriod.endMonth + '-01').getFullYear(), new Date(selectedPeriod.endMonth + '-01').getMonth() + 1, 0), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  Type: {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                </p>
              </div>
            </div>
          </div>

          {/* Détail de la consommation d'électricité locale */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Détail de la consommation d'électricité locale
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Prix unitaire
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Montant HTVA
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participant.type === 'consumer' ? (
                    <>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Électricité locale consommée
                          <div className="text-xs text-gray-500">Énergie partagée de la communauté</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {(calculateBillingData.energy.totalVolumePartage / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {participant.commodity_rate} €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {calculateBillingData.amounts.montantVolumePartage.toFixed(2)} €
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Frais réseaux
                          <div className="text-xs text-gray-400">Frais versés à Sibelga</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {(calculateBillingData.energy.totalVolumePartage / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          -
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {(() => {
                            // Calculer le montant des frais réseau depuis monthly_data
                            try {
                              let monthlyData = {};
                              if (participant.monthly_data) {
                                monthlyData = typeof participant.monthly_data === 'string' 
                                  ? JSON.parse(participant.monthly_data)
                                  : participant.monthly_data;
                              }
                              
                              const startDate = new Date(selectedPeriod.startMonth + '-01');
                              const endDate = new Date(selectedPeriod.endMonth + '-01');
                              let totalNetworkFees = 0;
                              
                              for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
                                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const monthData = monthlyData[monthKey];
                                
                                if (monthData && monthData.allColumns) {
                                  Object.values(monthData.allColumns).forEach((rowData: any) => {
                                    // Toutes les colonnes de frais réseau à additionner
                                    const utilisationReseau = parseFloat(String(rowData['Utilisation du réseau € HTVA'] || '0').replace(',', '.')) || 0;
                                    const surcharges = parseFloat(String(rowData['Surcharges € HTVA'] || '0').replace(',', '.')) || 0;
                                    const tarifCapac = parseFloat(String(rowData['Tarif capac. (>2020) € HTVA'] || '0').replace(',', '.')) || 0;
                                    const tarifMesure = parseFloat(String(rowData['Tarif mesure & comptage € HTVA'] || '0').replace(',', '.')) || 0;
                                    const tarifOSP = parseFloat(String(rowData['Tarif OSP € HTVA'] || '0').replace(',', '.')) || 0;
                                    const transportElia = parseFloat(String(rowData['Transport - coût ELIA € HTVA'] || '0').replace(',', '.')) || 0;
                                    const redevanceVoirie = parseFloat(String(rowData['Redevance de voirie € HTVA'] || '0').replace(',', '.')) || 0;
                                    const gridfee = parseFloat(String(rowData['Gridfee € HTVA'] || '0').replace(',', '.')) || 0;
                                    
                                    console.log('🔍 Frais réseau détaillés:', {
                                      utilisationReseau,
                                      surcharges,
                                      tarifCapac,
                                      tarifMesure,
                                      tarifOSP,
                                      transportElia,
                                      redevanceVoirie,
                                      gridfee
                                    });
                                    
                                    totalNetworkFees += utilisationReseau + surcharges + tarifCapac + tarifMesure + tarifOSP + transportElia + redevanceVoirie + gridfee;
                                  });
                                }
                              }
                              
                              console.log('💰 Total frais réseau calculé:', totalNetworkFees);
                              return totalNetworkFees.toFixed(2);
                            } catch (error) {
                              console.error('Erreur calcul frais réseau:', error);
                              return '0.00';
                            }
                          })()} €
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Injection locale
                          <div className="text-xs text-gray-500">Énergie vendue à la communauté</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {(calculateBillingData.energy.totalInjectionPartagee / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {participant.commodity_rate} €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {calculateBillingData.amounts.montantInjectionPartagee.toFixed(2)} €
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Injection réseau
                          <div className="text-xs text-gray-500">Énergie vendue au réseau</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {(calculateBillingData.energy.totalInjectionComplementaire / 1000).toFixed(3)} MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {calculateBillingData.rates.injectionNetworkRate} €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {calculateBillingData.amounts.montantInjectionComplementaire.toFixed(2)} €
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Résumé des rémunérations liées à l'injection locale (pour producteurs) */}
          {participant.type === 'producer' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Résumé des rémunérations liées à l'injection locale
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{(calculateBillingData.energy.injectionTotale / 1000).toFixed(3)} MWh</div>
                    <div className="text-sm text-amber-700">Injection totale</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{calculateBillingData.statistics.pourcentagePartage}%</div>
                    <div className="text-sm text-amber-700">Part vendue localement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{calculateBillingData.amounts.montantInjectionPartagee.toFixed(2)} €</div>
                    <div className="text-sm text-amber-700">Revenus totaux</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Résumé de la facture finale */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Résumé de la facture finale
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">Sous-total</span>
                <span className="font-medium">{calculateBillingData.amounts.sousTotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">TVA (21%)</span>
                <span className="font-medium">{calculateBillingData.amounts.tva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center py-3 text-lg font-bold text-gray-900">
                <span>Total à {participant.type === 'producer' ? 'recevoir' : 'payer'}</span>
                <span className={participant.type === 'producer' ? 'text-green-600' : 'text-amber-600'}>
                  {calculateBillingData.amounts.totalFinal.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>

          {/* Informations de paiement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations de paiement</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Bénéficiaire:</strong> Sun Is Up ASBL</p>
                  <p><strong>IBAN:</strong> BE12 3456 7890 1234</p>
                  <p><strong>BIC:</strong> GKCCBEBB</p>
                  <p><strong>Communication:</strong> {invoiceNumber}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Conditions de paiement</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Échéance:</strong> {dueDate}</p>
                  <p><strong>Délai:</strong> 30 jours</p>
                  <p><strong>Pénalités:</strong> 1% par mois de retard</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes et conditions */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes et conditions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                • Cette facture concerne {participant.type === 'producer' ? 'la rémunération de votre production' : 'votre consommation'} 
                d'électricité dans le cadre de la communauté d'énergie Sun Is Up.
              </p>
              <p>
                • Les tarifs appliqués sont conformes aux accords de la communauté d'énergie.
              </p>
              <p>
                • Pour toute question concernant cette facture, contactez-nous à info@sunisup.be ou +32 471 31 71 48.
              </p>
              {participant.type === 'consumer' && (
                <p>
                  • Votre consommation d'énergie locale vous permet d'économiser par rapport aux tarifs du marché traditionnel.
                </p>
              )}
              {participant.type === 'producer' && (
                <p>
                  • Merci de contribuer à l'approvisionnement en énergie locale de notre communauté.
                </p>
              )}
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>
              Sun Is Up ASBL - Communauté d'énergie bruxelloise | 
              info@sunisup.be | +32 471 31 71 48 | 
              TVA: BE 0123.456.789
            </p>
            <p className="mt-1">
              Facture générée automatiquement le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}