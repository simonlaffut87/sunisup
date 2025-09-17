import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDashboard } from './MemberDashboard';
import { toast } from 'react-hot-toast';
import { Users, Plus, Edit, Trash2, ArrowLeft, LogOut, RefreshCw, Calendar, Mail, 
  Hash, Euro, MapPin, User, Upload, Database, FileSpreadsheet, Eye, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database as DB } from '../types/supabase';
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
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'entry_date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    userEmail: string | null;
    hasValidSession: boolean;
    canAccessParticipants: boolean;
    errorDetails: string | null;
  }>({
    isConnected: false,
    userEmail: null,
    hasValidSession: false,
    canAccessParticipants: false,
    errorDetails: null
  });

  useEffect(() => {
    verifyAdminConnection();
    loadParticipants();
  }, []);

  // Ajouter un état pour forcer l'affichage du debug
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  const addDebugMessage = (message: string) => {
    console.log(message);
    setDebugMessages(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  const verifyAdminConnection = async () => {
    addDebugMessage('🔍 DÉBUT VÉRIFICATION CONNEXION ADMIN SUPABASE');
    
    try {
      // 1. Vérifier la session actuelle
      addDebugMessage('📋 Étape 1: Vérification de la session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        addDebugMessage(`❌ Erreur session: ${sessionError.message}`);
        setConnectionStatus({
          isConnected: false,
          userEmail: null,
          hasValidSession: false,
          canAccessParticipants: false,
          errorDetails: `Erreur session: ${sessionError.message}`
        });
        return;
      }

      if (!session) {
        addDebugMessage('⚠️ Aucune session active');
        setConnectionStatus({
          isConnected: false,
          userEmail: null,
          hasValidSession: false,
          canAccessParticipants: false,
          errorDetails: 'Aucune session active'
        });
        return;
      }

      addDebugMessage(`✅ Session trouvée: ${session.user.email}, expires: ${session.expires_at}`);

      // 2. Vérifier l'utilisateur actuel
      addDebugMessage('📋 Étape 2: Vérification de l\'utilisateur...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        addDebugMessage(`❌ Erreur utilisateur: ${userError.message}`);
        setConnectionStatus({
          isConnected: false,
          userEmail: session.user.email,
          hasValidSession: true,
          canAccessParticipants: false,
          errorDetails: `Erreur utilisateur: ${userError.message}`
        });
        return;
      }

      addDebugMessage(`✅ Utilisateur vérifié: ${user?.email}, isAdmin: ${user?.email === 'info@sunisup.be'}`);

      // 3. Tester l'accès à la table participants
      addDebugMessage('📋 Étape 3: Test d\'accès à la table participants...');
      const { data: testData, error: accessError } = await supabase
        .from('participants')
        .select('id, name, email')
        .limit(1);

      if (accessError) {
        addDebugMessage(`❌ Erreur accès participants: Code ${accessError.code}, Message: ${accessError.message}`);
        
        setConnectionStatus({
          isConnected: true,
          userEmail: user?.email || null,
          hasValidSession: true,
          canAccessParticipants: false,
          errorDetails: `Accès refusé: ${accessError.message} (Code: ${accessError.code})`
        });
        return;
      }

      addDebugMessage(`✅ Accès participants réussi: ${testData?.length || 0} participants trouvés`);

      // 4. Tester une opération d'écriture
      addDebugMessage('📋 Étape 4: Test d\'écriture (simulation)...');
      const { error: writeTestError } = await supabase
        .from('participants')
        .select('id')
        .limit(0); // Ne récupère rien mais teste les permissions

      if (writeTestError) {
        addDebugMessage(`⚠️ Erreur test écriture: ${writeTestError.message}`);
      }

      setConnectionStatus({
        isConnected: true,
        userEmail: user?.email || null,
        hasValidSession: true,
        canAccessParticipants: true,
        errorDetails: null
      });

      addDebugMessage('🎉 CONNEXION ADMIN VÉRIFIÉE AVEC SUCCÈS');
      toast.success(`✅ Connexion admin vérifiée pour ${user?.email}`);

    } catch (error: any) {
      addDebugMessage(`❌ ERREUR GÉNÉRALE: ${error.message}`);
      setConnectionStatus({
        isConnected: false,
        userEmail: null,
        hasValidSession: false,
        canAccessParticipants: false,
        errorDetails: `Erreur générale: ${error.message}`
      });
    }
  };
  const loadParticipants = async () => {
    setLoading(true);
    try {
      console.log('📊 CHARGEMENT PARTICIPANTS ADMIN');
      console.log('🔐 Status connexion:', connectionStatus);
      
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('❌ ERREUR CHARGEMENT PARTICIPANTS:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        toast.error(`❌ Impossible de charger les participants: ${error.message} (Code: ${error.code})`);
        setParticipants([]);
        return;
      }

      console.log('✅ Participants chargés avec succès:', data?.length || 0);
      setParticipants(data || []);
      
      if (data && data.length > 0) {
        toast.success(`✅ ${data.length} participants chargés`);
      } else {
        toast.info('ℹ️ Aucun participant trouvé dans la base');
      }
      
    } catch (error) {
      console.error('❌ ERREUR GÉNÉRALE chargement participants:', error);
      toast.error(`❌ Erreur générale: ${error.message}`);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour changer le tri
  const handleSort = (column: 'name' | 'type' | 'entry_date') => {
    if (sortBy === column) {
      // Si on clique sur la même colonne, inverser l'ordre
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si on clique sur une nouvelle colonne, commencer par ordre croissant
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Recharger les données quand le tri change
  useEffect(() => {
    if (!loading) {
      loadParticipants();
    }
  }, [sortBy, sortOrder]);

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
      participant_id: participant.id, // Ajouter l'ID spécifique du participant
      email: participant.email,
      name: participant.name,
      member_type: participant.type,
      user_metadata: {
        participant_id: participant.id,
        ean_code: participant.ean_code,
        name: participant.name
      }
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
    setIsLoggingOut(true);
    
    try {
      console.log('🚪 Déconnexion admin...');
      
      // Clear all state
      setParticipants([]);
      setLoading(false);
      setShowForm(false);
      setEditingParticipant(null);
      setViewingMemberDashboard(null);
      setRefreshing(false);
      setShowInvoice(false);
      setSelectedParticipantForInvoice(null);
      setShowPeriodSelection(false);
      setSelectedPeriod({ startMonth: '', endMonth: '' });
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Erreur chargement participants:', error);
      }
      
      // Clear session storage
      sessionStorage.clear();
      
      // Force full page reload to ensure clean state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if logout fails, clear storage and redirect
      localStorage.clear();
      sessionStorage.clear();
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
          {/* Status de connexion admin */}
          <div className="mb-6 space-y-4">
            {/* Status de connexion principal */}
            <div className={`p-4 rounded-lg border ${
              connectionStatus.canAccessParticipants 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus.canAccessParticipants ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    connectionStatus.canAccessParticipants ? 'text-gray-900' : 'text-red-900'
                  }`}>
                    Status Connexion Admin
                  </h3>
                  <div className="text-sm space-y-1 mt-2 text-gray-800">
                    <div>📧 Email: {connectionStatus.userEmail || 'Non connecté'}</div>
                    <div>🔐 Session: {connectionStatus.hasValidSession ? '✅ Valide' : '❌ Invalide'}</div>
                    <div>🗄️ Accès participants: {connectionStatus.canAccessParticipants ? '✅ Autorisé' : '❌ Refusé'}</div>
                    {connectionStatus.errorDetails && (
                      <div className="text-red-700 font-mono text-xs bg-red-100 p-2 rounded mt-2">
                        {connectionStatus.errorDetails}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={verifyAdminConnection}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Revérifier
                </button>
              </div>
            </div>

            {/* Debug messages en temps réel */}
            {showDebugInfo && debugMessages.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-yellow-900 flex items-center">
                    🔍 Debug Connexion Admin ({debugMessages.length} messages)
                  </h4>
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="text-yellow-600 hover:text-yellow-800 text-sm"
                  >
                    {showDebugInfo ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <div className="bg-white border border-yellow-200 rounded p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {debugMessages.map((msg, index) => (
                      <div key={index} className={`${
                        msg.includes('❌') ? 'text-red-600' :
                        msg.includes('✅') ? 'text-green-600' :
                        msg.includes('⚠️') ? 'text-orange-600' :
                        msg.includes('🔍') ? 'text-blue-600' :
                        'text-gray-700'
                      }`}>
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setDebugMessages([])}
                    className="text-yellow-600 hover:text-yellow-800 text-xs"
                  >
                    Effacer les logs
                  </button>
                </div>
              </div>
            )}
          </div>

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
              <div className="flex items-center space-x-4">
                {/* Options de tri */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Trier par :</span>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [column, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                      setSortBy(column);
                      setSortOrder(order);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="name-asc">Nom (A-Z)</option>
                    <option value="name-desc">Nom (Z-A)</option>
                    <option value="type-asc">Type (Consommateur d'abord)</option>
                    <option value="type-desc">Type (Producteur d'abord)</option>
                    <option value="entry_date-asc">Date d'entrée (Plus ancien)</option>
                    <option value="entry_date-desc">Date d'entrée (Plus récent)</option>
                  </select>
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap">
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
                            onClick={() => participant.email ? handleViewParticipantDashboard(participant) : toast.error(`${participant.name} n'a pas d'adresse email configurée. Modifiez le participant pour ajouter une adresse email.`)}
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
                          <button
                            onClick={async () => {
                              if (confirm(`Êtes-vous sûr de vouloir supprimer ${participant.name} ?`)) {
                                try {
                                  const { error } = await supabase
                                    .from('participants')
                                    .delete()
                                    .eq('id', participant.id);
                                  
                                  if (error) {
                                    console.error('Error deleting participant:', error);
                                    toast.error('Erreur lors de la suppression');
                                  } else {
                                    toast.success(`Participant "${participant.name}" supprimé avec succès`);
                                    loadParticipants();
                                  }
                                } catch (error) {
                                  console.error('Error deleting participant:', error);
                                  toast.error('Erreur lors de la suppression');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
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