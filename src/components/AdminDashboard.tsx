import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDashboard } from './MemberDashboard';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, ArrowLeft, LogOut, RefreshCw, Calendar, Mail, 
  Hash, Euro, MapPin, User, Upload, Database, FileSpreadsheet, Eye, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database as DB } from '../types/supabase';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { ParticipantForm } from './ParticipantForm';
import { MonthlyFileManager } from './MonthlyFileManager';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { InvoiceTemplate } from './InvoiceTemplate';

type Participant = DB['public']['Tables']['participants']['Row'];

export function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [viewingMemberDashboard, setViewingMemberDashboard] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedParticipantForInvoice, setSelectedParticipantForInvoice] = useState<Participant | null>(null);
  const [showPeriodSelection, setShowPeriodSelection] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState({
    startMonth: '',
    endMonth: ''
  });

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

  const handleShowInvoice = (participant: Participant) => {
    setSelectedParticipantForInvoice(participant);
    setShowPeriodSelection(true);
    
    // Initialiser avec le mois actuel
    const currentMonth = new Date().toISOString().slice(0, 7);
    setSelectedPeriod({
      startMonth: currentMonth,
      endMonth: currentMonth
    });
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setSelectedParticipantForInvoice(null);
    setShowPeriodSelection(false);
    setSelectedPeriod({ startMonth: '', endMonth: '' });
  };

  const handlePeriodConfirm = () => {
    if (!selectedPeriod.startMonth || !selectedPeriod.endMonth) {
      toast.error('Veuillez sélectionner une période valide');
      return;
    }
    
    if (selectedPeriod.startMonth > selectedPeriod.endMonth) {
      toast.error('Le mois de début doit être antérieur ou égal au mois de fin');
      return;
    }
    
    setShowPeriodSelection(false);
    setShowInvoice(true);
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
    <>
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
                            onClick={() => handleShowInvoice(participant)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Générer facture"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
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
      </div>

      {/* Modal de sélection de période */}
      {showPeriodSelection && selectedParticipantForInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-amber-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Période de facturation
                  </h3>
                </div>
                <button
                  onClick={() => setShowPeriodSelection(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {selectedParticipantForInvoice.name}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Sélectionnez la période pour laquelle générer la facture
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mois de début
                    </label>
                    <input
                      type="month"
                      value={selectedPeriod.startMonth}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mois de fin
                    </label>
                    <input
                      type="month"
                      value={selectedPeriod.endMonth}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPeriodSelection(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePeriodConfirm}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Générer la facture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoice && selectedParticipantForInvoice && (
        <InvoiceTemplate
          isOpen={showInvoice}
          onClose={handleCloseInvoice}
          participant={selectedParticipantForInvoice}
          selectedPeriod={selectedPeriod}
        />
      )}
    </>
  );
}