import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDashboard } from './MemberDashboard';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Calendar,
  Mail,
  Hash,
  Euro,
  MapPin,
  User,
  Upload,
  Database,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Database as DB } from '../types/supabase';
import { ParticipantForm } from './ParticipantForm';
import { StreamingExcelImport } from './StreamingExcelImport';
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

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .order('name');

      if (participantsError) throw participantsError;

      setParticipants(participantsData || []);
    } catch (error) {
      console.error('Error loading participants:', error);
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
    loadParticipants();
  };

  const handleViewParticipantDashboard = async (participant: Participant) => {
    // Créer un utilisateur de démonstration basé sur le participant sélectionné
    const demoUser = {
      id: `demo-${participant.id}`, // ID unique basé sur le participant
      email: participant.email || `${participant.name.toLowerCase().replace(/\s+/g, '.')}@sunisup.be`,
      name: participant.name,
      member_type: participant.type
    };

    // Générer des données de démonstration pour ce participant
    try {
      await generateDemoDataForParticipant(demoUser.id, participant);
      console.log('✅ Données de démonstration générées pour:', participant.name);
    } catch (error) {
      console.error('❌ Erreur génération données démo:', error);
      toast.error(`Erreur lors de la génération des données pour ${participant.name}`);
      return;
    }
    
    setViewingMemberDashboard(demoUser);
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

  // Fonction pour générer des données de démonstration pour un participant
  const generateDemoDataForParticipant = async (userId: string, participant: Participant) => {
    try {
      console.log('🔄 Génération des données pour l\'utilisateur:', userId);
      
      // D'abord, s'assurer que l'utilisateur de démo existe dans la table users
      const { error: upsertUserError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: participant.email || `${participant.name.toLowerCase().replace(/\s+/g, '.')}@sunisup.be`,
          name: participant.name,
          member_type: participant.type
        }, {
          onConflict: 'id'
        });
      
      if (upsertUserError) {
        console.error('❌ Erreur création utilisateur démo:', upsertUserError);
        throw upsertUserError;
      }
      
      console.log('✅ Utilisateur de démo créé/mis à jour');
      
      // Supprimer les données existantes pour cet utilisateur de démo
      const { error: deleteError } = await supabase
        .from('energy_data')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.warn('⚠️ Erreur suppression données existantes:', deleteError);
      }

      // Générer des données pour les 30 derniers jours
      const energyData = [];
      const now = new Date();
      
      for (let day = 29; day >= 0; day--) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        
        // Générer des données horaires pour chaque jour
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(date);
          timestamp.setHours(hour, 0, 0, 0);
          
          // Profil de consommation/production réaliste selon le type
          let baseConsumption = 0;
          let baseProduction = 0;
          
          if (participant.type === 'producer') {
            // Profil de production solaire
            if (hour >= 6 && hour <= 18) {
              // Production solaire avec pic à midi
              const solarFactor = Math.exp(-0.5 * Math.pow((hour - 12) / 4, 2));
              baseProduction = solarFactor * (20 + Math.random() * 30); // 0-50 kWh
            }
            // Autoconsommation du producteur (plus faible)
            baseConsumption = 5 + Math.random() * 10; // 5-15 kWh
          } else {
            // Profil de consommation pour consommateur
            if (hour >= 8 && hour <= 18) {
              baseConsumption = 15 + Math.random() * 25; // 15-40 kWh
              
              // Pic de consommation en milieu de journée
              if (hour >= 10 && hour <= 16) {
                baseConsumption += 10 + Math.random() * 20; // +10-30 kWh
              }
            } else {
              // Consommation de veille
              baseConsumption = 2 + Math.random() * 8; // 2-10 kWh
            }
          }
          
          // Week-end : consommation réduite
          const dayOfWeek = timestamp.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            baseConsumption *= 0.4;
            baseProduction *= 0.8; // Production légèrement réduite le week-end
          }
          
          // Variation saisonnière (plus de consommation en hiver)
          const month = timestamp.getMonth();
          if (month >= 10 || month <= 2) { // Nov-Fév
            baseConsumption *= 1.4;
            baseProduction *= 0.7; // Production réduite en hiver
          }
          
          // Énergie partagée
          let sharedEnergy = 0;
          if (participant.type === 'producer') {
            // Pour un producteur, énergie partagée = partie de la production partagée
            sharedEnergy = baseProduction * (0.6 + Math.random() * 0.3); // 60-90% de la production
          } else {
            // Pour un consommateur, énergie partagée = partie de la consommation couverte
            sharedEnergy = baseConsumption * (0.25 + Math.random() * 0.1); // 25-35% de la consommation
          }
          
          energyData.push({
            user_id: userId,
            timestamp: timestamp.toISOString(),
            consumption: Math.round(baseConsumption * 100) / 100,
            shared_energy: Math.round(sharedEnergy * 100) / 100,
            production: Math.round(baseProduction * 100) / 100
          });
        }
      }
      
      console.log(`📊 ${energyData.length} points de données générés`);
      
      // Insérer les données par lots de 50 pour éviter les timeouts
      const batchSize = 50;
      for (let i = 0; i < energyData.length; i += batchSize) {
        const batch = energyData.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('energy_data')
          .insert(batch);
          
        if (insertError) {
          console.error('❌ Erreur insertion lot:', insertError);
          throw insertError;
        }
        
        console.log(`✅ Lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(energyData.length / batchSize)} inséré`);
      }
      
      console.log(`✅ ${energyData.length} points de données générés pour ${participant.name} (${participant.type})`);
      
      // Vérifier que les données ont bien été insérées
      const { data: verifyData, error: verifyError } = await supabase
        .from('energy_data')
        .select('count')
        .eq('user_id', userId);
        
      if (verifyError) {
        console.warn('⚠️ Erreur vérification données:', verifyError);
      } else {
        console.log(`🔍 Vérification: ${verifyData?.length || 0} enregistrements trouvés`);
      }
      
    } catch (error) {
      console.error('❌ Erreur génération données démo:', error);
      throw error;
    }
  };

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
        {/* Section Import de données */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Import de données quart-horaires</h2>
                  <p className="text-sm text-gray-600 mt-1">Importez les données Excel avec correspondance automatique par code EAN</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer données Excel
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-2">Comment ça marche ?</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Le système utilise le <strong>code EAN</strong> pour faire automatiquement le lien entre les données et les participants</p>
                    <p>• Seules les données des participants avec un code EAN enregistré seront importées</p>
                    <p>• Les données sans correspondance EAN seront automatiquement ignorées</p>
                    <p>• Format attendu : colonnes EAN, FromDate, Flow, Volume (kWh)</p>
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
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {participant.ean_code}
                            </span>
                          ) : (
                            <span className="text-red-500 italic text-xs">⚠️ Manquant</span>
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
                            onClick={() => handleViewParticipantDashboard(participant)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Voir le dashboard"
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