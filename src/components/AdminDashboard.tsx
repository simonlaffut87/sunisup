import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, User, MapPin, Mail, Hash, Euro, Calendar, LogOut, Users, TrendingUp } from 'lucide-react';
import { ParticipantForm } from './ParticipantForm';

type Participant = Database['public']['Tables']['participants']['Row'];

export function AdminDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | undefined>();
  const [stats, setStats] = useState({
    totalParticipants: 0,
    producers: 0,
    consumers: 0
  });

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setParticipants(data || []);
      
      // Calculate stats
      const totalParticipants = data?.length || 0;
      const producers = data?.filter(p => p.type === 'producer').length || 0;
      const consumers = data?.filter(p => p.type === 'consumer').length || 0;
      
      setStats({ totalParticipants, producers, consumers });
    } catch (error: any) {
      console.error('Error loading participants:', error);
      toast.error('Erreur lors du chargement des participants');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setShowForm(true);
  };

  const handleDelete = async (participant: Participant) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${participant.name} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participant.id);

      if (error) throw error;

      toast.success(`Participant "${participant.name}" supprimé avec succès`);
      loadParticipants();
    } catch (error: any) {
      console.error('Error deleting participant:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingParticipant(undefined);
    loadParticipants();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingParticipant(undefined);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/';
    }
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <ParticipantForm
            participant={editingParticipant}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="w-12 h-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administration Sun Is Up</h1>
                <p className="text-gray-600">Gestion des participants</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Producteurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.producers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <User className="w-8 h-8 text-amber-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Consommateurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.consumers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Liste des participants</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un participant
          </button>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des participants...</p>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun participant enregistré</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Ajouter le premier participant
              </button>
            </div>
          ) : (
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
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code EAN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarif commodité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix énergie partagée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'entrée
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {participant.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {participant.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          participant.type === 'producer' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-gray-400" />
                          {participant.email || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono flex items-center">
                          <Hash className="w-3 h-3 mr-1 text-gray-400" />
                          {participant.ean_code || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Euro className="w-3 h-3 mr-1 text-gray-400" />
                          {participant.commodity_rate ? `${participant.commodity_rate} €/MWh` : 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Euro className="w-3 h-3 mr-1 text-gray-400" />
                          {participant.shared_energy_price ? `${participant.shared_energy_price} €/MWh` : 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                          {participant.entry_date || new Date(participant.created_at!).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(participant)}
                            className="text-amber-600 hover:text-amber-900 p-1 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(participant)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  async function handleEdit(participant: Participant) {
    setEditingParticipant(participant);
    setShowForm(true);
  }

  async function handleDelete(participant: Participant) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${participant.name} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participant.id);

      if (error) throw error;

      toast.success(`Participant "${participant.name}" supprimé avec succès`);
      loadParticipants();
    } catch (error: any) {
      console.error('Error deleting participant:', error);
      toast.error('Erreur lors de la suppression');
    }
  }
}