import React from 'react';
import { FileText, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  };
}

export function InvoiceTemplate({ isOpen, onClose, participant }: InvoiceTemplateProps) {
  if (!isOpen) return null;

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
          </div>
          <div className="flex items-center space-x-3">
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
              onClick={onClose}
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{participant.name}</p>
                <p className="text-gray-600">{participant.address}</p>
                <p className="text-gray-600">{participant.email}</p>
                <p className="text-sm text-gray-500 mt-2">
                  <strong>Code EAN:</strong> {participant.ean_code}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Période de facturation :</h3>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-amber-800">
                  <strong>Du:</strong> [DATE_DEBUT]
                </p>
                <p className="text-amber-800">
                  <strong>Au:</strong> [DATE_FIN]
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
                      Montant
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
                          [VOLUME_PARTAGE] MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {participant.commodity_rate} €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          [MONTANT_PARTAGE] €
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Électricité réseau
                          <div className="text-xs text-gray-500">Complément via le réseau traditionnel</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          [VOLUME_COMPLEMENTAIRE] MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          [PRIX_RESEAU] €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          [MONTANT_COMPLEMENTAIRE] €
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
                          [INJECTION_PARTAGEE] MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {participant.commodity_rate} €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          [MONTANT_INJECTION_PARTAGEE] €
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          Injection réseau
                          <div className="text-xs text-gray-500">Énergie vendue au réseau</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          [INJECTION_COMPLEMENTAIRE] MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          [PRIX_INJECTION_RESEAU] €/MWh
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          [MONTANT_INJECTION_COMPLEMENTAIRE] €
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Résumé des coûts réels pour l'électricité consommée localement */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Résumé des coûts réels pour l'électricité consommée localement
            </h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">[VOLUME_TOTAL] MWh</div>
                  <div className="text-sm text-green-700">Volume total consommé</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">[POURCENTAGE_LOCAL]%</div>
                  <div className="text-sm text-green-700">Part d'énergie locale</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">[ECONOMIE_TOTALE] €</div>
                  <div className="text-sm text-green-700">Économie réalisée</div>
                </div>
              </div>
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
                    <div className="text-2xl font-bold text-amber-600">[INJECTION_TOTALE] MWh</div>
                    <div className="text-sm text-amber-700">Injection totale</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">[POURCENTAGE_PARTAGE]%</div>
                    <div className="text-sm text-amber-700">Part vendue localement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">[REVENUS_TOTAUX] €</div>
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
                <span className="font-medium">[SOUS_TOTAL] €</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">TVA (21%)</span>
                <span className="font-medium">[TVA] €</span>
              </div>
              <div className="flex justify-between items-center py-3 text-lg font-bold text-gray-900">
                <span>Total à {participant.type === 'producer' ? 'recevoir' : 'payer'}</span>
                <span className={participant.type === 'producer' ? 'text-green-600' : 'text-amber-600'}>
                  [TOTAL_FINAL] €
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