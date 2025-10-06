import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDashboard } from './MemberDashboard';
import { toast } from 'react-hot-toast';
import { Users, Plus, FileEdit as Edit, Trash2, ArrowLeft, LogOut, RefreshCw, Calendar, Mail, Hash, Euro, MapPin, User, Upload, Database, FileSpreadsheet, Eye, FileText, X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Database as DB } from '../types/supabase';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { ParticipantForm } from './ParticipantForm';
import { MonthlyFileManager } from './MonthlyFileManager';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { InvoiceTemplate } from './InvoiceTemplate';
import { isSupabaseConfigured } from '../lib/supabase';
import AdminEanChart from './AdminEanChart';

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
  const [showBulkPeriodSelection, setShowBulkPeriodSelection] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [bulkPeriod, setBulkPeriod] = useState({ startMonth: '', endMonth: '' });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [csvUrl, setCsvUrl] = useState("");
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
      if (!isSupabaseConfigured) {
        console.warn('Supabase not configured');
        setParticipants([]);
        return;
      }
      
      console.log('📊 CHARGEMENT PARTICIPANTS ADMIN');
      
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) {
        console.error('❌ Error loading participants:', error);
        toast.error(`Erreur de chargement: ${error.message}`);
        setParticipants([]);
        return;
      }

      console.log('✅ Loaded', data?.length || 0, 'participants');
      setParticipants(data || []);
      
      if (data && data.length > 0) {
        toast.success(`${data.length} participants chargés`);
      }
      
    } catch (error) {
      console.error('❌ Error loading participants:', error);
      toast.error(`Erreur: ${error.message}`);
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

  // Fonction pour grouper les participants
  const groupParticipants = () => {
    const grouped: { [key: string]: Participant[] } = {};
    const ungrouped: Participant[] = [];

    participants.forEach(participant => {
      if (participant.groupe) {
        if (!grouped[participant.groupe]) {
          grouped[participant.groupe] = [];
        }
        grouped[participant.groupe].push(participant);
      } else {
        ungrouped.push(participant);
      }
    });

    return { grouped, ungrouped };
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const handleGroupAction = (action: 'invoice' | 'dashboard' | 'edit', group: Participant[]) => {
    // Pour les actions de groupe, utiliser le premier participant du groupe
    const representative = group[0];
    
    switch (action) {
      case 'invoice':
        handleShowInvoice(representative);
        break;
      case 'dashboard':
        handleViewParticipantDashboard(representative);
        break;
      case 'edit':
        handleEdit(representative);
        break;
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
    console.log('🧾 CLIC GÉNÉRATION FACTURE');
    console.log('👤 Participant:', participant);
    console.log('📧 Email participant:', participant.email);
    console.log('🆔 ID participant:', participant.id);
    
    setSelectedParticipantForInvoice(participant);
    console.log('✅ Participant sélectionné pour facture');
    
    setShowPeriodSelection(true);
    console.log('✅ Modal période activée');
    
    // Initialiser avec le mois actuel
    const currentMonth = new Date().toISOString().slice(0, 7);
    setSelectedPeriod({
      startMonth: currentMonth,
      endMonth: currentMonth
    });
    console.log('✅ Période initialisée:', currentMonth);
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

  const handleBulkDownload = async () => {
    if (!bulkPeriod.startMonth || !bulkPeriod.endMonth) {
      toast.error('Veuillez sélectionner une période valide');
      return;
    }
    if (bulkPeriod.startMonth > bulkPeriod.endMonth) {
      toast.error('Le mois de début doit être antérieur ou égal au mois de fin');
      return;
    }
    if (selectedParticipants.size === 0) {
      toast.error('Veuillez sélectionner au moins un participant');
      return;
    }

    setBulkDownloading(true);
    setShowBulkDownloadModal(false);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Filter selected participants
      const participantsToProcess = participants.filter(p => selectedParticipants.has(p.id));

      // Group participants by groupe
      const groupedParticipants = new Map<string, Participant[]>();
      const individualParticipants: Participant[] = [];

      participantsToProcess.forEach(p => {
        if (p.groupe) {
          if (!groupedParticipants.has(p.groupe)) {
            groupedParticipants.set(p.groupe, []);
          }
          groupedParticipants.get(p.groupe)!.push(p);
        } else {
          individualParticipants.push(p);
        }
      });

      // Generate PDFs for all participants
      const allParticipantsToProcess: Participant[] = [];

      // Add group representatives (only one per group)
      groupedParticipants.forEach((group) => {
        allParticipantsToProcess.push(group[0]);
      });

      // Add individual participants
      allParticipantsToProcess.push(...individualParticipants);

      toast.loading(`Génération de ${allParticipantsToProcess.length} factures...`);

      // Import the invoice generation logic
      const { generateInvoicePDF } = await import('./InvoiceTemplate');

      for (const participant of allParticipantsToProcess) {
        try {
          const pdfBlob = await generateInvoicePDF(participant, bulkPeriod);

          if (pdfBlob) {
            const isGroup = participant.groupe && groupedParticipants.has(participant.groupe);
            const fileName = isGroup
              ? `Facture_Groupe_${participant.groupe}_${bulkPeriod.startMonth}-${bulkPeriod.endMonth}.pdf`
              : `Facture_${participant.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${bulkPeriod.startMonth}-${bulkPeriod.endMonth}.pdf`;

            zip.file(fileName, pdfBlob);
          }
        } catch (error) {
          console.error(`Erreur lors de la génération de la facture pour ${participant.name}:`, error);
        }
      }

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factures_${bulkPeriod.startMonth}-${bulkPeriod.endMonth}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`${allParticipantsToProcess.length} factures téléchargées avec succès`);

      // Reset selection
      setSelectedParticipants(new Set());
    } catch (error) {
      console.error('Erreur lors du téléchargement groupé:', error);
      toast.dismiss();
      toast.error('Erreur lors de la génération des factures');
    } finally {
      setBulkDownloading(false);
    }
  };

  const toggleParticipantSelection = (participantId: string) => {
    const newSelection = new Set(selectedParticipants);
    if (newSelection.has(participantId)) {
      newSelection.delete(participantId);
    } else {
      newSelection.add(participantId);
    }
    setSelectedParticipants(newSelection);
  };

  const selectAllParticipants = () => {
    if (selectedParticipants.size === participants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(participants.map(p => p.id)));
    }
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
      <div className="min-h-screen bg-white">
        <header className="bg-white shadow-sm border-b border-neutral-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setShowForm(false)}
                  className="mr-4 p-2 text-neutral-600 hover:text-neutral-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-neutral-900">
                  {editingParticipant ? 'Modifier le participant' : 'Ajouter un participant'}
                </h1>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-brand-flame text-sm font-medium rounded-md shadow-sm text-brand-flame bg-white hover:bg-brand-flame hover:text-white disabled:bg-gray-400 disabled:text-white disabled:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-flame transition-colors"
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
                ? 'bg-brand-teal border-brand-teal' 
                : 'bg-brand-flame border-brand-flame'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus.canAccessParticipants ? 'bg-brand-teal' : 'bg-brand-flame'
                }`}></div>
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    connectionStatus.canAccessParticipants ? 'text-neutral-900' : 'text-brand-flame'
                  }`}>
                    Status Connexion Admin
                  </h3>
                  <div className="text-sm space-y-1 mt-2 text-neutral-800">
                    <div>📧 Email: {connectionStatus.userEmail || 'Non connecté'}</div>
                    <div>🔐 Session: {connectionStatus.hasValidSession ? '✅ Valide' : '❌ Invalide'}</div>
                    <div>🗄️ Accès participants: {connectionStatus.canAccessParticipants ? '✅ Autorisé' : '❌ Refusé'}</div>
                    {connectionStatus.errorDetails && (
                      <div className="text-brand-flame font-mono text-xs bg-brand-flame/10 p-2 rounded mt-2">
                        {connectionStatus.errorDetails}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={verifyAdminConnection}
                  className="px-3 py-1 text-sm bg-brand-teal text-white rounded hover:bg-brand-teal-light"
                >
                  Revérifier
                </button>
              </div>
            </div>

            {/* Debug messages en temps réel */}
            {showDebugInfo && debugMessages.length > 0 && (
              <div className="bg-brand-gold border border-brand-gold rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-brand-gold flex items-center">
                    🔍 Debug Connexion Admin ({debugMessages.length} messages)
                  </h4>
                  <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    className="text-brand-gold hover:text-brand-gold text-sm"
                  >
                    {showDebugInfo ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <div className="bg-white border border-brand-gold rounded p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-1 text-xs font-mono">
                    {debugMessages.map((msg, index) => (
                      <div key={index} className={`${
                        msg.includes('❌') ? 'text-brand-flame' :
                        msg.includes('✅') ? 'text-brand-teal' :
                        msg.includes('⚠️') ? 'text-orange-600' :
                        msg.includes('🔍') ? 'text-brand-teal' :
                        'text-neutral-700'
                      }`}>
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setDebugMessages([])}
                    className="text-brand-gold hover:text-brand-gold text-xs"
                  >
                    Effacer les logs
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-neutral-300 p-8">
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Group participants by groupe for display
  const groupedParticipants = new Map<string, Participant[]>();
  participants.forEach(p => {
    if (p.groupe) {
      if (!groupedParticipants.has(p.groupe)) {
        groupedParticipants.set(p.groupe, []);
      }
      groupedParticipants.get(p.groupe)!.push(p);
    }
  });

  // Sort participants
  const sortedParticipants = [...participants].sort((a, b) => {
    const [field, order] = sortBy.includes('-') ? sortBy.split('-') : [sortBy, sortOrder];

    let aValue: any;
    let bValue: any;

    switch (field) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'type':
        aValue = a.type || '';
        bValue = b.type || '';
        break;
      case 'entry_date':
        aValue = a.entry_date || '';
        bValue = b.entry_date || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <>
      <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm border-b border-neutral-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-12 w-12" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-neutral-900">
                  Tableau de bord administrateur
                </h1>
                <p className="text-sm text-neutral-600">
                  Gestion des participants Sun Is Up
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefreshData}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualiser les données"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-brand-flame text-sm font-medium rounded-md shadow-sm text-brand-flame bg-white hover:bg-brand-flame hover:text-white disabled:bg-gray-400 disabled:text-white disabled:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-flame transition-colors"
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
        <div className="bg-white rounded-xl shadow-lg border border-neutral-300">
          <div className="px-6 py-4 border-b border-neutral-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-amber-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">Participants de la communauté</h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    {participants.length} participant(s) • {participants.filter(p => p.ean_code).length} avec code EAN
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Options de tri */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-neutral-600">Trier par :</span>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [column, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                      setSortBy(column);
                      setSortOrder(order);
                    }}
                    className="px-3 py-1 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="name-asc">Nom (A-Z)</option>
                    <option value="name-desc">Nom (Z-A)</option>
                    <option value="type-asc">Type (Consommateur d'abord)</option>
                    <option value="type-desc">Type (Producteur d'abord)</option>
                    <option value="entry_date-asc">Date d'entrée (Plus ancien)</option>
                    <option value="entry_date-desc">Date d'entrée (Plus récent)</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowBulkDownloadModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-brand-teal text-white rounded-lg hover:bg-brand-teal/80 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger factures
                  </button>
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center px-4 py-2 bg-brand-gold/100 text-white rounded-lg hover:bg-brand-gold transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un participant
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Nom
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Adresse
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Date d'entrée
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const { grouped, ungrouped } = groupParticipants();
                  const hasData = participants.length > 0;
                  
                  if (!hasData) {
                    return (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">Aucun participant enregistré</p>
                          <p className="text-sm">Ajoutez votre premier participant pour commencer</p>
                        </td>
                      </tr>
                    );
                  }

                  const rows: JSX.Element[] = [];

                  // Afficher les groupes
                  Object.entries(grouped).forEach(([groupName, groupParticipants]) => {
                    const isExpanded = expandedGroups.has(groupName);
                    const groupTypes = [...new Set(groupParticipants.map(p => p.type))];
                    const groupTypeDisplay = groupTypes.length === 1 
                      ? (groupTypes[0] === 'producer' ? 'Producteurs' : 'Consommateurs')
                      : 'Mixte';

                    // Ligne du groupe
                    rows.push(
                      <tr key={`group-${groupName}`} className="bg-white hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleGroup(groupName)}
                              className="flex items-center space-x-2 text-left"
                            >
                              <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-amber-600" />
                                <div>
                                  <div className="text-sm font-bold text-neutral-900">{groupName}</div>
                                  <div className="text-xs text-neutral-500">{groupParticipants.length} membre(s)</div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">
                            {groupTypeDisplay}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-500 italic">
                            Groupe de {groupParticipants.length} participants
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-500 italic">
                            Voir détails
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleGroupAction('invoice', groupParticipants)}
                              className="text-brand-teal hover:text-brand-teal transition-colors"
                              title="Générer facture groupe"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGroupAction('dashboard', groupParticipants)}
                              className="text-brand-teal hover:text-brand-teal transition-colors"
                              title="Voir dashboard groupe"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleGroupAction('edit', groupParticipants)}
                              className="text-amber-600 hover:text-amber-900 transition-colors"
                              title="Modifier groupe"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );

                    // Lignes des membres du groupe (si développé)
                    if (isExpanded) {
                      groupParticipants.forEach(participant => {
                        rows.push(
                          <tr key={participant.id} className="hover:bg-white bg-white">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center pl-8">
                                <div className="text-sm font-medium text-neutral-700">
                                  └ {participant.name}
                                </div>
                                {participant.ean_code && (
                                  <div className="ml-2">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">
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
                                  : 'bg-teal-100 text-teal-800'
                              }`}>
                                {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-neutral-600 max-w-xs truncate" title={participant.address}>
                                {participant.address}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-neutral-600">
                                {participant.entry_date ? (
                                  format(new Date(participant.entry_date), 'dd/MM/yyyy', { locale: fr })
                                ) : (
                                  <span className="text-gray-400 italic">Non renseignée</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleShowInvoice(participant)}
                                  className="text-brand-teal hover:text-brand-teal transition-colors"
                                  title="Générer facture individuelle"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => participant.email ? handleViewParticipantDashboard(participant) : toast.error(`${participant.name} n'a pas d'adresse email configurée.`)}
                                  className="text-brand-teal hover:text-brand-teal transition-colors"
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
                                  className="text-brand-flame hover:text-brand-flame transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    }
                  });

                  // Afficher les participants sans groupe
                  ungrouped.forEach(participant => {
                    rows.push(
                      <tr key={participant.id} className="hover:bg-white">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-neutral-900">{participant.name}</div>
                            {participant.ean_code && (
                              <div className="ml-2">
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">
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
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900 max-w-xs truncate" title={participant.address}>
                            {participant.address}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900">
                            {participant.entry_date ? (
                              format(new Date(participant.entry_date), 'dd/MM/yyyy', { locale: fr })
                            ) : (
                              <span className="text-gray-400 italic">Non renseignée</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleShowInvoice(participant)}
                              onMouseDown={() => console.log('🖱️ MOUSE DOWN sur bouton facture')}
                              onMouseUp={() => console.log('🖱️ MOUSE UP sur bouton facture')}
                              className="text-brand-teal hover:text-brand-teal transition-colors"
                              title="Générer facture"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => participant.email ? handleViewParticipantDashboard(participant) : toast.error(`${participant.name} n'a pas d'adresse email configurée. Modifiez le participant pour ajouter une adresse email.`)}
                              className="text-brand-teal hover:text-brand-teal transition-colors"
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
                              className="text-brand-flame hover:text-brand-flame transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      </div>

      {/* Modal de sélection de période */}
      {showPeriodSelection && selectedParticipantForInvoice && (
        <>
          {console.log('🖼️ RENDU MODAL PÉRIODE:', { 
            showPeriodSelection, 
            selectedParticipantForInvoice: selectedParticipantForInvoice?.name 
          })}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-amber-600" />
                  <h3 className="text-xl font-semibold text-neutral-900">
                    Période de facturation
                  </h3>
                </div>
                <button
                  onClick={() => setShowPeriodSelection(false)}
                  className="text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-brand-teal" />
                    <span className="font-medium text-brand-teal">
                      {selectedParticipantForInvoice.name}
                    </span>
                  </div>
                  <p className="text-sm text-brand-teal">
                    Sélectionnez la période pour laquelle générer la facture
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mois de début
                    </label>
                    <input
                      type="month"
                      value={selectedPeriod.startMonth}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mois de fin
                    </label>
                    <input
                      type="month"
                      value={selectedPeriod.endMonth}
                      onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPeriodSelection(false)}
                  className="px-4 py-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePeriodConfirm}
                  className="px-6 py-2 bg-brand-gold/100 text-white rounded-lg hover:bg-brand-gold transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Générer la facture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Modal de téléchargement groupé des factures */}
      {showBulkDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 flex items-center space-x-2">
                    <Download className="w-6 h-6 text-brand-teal" />
                    <span>Télécharger les factures</span>
                  </h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    Sélectionnez les participants et la période de facturation
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkDownloadModal(false);
                    setSelectedParticipants(new Set());
                  }}
                  className="text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Participant selection */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-neutral-700">
                      Participants ({selectedParticipants.size} sélectionné{selectedParticipants.size > 1 ? 's' : ''})
                    </label>
                    <button
                      onClick={selectAllParticipants}
                      className="text-sm text-brand-teal hover:text-brand-teal/80 font-medium"
                    >
                      {selectedParticipants.size === participants.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  <div className="border border-neutral-300 rounded-lg max-h-64 overflow-y-auto">
                    {sortedParticipants.map((participant) => {
                      const isInGroup = participant.groupe && groupedParticipants.has(participant.groupe);
                      const group = isInGroup ? groupedParticipants.get(participant.groupe)! : null;
                      const isFirstInGroup = group && group[0].id === participant.id;

                      // Only show first participant in group or individual participants
                      if (isInGroup && !isFirstInGroup) return null;

                      return (
                        <label
                          key={participant.id}
                          className="flex items-center p-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-200 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedParticipants.has(participant.id)}
                            onChange={() => toggleParticipantSelection(participant.id)}
                            className="w-4 h-4 text-brand-teal border-neutral-300 rounded focus:ring-brand-teal"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center space-x-2">
                              {isInGroup && <Users className="w-4 h-4 text-brand-teal" />}
                              <span className="font-medium text-neutral-900">
                                {isInGroup ? `Groupe ${participant.groupe}` : participant.name}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                participant.type === 'producer'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}>
                                {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                              </span>
                            </div>
                            {isInGroup && (
                              <div className="text-sm text-neutral-600 mt-1">
                                {group!.length} membre{group!.length > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Period selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mois de début
                    </label>
                    <input
                      type="month"
                      value={bulkPeriod.startMonth}
                      onChange={(e) => setBulkPeriod(prev => ({ ...prev, startMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mois de fin
                    </label>
                    <input
                      type="month"
                      value={bulkPeriod.endMonth}
                      onChange={(e) => setBulkPeriod(prev => ({ ...prev, endMonth: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-brand-teal">
                    Un fichier ZIP sera généré contenant une facture PDF pour chaque participant ou groupe sélectionné.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkDownloadModal(false);
                  setSelectedParticipants(new Set());
                }}
                className="px-4 py-2 text-neutral-700 hover:text-neutral-900 transition-colors"
                disabled={bulkDownloading}
              >
                Annuler
              </button>
              <button
                onClick={handleBulkDownload}
                disabled={bulkDownloading || selectedParticipants.size === 0}
                className="px-6 py-2 bg-brand-gold/100 text-white rounded-lg hover:bg-brand-gold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{bulkDownloading ? 'Génération...' : 'Télécharger'}</span>
              </button>
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