import React from 'react';
import { X, FileSpreadsheet, CheckCircle, AlertCircle, Download, Database, Users, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ImportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: {
    filename: string;
    month: string;
    stats: {
      totalRowsProcessed: number;
      validRowsImported: number;
      errorRowsSkipped: number;
      participantsFound: number;
      unknownEansSkipped: number;
      mesuresCount: number;
    };
    participants: Record<string, any>;
    errors?: string[];
    warnings?: string[];
  } | null;
}

export function ImportReportModal({ isOpen, onClose, report }: ImportReportModalProps) {
  if (!isOpen || !report) return null;

  const downloadErrorReport = () => {
    const reportText = [
      'Rapport d\'import Excel - Sun Is Up',
      '================================',
      '',
      `Fichier: ${report.filename}`,
      `Mois: ${format(new Date(report.month + '-01'), 'MMMM yyyy', { locale: fr })}`,
      `Date d'import: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`,
      '',
      '--- STATISTIQUES ---',
      `Lignes traitées: ${report.stats.totalRowsProcessed.toLocaleString()}`,
      `Lignes importées: ${report.stats.validRowsImported.toLocaleString()}`,
      `Lignes ignorées: ${report.stats.errorRowsSkipped.toLocaleString()}`,
      `Participants trouvés: ${report.stats.participantsFound.toLocaleString()}`,
      `EANs non reconnus: ${report.stats.unknownEansSkipped.toLocaleString()}`,
      `Mesures quart-horaires: ${report.stats.mesuresCount.toLocaleString()}`,
      '',
      '--- PARTICIPANTS IMPORTÉS ---',
      ...Object.entries(report.participants).map(([ean, data]) => 
        `${ean}: ${data.name} (${data.type === 'producer' ? 'Producteur' : 'Consommateur'})`
      ),
      '',
      report.errors && report.errors.length > 0 ? [
        '--- ERREURS ---',
        ...report.errors
      ].join('\n') : '',
      '',
      report.warnings && report.warnings.length > 0 ? [
        '--- AVERTISSEMENTS ---',
        ...report.warnings
      ].join('\n') : ''
    ].filter(Boolean).join('\n');

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-import-${report.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import réussi</h2>
                <p className="text-sm text-gray-600">
                  {format(new Date(report.month + '-01'), 'MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Importé le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center space-x-3 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Lignes</h3>
              </div>
              <p className="text-xl font-bold text-blue-800">
                {report.stats.validRowsImported.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600">sur {report.stats.totalRowsProcessed.toLocaleString()} lignes</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center space-x-3 mb-2">
                <Database className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-900">Mesures</h3>
              </div>
              <p className="text-xl font-bold text-green-800">
                {report.stats.mesuresCount?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600">points de données</p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="w-5 h-5 text-amber-600" />
                <h3 className="font-medium text-amber-900">Participants</h3>
              </div>
              <p className="text-xl font-bold text-amber-800">
                {report.stats.participantsFound?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-amber-600">avec code EAN reconnu</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center space-x-3 mb-2">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-purple-900">EANs ignorés</h3>
              </div>
              <p className="text-xl font-bold text-purple-800">
                {report.stats.unknownEansSkipped?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-purple-600">non reconnus dans le système</p>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Statistiques détaillées</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Lignes traitées</p>
                <p className="font-medium text-gray-900">{report.stats.totalRowsProcessed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Lignes importées</p>
                <p className="font-medium text-gray-900">{report.stats.validRowsImported.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Lignes ignorées</p>
                <p className="font-medium text-gray-900">{report.stats.errorRowsSkipped.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Taux de réussite</p>
                <p className="font-medium text-gray-900">
                  {report.stats.totalRowsProcessed > 0 
                    ? Math.round((report.stats.validRowsImported / report.stats.totalRowsProcessed) * 100)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-gray-600">Participants trouvés</p>
                <p className="font-medium text-gray-900">{report.stats.participantsFound.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">EANs non reconnus</p>
                <p className="font-medium text-gray-900">{report.stats.unknownEansSkipped.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Liste des participants */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Participants importés ({Object.keys(report.participants).length})</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code EAN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Compl.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Partagé</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Injection Compl.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Injection Part.</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(report.participants).map(([ean, data]: [string, any]) => (
                      <tr key={ean} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{ean}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{data.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{data.data.volume_complementaire.toFixed(2)} kWh</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{data.data.volume_partage.toFixed(2)} kWh</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{data.data.injection_complementaire.toFixed(2)} kWh</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{data.data.injection_partagee.toFixed(2)} kWh</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Avertissements */}
          {report.warnings && report.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Avertissements ({report.warnings.length})</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                <div className="space-y-1 text-sm text-yellow-800">
                  {report.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span>•</span>
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={downloadErrorReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le rapport</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}