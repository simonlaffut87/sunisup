import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Calendar, 
  Edit3, 
  Eye, 
  Trash2, 
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Users,
  X,
  Zap,
  RefreshCw,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { StreamingExcelImport } from './StreamingExcelImport';
import { ExcelProcessor } from '../utils/excelProcessor';

interface MonthlyFileManagerProps {
  onImportSuccess: () => void;
}

interface MonthlyFileRecord {
  id: string;
  month: string;
  filename: string;
  upload_date: string;
  file_size: number;
  status: string;
  data_points: number;
  participant_count: number;
  unknown_eans?: string[];
  mesures_count?: number;
}

export function MonthlyFileManager({ onImportSuccess }: MonthlyFileManagerProps) {
  const [files, setFiles] = useState<MonthlyFileRecord[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingData, setViewingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    try {
      setLoading(true);
      const monthlyData = localStorage.getItem('monthly_data');
      
      if (monthlyData) {
        const data = JSON.parse(monthlyData);
        const fileRecords = Object.entries(data).map(([month, fileData]: [string, any]) => ({
          id: month,
          month,
          filename: fileData.filename || `${month}.xlsx`,
          upload_date: fileData.upload_date || new Date().toISOString(),
          file_size: 0,
          status: 'processed',
          data_points: fileData.stats?.validRowsImported || 0,
          participant_count: Object.keys(fileData.participants || {}).length,
          unknown_eans: fileData.stats?.unknownEansSkipped || [],
          mesures_count: fileData.stats?.mesuresCount || fileData.mesures?.length || 0
        }));
        setFiles(fileRecords.sort((a, b) => b.month.localeCompare(a.month)));
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Erreur chargement fichiers:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async (data: any) => {
    try {
      console.log('✅ Import réussi pour le mois:', data.month);
      loadFiles(); // Recharger la liste des fichiers
      onImportSuccess();
      
      toast.success(`✅ Données importées avec succès pour ${format(new Date(data.month + '-01'), 'MMMM yyyy', { locale: fr })}`);
    } catch (error) {
      console.error('❌ Erreur lors de la gestion de l\'import:', error);
      toast.error('Erreur lors de l\'importation des données');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${file.filename}" ?\n\nCela supprimera également toutes les données associées pour ${format(new Date(file.month + '-01'), 'MMMM yyyy', { locale: fr })}.`)) {
      try {
        const updatedFiles = files.filter(f => f.id !== fileId);
        setFiles(updatedFiles);

        const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
        delete monthlyData[file.month];
        localStorage.setItem('monthly_data', JSON.stringify(monthlyData));

        toast.success('Fichier supprimé avec succès');
        onImportSuccess();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleViewData = (file: MonthlyFileRecord) => {
    const monthlyData = JSON.parse(localStorage.getItem('monthly_data') || '{}');
    const data = monthlyData[file.month];
    
    if (data) {
      setViewingData(data);
    } else {
      toast.error('Données non trouvées pour ce mois');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Traité
          </span>
        );
      case 'uploaded':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erreur
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            Inconnu
          </span>
        );
    }
  };

  const downloadTemplate = () => {
    try {
      ExcelProcessor.generateTemplate();
      toast.success('✅ Template téléchargé avec succès');
    } catch (error) {
      console.error('❌ Erreur téléchargement template:', error);
      toast.error('❌ Erreur lors du téléchargement du template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fichiers mensuels</h2>
          <p className="text-gray-600 text-sm mt-1">
            Import quart-horaire avec contrôle streaming
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Template
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm hover:shadow-md"
          >
            <Zap className="w-4 h-4 mr-2" />
            Import Quart-Horaire
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <FileSpreadsheet className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{files.length}</div>
                <div className="text-sm text-gray-600">Fichiers importés</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {files.filter(f => f.status === 'processed').length}
                </div>
                <div className="text-sm text-gray-600">Fichiers traités</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.max(...files.map(f => f.participant_count), 0)}
                </div>
                <div className="text-sm text-gray-600">Participants max</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-amber-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {files.reduce((sum, f) => sum + (f.mesures_count || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Mesures quart-horaires</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des fichiers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Liste des fichiers importés</h3>
          <button 
            onClick={loadFiles}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mois
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fichier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'import
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mesures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mr-3" />
                      <span className="text-gray-600">Chargement des fichiers...</span>
                    </div>
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">Aucun fichier importé</p>
                    <p className="text-sm">Utilisez l'import quart-horaire pour traiter vos fichiers Excel</p>
                    <p className="text-xs text-green-600 mt-2">
                      ✨ Nouveau : Import anti-crash avec pause/reprise
                    </p>
                  </td>
                </tr>
              ) : (
                files.map((file) => {
                  const monthLabel = format(new Date(file.month + '-01'), 'MMMM yyyy', { locale: fr });
                  
                  return (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">{monthLabel}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileSpreadsheet className="w-4 h-4 text-green-600 mr-2" />
                          <div className="text-sm text-gray-900">{file.filename}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {format(new Date(file.upload_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>{file.participant_count} participants</div>
                          {file.unknown_eans && file.unknown_eans.length > 0 && (
                            <div className="text-xs text-red-600">
                              {file.unknown_eans.length} EAN(s) ignoré(s)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(file.mesures_count || 0).toLocaleString()} mesures
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(file.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewData(file)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Voir les données"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'import streaming */}
      <StreamingExcelImport
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Modal de visualisation des données */}
      {viewingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Données - {format(new Date(viewingData.month + '-01'), 'MMMM yyyy', { locale: fr })}
                </h3>
                <button
                  onClick={() => setViewingData(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Statistiques */}
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    Statistiques d'import
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-700">Participants</div>
                      <div className="font-bold text-blue-900">{Object.keys(viewingData.participants || {}).length}</div>
                    </div>
                    <div>
                      <div className="text-blue-700">Mesures</div>
                      <div className="font-bold text-blue-900">{(viewingData.mesures?.length || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-blue-700">Date d'import</div>
                      <div className="font-bold text-blue-900">{format(new Date(viewingData.upload_date), 'dd/MM/yyyy', { locale: fr })}</div>
                    </div>
                    <div>
                      <div className="text-blue-700">Fichier</div>
                      <div className="font-bold text-blue-900 truncate max-w-[150px]">{viewingData.filename}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totaux */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Volume Complémentaire</div>
                  <div className="text-xl font-bold text-blue-900">
                    {viewingData.totals.total_volume_complementaire.toFixed(2)} kWh
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Volume Partagé</div>
                  <div className="text-xl font-bold text-green-900">
                    {viewingData.totals.total_volume_partage.toFixed(2)} kWh
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm text-amber-600">Injection Complémentaire</div>
                  <div className="text-xl font-bold text-amber-900">
                    {viewingData.totals.total_injection_complementaire.toFixed(2)} kWh
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">Injection Partagée</div>
                  <div className="text-xl font-bold text-purple-900">
                    {viewingData.totals.total_injection_partagee.toFixed(2)} kWh
                  </div>
                </div>
              </div>

              {/* Détail par participant */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Volume Compl.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Volume Partagé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Injection Compl.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Injection Partagée
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(viewingData.participants || {}).map(([eanCode, participant]: [string, any]) => (
                      <tr key={eanCode} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                            <div className="text-xs text-gray-500">{eanCode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            participant.type === 'producer' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.data.volume_complementaire.toFixed(2)} kWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.data.volume_partage.toFixed(2)} kWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.data.injection_complementaire.toFixed(2)} kWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.data.injection_partagee.toFixed(2)} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}