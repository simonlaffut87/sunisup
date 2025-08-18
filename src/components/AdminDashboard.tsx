import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDashboard } from './MemberDashboard';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, ArrowLeft, LogOut, RefreshCw, Calendar, Mail, 
  Hash, Euro, MapPin, User, Upload, Database, FileSpreadsheet, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database as DB } from '../types/supabase';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { ParticipantForm } from './ParticipantForm';
import { StreamingExcelImport } from './StreamingExcelImport';
import { MonthlyFileManager } from './MonthlyFileManager';
import { useAutoLogout } from '../hooks/useAutoLogout';

type Participant = DB['public']['Tables']['participants']['Row'];

export function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [viewingMemberDashboard, setViewingMemberDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // Charger les participants
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('name');

      if (error) throw error;

      setParticipants(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Erreur lors du chargement des participants');
    } finally {
      setLoading(false);
    }
  };

  // Actualiser les données
  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await loadParticipants();
      console.log('🔄 Données actualisées');
    } catch (error) {
      console.error('❌ Erreur actualisation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingParticipant(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingParticipant(null);
    loadParticipants();
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    handleRefreshData();
  };

  const handleViewParticipantDashboard = async (participant: Participant) => {
    // Vérifier si le participant a un email
    if (!participant.email) {
      toast.error(`${participant.name} n'a pas d'adresse email configurée. Modifiez le participant pour ajouter une adresse email.`);
      return;
    }

    // Créer un objet utilisateur pour afficher le dashboard
    const userObj = {
      id: participant.id,
      email: participant.email,
      name: participant.name,
      member_type: participant.type
    };
    
    setViewingMemberDashboard(userObj);
  };

  const handleCloseMemberDashboard = () => {
    setViewingMemberDashboard(null);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('supabase.auth.')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      sessionStorage.clear();
      
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error logging out:', error);
      window.location.href = '/';
    }
  };

  // Hook de déconnexion automatique
  useAutoLogout({
    onLogout: handleLogout,
    timeoutMinutes: 15,
    isLoggedIn: true
  });

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setShowForm(false)}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  {editingParticipant ? 'Modifier le participant' : 'Ajouter un participant'}
                </h1>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <ParticipantForm
              participant={editingParticipant}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  if (viewingMemberDashboard) {
    return (
      <MemberDashboard 
        user={viewingMemberDashboard} 
        onLogout={handleCloseMemberDashboard}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-12 w-12" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  Tableau de bord administrateur
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion des participants Sun Is Up
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefreshData}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualiser les données"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Import de données mensuelles */}
        <MonthlyFileManager onImportSuccess={handleRefreshData} />

        {/* Section Import de données */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Import de données individuelles</h2>
                  <p className="text-sm text-gray-600 mt-1">Import pour un participant spécifique</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import individuel
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-2">Import individuel</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Import de données pour un participant spécifique</p>
                    <p>• Utilisez l'import mensuel ci-dessus pour traiter plusieurs participants à la fois</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-amber-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Participants de la communauté</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {participants.length} participant(s) • {participants.filter(p => p.ean_code).length} avec code EAN
                  </p>
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un participant
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Nom
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Adresse
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Date d'entrée
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      Code EAN
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Euro className="w-4 h-4 mr-2" />
                      Tarif commodité
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Aucun participant enregistré</p>
                      <p className="text-sm">Ajoutez votre premier participant pour commencer</p>
                    </td>
                  </tr>
                ) : (
                  participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                          {participant.ean_code && (
                            <div className="ml-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <Database className="w-3 h-3 mr-1" />
                                Prêt import
                              </span>
                            </div>
                          )}
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
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={participant.address}>
                          {participant.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {participant.entry_date ? (
                            format(new Date(participant.entry_date), 'dd/MM/yyyy', { locale: fr })
                          ) : (
                            <span className="text-gray-400 italic">Non renseignée</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {participant.email || (
                            <span className="text-gray-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {participant.ean_code ? (
                            <span className="bg-green-100 px-2 py-1 rounded text-xs font-medium">
                              {participant.ean_code}
                            </span>
                          ) : (
                            <span className="text-red-500 italic text-xs font-medium">⚠️ Manquant</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {participant.commodity_rate ? (
                            `${participant.commodity_rate} €/MWh`
                          ) : (
                            <span className="text-gray-400 italic">Non renseigné</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => participant.email ? handleViewParticipantDashboard(participant) : null}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title={participant.email ? "Voir le dashboard" : "Email manquant"}
                            disabled={!participant.email}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(participant)}
                            className="text-amber-600 hover:text-amber-900 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal d'import Excel unifié */}
      <StreamingExcelImport
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}