import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart4, 
  PieChart, 
  TrendingUp, 
  Zap, 
  Calendar,
  Plus,
  Edit,
  Eye,
  Trash2,
  ArrowLeft,
  Sun,
  Building2,
  LogOut,
  User,
  Upload,
  FileSpreadsheet,
  X,
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database as DatabaseIcon
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database } from '../types/supabase';
import { ParticipantForm } from './ParticipantForm';
import { MemberDashboard } from './MemberDashboard';
import { MonthlyFileManager } from './MonthlyFileManager';

type Participant = Database['public']['Tables']['participants']['Row'];
type EnergyData = Database['public']['Tables']['energy_data']['Row'];

interface ParticipantMetadata {
  id: string;
  participant_id: string;
  email: string;
  ean_code: string;
  commodity_rate: number;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantWithUser extends Participant {
  user_id?: string;
  email?: string;
  total_consumption?: number;
  total_shared_energy?: number;
  total_production?: number;
  is_member?: boolean;
  ean_code?: string;
  commodity_rate?: number;
  entry_date?: string;
  metadata?: ParticipantMetadata;
}

export function AdminDashboard() {
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'files'>('participants');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalConsumption: 0,
    totalSharedEnergy: 0,
    averageSavings: 0
  });

  useEffect(() => {
    loadParticipants();
    loadStats();
  }, [viewMode, selectedDate]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // Get all participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .order('name');

      if (participantsError) throw participantsError;

      // Get all participant metadata
      const { data: metadataData, error: metadataError } = await supabase
        .from('participant_metadata')
        .select('*');

      if (metadataError) {
        console.warn('⚠️ Erreur chargement métadonnées:', metadataError);
      }

      // Get all users to match with participants
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Get energy data for the selected period
      let startDate, endDate;

      // Calculer les dates de début et de fin en fonction du mode de vue
      switch (viewMode) {
        case 'day':
          startDate = startOfDay(selectedDate);
          endDate = endOfDay(selectedDate);
          break;
        case 'week':
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Semaine commence le lundi
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
          break;
      }

      const { data: energyData, error: energyError } = await supabase
        .from('energy_data')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (energyError) throw energyError;

      // Charger les métadonnées depuis localStorage comme fallback
      const localMetadata = JSON.parse(localStorage.getItem('participant_metadata') || '{}');

      // Combine participants with user data and energy stats
      const participantsWithData = participantsData.map(participant => {
        // Chercher les métadonnées dans Supabase d'abord, puis localStorage
        const supabaseMetadata = metadataData?.find(m => m.participant_id === participant.id);
        const localMeta = localMetadata[participant.id] || {};
        
        // Utiliser les métadonnées Supabase en priorité
        const metadata = supabaseMetadata || {
          email: localMeta.email,
          ean_code: localMeta.ean_code,
          commodity_rate: localMeta.commodity_rate,
          entry_date: localMeta.entry_date
        };

        // Try to find matching user by name or email
        const matchingUser = usersData.find(user => 
          user.name?.toLowerCase().includes(participant.name.toLowerCase()) ||
          participant.name.toLowerCase().includes(user.name?.toLowerCase() || '') ||
          user.email?.toLowerCase().includes(participant.name.toLowerCase()) ||
          (metadata.email && user.email === metadata.email)
        );

        let participantEnergyData: EnergyData[] = [];
        if (matchingUser) {
          participantEnergyData = energyData.filter(data => data.user_id === matchingUser.id);
        }

        const totalConsumption = participantEnergyData.reduce((sum, item) => sum + Number(item.consumption), 0);
        const totalSharedEnergy = participantEnergyData.reduce((sum, item) => sum + Number(item.shared_energy), 0);
        const totalProduction = participantEnergyData.reduce((sum, item) => sum + Number(item.production || 0), 0);

        return {
          ...participant,
          user_id: matchingUser?.id,
          email: metadata.email || null,
          total_consumption: totalConsumption,
          total_shared_energy: totalSharedEnergy,
          total_production: totalProduction,
          is_member: !!matchingUser,
          ean_code: metadata.ean_code || null,
          commodity_rate: metadata.commodity_rate || null,
          entry_date: metadata.entry_date || null,
          metadata: supabaseMetadata
        };
      });

      setParticipants(participantsWithData);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      let startDate, endDate;

      // Calculer les dates de début et de fin en fonction du mode de vue
      switch (viewMode) {
        case 'day':
          startDate = startOfDay(selectedDate);
          endDate = endOfDay(selectedDate);
          break;
        case 'week':
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Semaine commence le lundi
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
          break;
      }

      const { data: energyData, error } = await supabase
        .from('energy_data')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) throw error;

      const totalConsumption = energyData.reduce((sum, item) => sum + Number(item.consumption), 0);
      const totalSharedEnergy = energyData.reduce((sum, item) => sum + Number(item.shared_energy), 0);
      const averageSavings = totalConsumption > 0 ? (totalSharedEnergy / totalConsumption) * 100 : 0;

      // Compter les membres actifs selon leur date d'entrée
      const { data: metadataData } = await supabase
        .from('participant_metadata')
        .select('*');

      let activeMembersCount = 0;

      // Parcourir tous les participants avec des comptes membres
      const { data: usersData } = await supabase.from('users').select('*');
      
      if (usersData && metadataData) {
        for (const user of usersData) {
          // Trouver le participant correspondant
          const { data: participantsData } = await supabase
            .from('participants')
            .select('*');
          
          if (participantsData) {
            const matchingParticipant = participantsData.find(p => 
              user.name?.toLowerCase().includes(p.name.toLowerCase()) ||
              p.name.toLowerCase().includes(user.name?.toLowerCase() || '')
            );

            if (matchingParticipant) {
              const metadata = metadataData.find(m => m.participant_id === matchingParticipant.id);
              
              if (metadata?.entry_date) {
                const memberEntryDate = new Date(metadata.entry_date);
                // Vérifier si le membre était actif pendant la période sélectionnée
                if (memberEntryDate <= endDate) {
                  activeMembersCount++;
                }
              } else {
                // Si pas de date d'entrée spécifiée, considérer comme actif
                activeMembersCount++;
              }
            }
          }
        }
      }

      setStats({
        totalMembers: activeMembersCount,
        totalConsumption,
        totalSharedEnergy,
        averageSavings
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // NOUVELLE FONCTION : Actualiser les données
  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      await loadParticipants();
      await loadStats();
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

  const handleViewMember = (participant: ParticipantWithUser) => {
    if (participant.user_id) {
      setViewingMember({
        id: participant.user_id,
        email: participant.email,
        name: participant.name,
        member_type: participant.type
      });
    }
  };

  const handleViewParticipant = (participant: ParticipantWithUser) => {
    if (participant.is_member) {
      handleViewMember(participant);
    } else {
      alert(`${participant.name} n'a pas encore de compte membre actif. Informations disponibles:\n\nType: ${participant.type === 'producer' ? 'Producteur' : 'Consommateur'}\nAdresse: ${participant.address}\n${participant.type === 'producer' ? `Puissance: ${participant.peak_power} kWp\nProduction annuelle: ${participant.annual_production} kWh` : `Consommation annuelle: ${participant.annual_consumption} kWh`}`);
    }
  };

  // NOUVELLE FONCTION : Activer un compte membre pour un participant
  const activateParticipantAccount = async (participant: ParticipantWithUser) => {
    if (participant.is_member) {
      alert(`${participant.name} a déjà un compte membre actif.`);
      return;
    }

    const confirmActivation = confirm(
      `Voulez-vous activer un compte membre pour "${participant.name}" ?\n\n` +
      `Cela créera un compte utilisateur avec :\n` +
      `• Email : ${participant.email || 'email@example.com'}\n` +
      `• Mot de passe : password123\n` +
      `• Type : ${participant.type === 'producer' ? 'Producteur' : 'Consommateur'}\n\n` +
      `Le participant pourra ensuite se connecter et accéder à son dashboard.`
    );

    if (!confirmActivation) return;

    try {
      // Générer un email si pas disponible
      const email = participant.email || `${participant.name.toLowerCase().replace(/\s+/g, '.')}@sunisup-member.com`;
      
      // Get the current user's session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée. Veuillez vous reconnecter.');
      }

      // Call the edge function to create the user
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=create-user`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: 'password123',
          name: participant.name,
          member_type: participant.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du compte');
      }

      const result = await response.json();

      alert(
        `✅ Compte membre activé avec succès !\n\n` +
        `👤 Participant : ${participant.name}\n` +
        `📧 Email : ${email}\n` +
        `🔑 Mot de passe : password123\n` +
        `🏷️ Type : ${participant.type === 'producer' ? 'Producteur' : 'Consommateur'}\n\n` +
        `Le participant peut maintenant se connecter et accéder à son dashboard.`
      );

      // Recharger les participants pour mettre à jour l'affichage
      loadParticipants();

    } catch (error: any) {
      console.error('Erreur lors de l\'activation du compte:', error);
      alert(`❌ Erreur lors de l'activation du compte :\n\n${error.message}`);
    }
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

  // Navigation dans les périodes
  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(prevDate => subDays(prevDate, 1));
        break;
      case 'week':
        setSelectedDate(prevDate => subWeeks(prevDate, 1));
        break;
      case 'month':
        setSelectedDate(prevDate => subMonths(prevDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(prevDate => addDays(prevDate, 1));
        break;
      case 'week':
        setSelectedDate(prevDate => addWeeks(prevDate, 1));
        break;
      case 'month':
        setSelectedDate(prevDate => addMonths(prevDate, 1));
        break;
    }
  };

  // Calculate period display text
  const getPeriodDisplayText = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'dd/MM/yyyy', { locale: fr });
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'dd/MM/yyyy', { locale: fr })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })}`;
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: fr });
      default:
        return format(selectedDate, 'dd/MM/yyyy', { locale: fr });
    }
  };

  if (viewingMember) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setViewingMember(null)}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-12 w-12" />
                  </div>
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-gray-900">
                      Dashboard de {viewingMember.name}
                    </h1>
                    <p className="text-sm text-gray-600">
                      Vue administrateur - Retour au tableau de bord
                    </p>
                  </div>
                </div>
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
        <MemberDashboard 
          user={viewingMember} 
          onLogout={() => setViewingMember(null)} 
        />
      </div>
    );
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const periodText = getPeriodDisplayText();

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
                  Gestion de la communauté Sun Is Up
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
        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'participants'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Participants
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DatabaseIcon className="w-4 h-4 inline mr-2" />
                Données Quart-Horaires
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'participants' && (
          <>
            {/* Period Selector with Navigation */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Period Type Selector */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setViewMode('day')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'day' 
                        ? 'bg-amber-500 text-white shadow-md' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Jour
                  </button>
                  <button 
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'week' 
                        ? 'bg-amber-500 text-white shadow-md' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Semaine
                  </button>
                  <button 
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      viewMode === 'month' 
                        ? 'bg-amber-500 text-white shadow-md' 
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Mois
                  </button>
                </div>

                {/* Period Display and Navigation */}
                <div className="flex items-center gap-4">
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={navigatePrevious}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title={`${viewMode === 'day' ? 'Jour' : viewMode === 'week' ? 'Semaine' : 'Mois'} précédent`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={navigateNext}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title={`${viewMode === 'day' ? 'Jour' : viewMode === 'week' ? 'Semaine' : 'Mois'} suivant`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Period Display */}
                  <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 min-w-[120px] text-center">
                      {periodText}
                    </span>
                  </div>

                  {/* Date Picker */}
                  <div className="flex items-center">
                    <input 
                      type="date" 
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Membres actifs</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
                    <p className="text-sm text-gray-500">membres avec compte</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <BarChart4 className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Consommation totale</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.totalConsumption.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Énergie partagée</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.totalSharedEnergy.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <PieChart className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Économies moyennes</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{stats.averageSavings.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">réduction moyenne</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Table */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Participants de la communauté</h2>
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
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code EAN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => handleViewParticipant(participant)}
                        >
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                              participant.type === 'producer' ? 'bg-amber-100' : 'bg-blue-100'
                            }`}>
                              {participant.type === 'producer' ? (
                                <Sun className={`h-5 w-5 text-amber-600`} />
                              ) : (
                                <Building2 className={`h-5 w-5 text-blue-600`} />
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 hover:text-amber-600 transition-colors">
                                {participant.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {participant.address}
                              </div>
                            </div>
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
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              participant.is_member 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {participant.is_member ? 'Membre actif' : 'Participant'}
                            </span>
                            {participant.metadata && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Données Supabase
                              </span>
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
                            {participant.ean_code || (
                              <span className="text-gray-400 italic">Non renseigné</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {participant.is_member ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewParticipant(participant);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Voir le dashboard"
                            >
                              <User className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                activateParticipantAccount(participant);
                              }}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="Activer le compte membre"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(participant);
                            }}
                            className="text-amber-600 hover:text-amber-900 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'files' && (
          <MonthlyFileManager onImportSuccess={handleRefreshData} />
        )}
      </main>
    </div>
  );
}