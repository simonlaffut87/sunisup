import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Trash2,
  Eye,
  BarChart3,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { StreamingExcelImport } from './StreamingExcelImport';
import { ManualDataImport } from './ManualDataImport';
import { ExcelProcessor } from '../utils/excelProcessor';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  const [showManualImport, setShowManualImport] = useState(false);
  const [viewingData, setViewingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadFiles();
    loadChartDataFromParticipants();
  }, []);

  const loadChartDataFromParticipants = async () => {
    try {
      console.log('📊 Chargement des données monthly_data depuis les participants...');
      
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*')
        .not('monthly_data', 'is', null)
        .not('monthly_data', 'eq', '{}');

      if (error) {
        console.warn('Erreur chargement participants, utilisation localStorage:', error);
        // Charger depuis localStorage en cas d'erreur
        const monthlyData = localStorage.getItem('monthly_data');
        if (monthlyData) {
          const data = JSON.parse(monthlyData);
          const chartDataArray = Object.entries(data).map(([month, fileData]: [string, any]) => ({
            month: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
            monthKey: month,
            'Volume Partagé': Math.round((fileData.totals?.total_volume_partage || 0) / 1000 * 1000) / 1000,
            'Volume Complémentaire': Math.round((fileData.totals?.total_volume_complementaire || 0) / 1000 * 1000) / 1000,
            'Injection Partagée': Math.round((fileData.totals?.total_injection_partagee || 0) / 1000 * 1000) / 1000,
            'Injection Résiduelle': Math.round((fileData.totals?.total_injection_complementaire || 0) / 1000 * 1000) / 1000,
            participants: Object.keys(fileData.participants || {}).length
          })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
          setChartData(chartDataArray);
        }
        return;
      }

      console.log('✅ Participants avec monthly_data:', participants?.length || 0);

      // Créer un objet pour accumuler les données par mois
      const monthlyTotals: { [month: string]: {
        volume_partage: number;
        volume_complementaire: number;
        injection_partagee: number;
        injection_complementaire: number;
        participant_count: number;
      } } = {};

      participants?.forEach(participant => {
        console.log(`🔍 Participant: ${participant.name}, monthly_data:`, participant.monthly_data);
        
        if (participant.monthly_data) {
          try {
            let monthlyData;
            if (typeof participant.monthly_data === 'string') {
              monthlyData = JSON.parse(participant.monthly_data);
            } else {
              monthlyData = participant.monthly_data;
            }
            
            console.log(`📊 Données mensuelles parsées pour ${participant.name}:`, monthlyData);
            
            // Parcourir chaque mois dans les données du participant
            Object.entries(monthlyData).forEach(([month, data]: [string, any]) => {
              console.log(`📅 Mois ${month} pour ${participant.name}:`, data);
              
              if (!monthlyTotals[month]) {
                monthlyTotals[month] = {
                  volume_partage: 0,
                  volume_complementaire: 0,
                  injection_partagee: 0,
                  injection_complementaire: 0,
                  participant_count: 0
                };
              }
              
              // Ajouter les valeurs de ce participant aux totaux du mois
              const volumePartage = Number(data.volume_partage || 0);
              const volumeComplementaire = Number(data.volume_complementaire || 0);
              const injectionPartagee = Number(data.injection_partagee || 0);
              const injectionComplementaire = Number(data.injection_complementaire || 0);
              
              console.log(`➕ Ajout pour ${participant.name} (${month}):`, {
                volumePartage,
                volumeComplementaire,
                injectionPartagee,
                injectionComplementaire
              });
              
              monthlyTotals[month].volume_partage += volumePartage;
              monthlyTotals[month].volume_complementaire += volumeComplementaire;
              monthlyTotals[month].injection_partagee += injectionPartagee;
              monthlyTotals[month].injection_complementaire += injectionComplementaire;
              monthlyTotals[month].participant_count += 1;
              
              console.log(`📊 Totaux après ajout pour ${month}:`, monthlyTotals[month]);
            });
          } catch (error) {
            console.warn(`⚠️ Erreur parsing monthly_data pour ${participant.name}:`, error);
            console.log(`📋 Données brutes:`, participant.monthly_data);
          }
        }
      });

      console.log('📊 Totaux mensuels calculés:', monthlyTotals);

      // Convertir en format pour le graphique
      const chartDataArray = Object.entries(monthlyTotals).map(([month, totals]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
        monthKey: month,
        'Volume Partagé': Math.round(totals.volume_partage / 1000 * 1000) / 1000,
        'Volume Complémentaire': Math.round(totals.volume_complementaire / 1000 * 1000) / 1000,
        'Injection Partagée': Math.round(totals.injection_partagee / 1000 * 1000) / 1000,
        'Injection Résiduelle': Math.round(totals.injection_complementaire / 1000 * 1000) / 1000,
        participants: totals.participant_count
      })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      console.log('📈 Données finales pour le graphique:', chartDataArray);
      
      // Vérifier si on a des données non-nulles
      const hasData = chartDataArray.some(item => 
        item['Volume Partagé'] > 0 || 
        item['Volume Complémentaire'] > 0 || 
        item['Injection Partagée'] > 0 || 
        item['Injection Résiduelle'] > 0
      );
      
      console.log('🔍 Le graphique a-t-il des données non-nulles ?', hasData);
      
      setChartData(chartDataArray);

    } catch (error) {
      console.error('❌ Erreur chargement données graphique:', error);
    }
  };

  const loadFiles = () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement des fichiers depuis Supabase participants...');
      
      // Charger directement depuis les participants Supabase
      supabase
        .from('participants')
        .select('monthly_data')
        .not('monthly_data', 'is', null)
        .then(({ data: participants, error }) => {
          if (error) {
            console.error('Erreur chargement participants:', error);
            setFiles([]);
            return;
          }

          // Extraire tous les mois disponibles
          const monthsSet = new Set<string>();
          participants?.forEach(participant => {
            if (participant.monthly_data) {
              try {
                let monthlyData;
                if (typeof participant.monthly_data === 'string') {
                  monthlyData = JSON.parse(participant.monthly_data);
                } else {
                  monthlyData = participant.monthly_data;
                }
                Object.keys(monthlyData).forEach(month => monthsSet.add(month));
              } catch (error) {
                console.warn('Erreur parsing monthly_data:', error);
              }
            }
          });

          const fileRecords = Array.from(monthsSet).map(month => ({
            id: month,
            month,
            filename: `${month}.xlsx`,
            upload_date: new Date().toISOString(),
            file_size: 0,
            status: 'processed',
            data_points: 0,
            participant_count: participants?.filter(p => {
              if (!p.monthly_data) return false;
              try {
                let monthlyData;
                if (typeof p.monthly_data === 'string') {
                  monthlyData = JSON.parse(p.monthly_data);
                } else {
                  monthlyData = p.monthly_data;
                }
                return monthlyData[month] !== undefined;
              } catch {
                return false;
              }
            }).length || 0,
            unknown_eans: [],
            mesures_count: 0
          }));

          setFiles(fileRecords.sort((a, b) => b.month.localeCompare(a.month)));
        });
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
      loadChartDataFromParticipants(); // Recharger les données du graphique
      onImportSuccess();
      
      toast.success(`✅ Données importées avec succès pour ${format(new Date(data.month + '-01'), 'MMMM yyyy', { locale: fr })}`);
    } catch (error) {
      console.error('❌ Erreur lors de la gestion de l\'import:', error);
      toast.error('Erreur lors de l\'importation des données');
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir supprimer TOUTES les données mensuelles ?\n\nCette action est irréversible !')) {
      clearAllMonthlyData();
    }
  };

  const clearAllMonthlyData = async () => {
    try {
      console.log('🧹 Début nettoyage complet des données mensuelles...');
      
      // 1. Supprimer localStorage
      localStorage.removeItem('monthly_data');
      console.log('✅ localStorage nettoyé');
      
      // 2. Vider la colonne monthly_data de tous les participants
      const { error: monthlyError } = await supabase
        .from('participants')
        .update({ 
          monthly_data: null
        })
        .not('id', 'is', null);
      
      if (monthlyError) {
        console.error('❌ Erreur nettoyage monthly_data:', monthlyError);
        throw monthlyError;
      }
      
      console.log('✅ Colonne monthly_data vidée pour tous les participants');
      
      // 3. Vider la colonne billing_data de TOUS les participants (sans condition)
      const { error: billingError } = await supabase
        .from('participants')
        .update({ 
          billing_data: null
        })
        .not('id', 'is', null);
      
      if (billingError) {
        console.error('❌ Erreur nettoyage billing_data:', billingError);
        throw billingError;
      }
      
      console.log('✅ Colonne billing_data vidée pour TOUS les participants');
      
      // 4. Réinitialiser l'état local
      setFiles([]);
      setChartData([]);
      
      // 5. Recharger les données
      await loadFiles();
      await loadChartDataFromParticipants();
      
      toast.success('🧹 Toutes les données mensuelles et de facturation ont été supprimées (localStorage + base de données)');
      onImportSuccess();
      
    } catch (error) {
      console.error('❌ Erreur suppression complète:', error);
      toast.error('Erreur lors de la suppression complète');
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
        
        loadChartDataFromParticipants(); // Recharger le graphique

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
            <Calendar className="w-3 h-3 mr-1" />
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
            Gestion des imports de données mensuelles
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleClearAllData}
            className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm hover:shadow-md"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Nettoyer tout
          </button>
          <button
            onClick={() => setShowManualImport(true)}
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Import Manuel
          </button>
        </div>
      </div>

      {/* Graphique des totaux mensuels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des Volumes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Volumes mensuels</h3>
                <p className="text-sm text-gray-600">
                  Consommation partagée vs complémentaire
                </p>
              </div>
            </div>
            <button
              onClick={loadChartDataFromParticipants}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {chartData && chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'MWh', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      border: '1px solid #e5e7eb',
                      padding: '12px',
                      minWidth: '200px'
                    }}
                    labelStyle={{ 
                      fontWeight: 'bold', 
                      color: '#374151',
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (value === 0) {
                        return [`0 MWh`, ''];
                      }
                      const formattedValue = value.toLocaleString('fr-FR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3
                      });
                      return [`${formattedValue} MWh`, ''];
                    }}
                    separator=""
                    labelFormatter={(label) => `Mois : ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Volume Partagé" 
                    fill="#10B981" 
                    name="Consommation Partagée"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="Volume Complémentaire" 
                    fill="#3B82F6" 
                    name="Consommation Réseau"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Aucune donnée de volume</p>
              <p className="text-sm">Importez des fichiers Excel pour voir les volumes</p>
            </div>
          )}
          
          {/* Légende volumes */}
          {chartData && chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Consommation Partagée</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Consommation Réseau</span>
              </div>
            </div>
          )}
        </div>

        {/* Graphique des Injections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-amber-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Injections mensuelles</h3>
                <p className="text-sm text-gray-600">
                  Production partagée vs résiduelle
                </p>
              </div>
            </div>
          </div>
          
          {chartData && chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'MWh', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      border: '1px solid #e5e7eb',
                      padding: '12px',
                      minWidth: '200px'
                    }}
                    labelStyle={{ 
                      fontWeight: 'bold', 
                      color: '#374151',
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (value === 0) {
                        return [`0 MWh`, ''];
                      }
                      const formattedValue = value.toLocaleString('fr-FR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3
                      });
                      return [`${formattedValue} MWh`, ''];
                    }}
                    separator=""
                    labelFormatter={(label) => `Mois : ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Injection Partagée" 
                    fill="#F59E0B" 
                    name="Injection Partagée"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="Injection Résiduelle" 
                    fill="#8B5CF6" 
                    name="Injection Réseau"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Aucune donnée d'injection</p>
              <p className="text-sm">Importez des fichiers Excel pour voir les injections</p>
            </div>
          )}
          
          {/* Légende injections */}
          {chartData && chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Injection Partagée</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Injection Réseau</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug des données */}
      {chartData && chartData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Database className="w-6 h-6 text-gray-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Debug - Données calculées</h3>
                <p className="text-sm text-gray-600">
                  Vérification des totaux par mois
                </p>
              </div>
            </div>
          </div>
          
          {/* Debug info */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Données calculées :</h4>
            <div className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
              {chartData.map((item, index) => (
                <div key={index} className="font-mono bg-white p-2 rounded border">
                  <div className="font-bold text-gray-900">{item.month}</div>
                  <div>VP: {item['Volume Partagé']} MWh | VC: {item['Volume Complémentaire']} MWh</div>
                  <div>IP: {item['Injection Partagée']} MWh | IR: {item['Injection Réseau']} MWh</div>
                  <div className="text-blue-600">Participants: {item.participants}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <Database className="w-8 h-8 text-purple-600 mr-3" />
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
                <div className="text-sm text-gray-600">Mesures mensuelles</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des fichiers */}

      {/* Modal d'import streaming */}
      <StreamingExcelImport
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
      
      <ManualDataImport
        isOpen={showManualImport}
        onClose={() => setShowManualImport(false)}
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
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    {(viewingData.totals.total_volume_complementaire / 1000).toFixed(3)} MWh
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">Volume Partagé</div>
                  <div className="text-xl font-bold text-green-900">
                    {(viewingData.totals.total_volume_partage / 1000).toFixed(3)} MWh
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="text-sm text-amber-600">Injection Complémentaire</div>
                  <div className="text-xl font-bold text-amber-900">
                    {(viewingData.totals.total_injection_complementaire / 1000).toFixed(3)} MWh
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">Injection Partagée</div>
                  <div className="text-xl font-bold text-purple-900">
                    {(viewingData.totals.total_injection_partagee / 1000).toFixed(3)} MWh
                  </div>
                </div>
              </div>

              {/* Détail par participant */}
              <div className="overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-amber-600" />
                    Détail par participant ({Object.keys(viewingData.participants || {}).length})
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Données mensuelles importées pour {format(new Date(viewingData.month + '-01'), 'MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Participant
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="text-blue-600">📥</span>
                          <span className="ml-1">Volume Compl.</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="text-green-600">🔄</span>
                          <span className="ml-1">Volume Partagé</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="text-amber-600">📤</span>
                          <span className="ml-1">Injection Compl.</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="text-purple-600">⚡</span>
                          <span className="ml-1">Injection Partagée</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(viewingData.participants || {}).map(([eanCode, participant]: [string, any]) => (
                      <tr key={eanCode} className="hover:bg-amber-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                            <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{eanCode}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-blue-600 mr-2">📥</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {(participant.data.volume_complementaire / 1000).toFixed(3)} MWh
                              </div>
                              <div className="text-xs text-gray-500">Réseau traditionnel</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-green-600 mr-2">🔄</span>
                            <div>
                              <div className="text-sm font-medium text-green-700">
                                {(participant.data.volume_partage / 1000).toFixed(3)} MWh
                              </div>
                              <div className="text-xs text-gray-500">Énergie communautaire</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-amber-600 mr-2">📤</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {(participant.data.injection_complementaire / 1000).toFixed(3)} MWh
                              </div>
                              <div className="text-xs text-gray-500">Vers le réseau</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-purple-600 mr-2">⚡</span>
                            <div>
                              <div className="text-sm font-medium text-purple-700">
                                {(participant.data.injection_partagee / 1000).toFixed(3)} MWh
                              </div>
                              <div className="text-xs text-gray-500">Vers la communauté</div>
                            </div>
                          </div>
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