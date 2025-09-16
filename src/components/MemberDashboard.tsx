import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  User, 
  Calendar, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  Users,
  RefreshCw,
  Download,
  FileText,
  Mail,
  Hash,
  MapPin,
  Building2,
  Sun,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAutoLogout } from '../hooks/useAutoLogout';
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

interface MemberDashboardProps {
  user: any;
  onLogout: () => void;
}

export function MemberDashboard({ user, onLogout }: MemberDashboardProps) {
  const [participant, setParticipant] = useState<any>(null);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Hook de déconnexion automatique
  useAutoLogout({
    onLogout,
    timeoutMinutes: 15,
    isLoggedIn: true
  });

  useEffect(() => {
    loadParticipantData();
  }, [user]);

  useEffect(() => {
    if (participant) {
      loadGroupData();
    }
  }, [participant, selectedYear]);

  const loadParticipantData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement du participant pour user:', user);

      // Charger le(s) participant(s) avec cet email
      const { data: participantData, error } = await supabase
        .from('participants')
        .select('*')
        .eq('email', user.email);

      if (error) {
        console.error('Erreur chargement participant:', error);
        toast.error('Impossible de charger vos données participant');
        return;
      }

      if (!participantData || participantData.length === 0) {
        toast.error('Aucun participant trouvé pour votre email');
        return;
      }

      if (participantData.length > 1) {
        console.warn('⚠️ Plusieurs participants trouvés pour cet email:', participantData);
        // Prendre le premier participant par défaut
        setParticipant(participantData[0]);
        return;
      }

      // Cas normal: exactement un participant
      console.log('✅ Participant chargé:', participantData[0]);
      setParticipant(participantData[0]);
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors du chargement de vos données');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupData = async () => {
    try {
      console.log('🔍 Chargement des données du groupe...');
      console.log('👤 Participant actuel:', participant);

      if (!participant.groupe) {
        console.log('ℹ️ Participant sans groupe, affichage individuel');
        // Pas de groupe, charger seulement les données individuelles
        loadIndividualData();
        return;
      }

      console.log(`👥 Chargement du groupe: "${participant.groupe}"`);

      // Charger TOUS les participants du même groupe
      const { data: allGroupParticipants, error: groupError } = await supabase
        .from('participants')
        .select('*')
        .eq('groupe', participant.groupe);

      if (groupError) {
        console.error('❌ Erreur chargement groupe:', groupError);
        toast.error('Erreur lors du chargement du groupe');
        return;
      }

      console.log(`✅ ${allGroupParticipants?.length || 0} participants trouvés dans le groupe "${participant.groupe}"`);
      console.log('📋 Participants du groupe:', allGroupParticipants?.map(p => ({ name: p.name, ean: p.ean_code, hasData: !!p.monthly_data })));

      if (!allGroupParticipants || allGroupParticipants.length === 0) {
        console.log('⚠️ Aucun participant trouvé dans le groupe');
        loadIndividualData();
        return;
      }

      // Traiter les données mensuelles de TOUS les participants du groupe
      const processedData = processGroupMonthlyData(allGroupParticipants, selectedYear);
      
      setGroupParticipants(allGroupParticipants);
      setMonthlyData(processedData.monthlyData);

      console.log('📊 Données finales du groupe:', {
        participants: allGroupParticipants.length,
        monthsWithData: processedData.monthlyData.length,
        totalVolumePartage: processedData.monthlyData.reduce((sum, m) => sum + m.volume_partage, 0),
        totalVolumeComplementaire: processedData.monthlyData.reduce((sum, m) => sum + m.volume_complementaire, 0)
      });

    } catch (error) {
      console.error('❌ Erreur chargement groupe:', error);
      toast.error('Erreur lors du chargement des données du groupe');
    }
  };

  const loadIndividualData = () => {
    console.log('👤 Chargement des données individuelles pour:', participant.name);
    
    if (!participant.monthly_data) {
      console.log('⚠️ Aucune donnée mensuelle pour ce participant');
      setMonthlyData([]);
      setGroupParticipants([participant]);
      return;
    }

    const processedData = processIndividualMonthlyData(participant, selectedYear);
    setMonthlyData(processedData);
    setGroupParticipants([participant]);
  };

  const processGroupMonthlyData = (participants: any[], year: string) => {
    console.log(`📊 Traitement des données du groupe pour l'année ${year}`);
    
    const monthlyTotals: { [month: string]: {
      volume_partage: number;
      volume_complementaire: number;
      injection_partagee: number;
      injection_complementaire: number;
      participantCount: number;
    } } = {};

    participants.forEach(participant => {
      console.log(`🔍 Traitement participant: ${participant.name} (${participant.ean_code})`);
      
      if (!participant.monthly_data) {
        console.log(`⚠️ ${participant.name} n'a pas de monthly_data`);
        return;
      }

      let monthlyData;
      try {
        if (typeof participant.monthly_data === 'string') {
          monthlyData = JSON.parse(participant.monthly_data);
        } else {
          monthlyData = participant.monthly_data;
        }
      } catch (error) {
        console.warn(`⚠️ Erreur parsing monthly_data pour ${participant.name}:`, error);
        return;
      }

      console.log(`📅 Mois disponibles pour ${participant.name}:`, Object.keys(monthlyData));

      Object.entries(monthlyData).forEach(([month, data]: [string, any]) => {
        if (!month.startsWith(year)) {
          return;
        }

        console.log(`📊 ${participant.name} - ${month}:`, data);

        if (!monthlyTotals[month]) {
          monthlyTotals[month] = {
            volume_partage: 0,
            volume_complementaire: 0,
            injection_partagee: 0,
            injection_complementaire: 0,
            participantCount: 0
          };
        }

        monthlyTotals[month].volume_partage += Number(data.volume_partage || 0);
        monthlyTotals[month].volume_complementaire += Number(data.volume_complementaire || 0);
        monthlyTotals[month].injection_partagee += Number(data.injection_partagee || 0);
        monthlyTotals[month].injection_complementaire += Number(data.injection_complementaire || 0);
        monthlyTotals[month].participantCount += 1;
      });
    });

    console.log('📊 Totaux mensuels calculés:', monthlyTotals);

    const monthlyDataArray = Object.entries(monthlyTotals).map(([month, totals]) => ({
      month: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
      monthKey: month,
      volume_partage: Math.round(totals.volume_partage),
      volume_complementaire: Math.round(totals.volume_complementaire),
      injection_partagee: Math.round(totals.injection_partagee),
      injection_complementaire: Math.round(totals.injection_complementaire),
      participantCount: totals.participantCount
    })).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    console.log('📈 Données finales pour le graphique:', monthlyDataArray);

    return { monthlyData: monthlyDataArray };
  };

  const processIndividualMonthlyData = (participant: any, year: string) => {
    console.log(`👤 Traitement des données individuelles pour ${participant.name}`);
    
    if (!participant.monthly_data) {
      return [];
    }

    let monthlyData;
    try {
      if (typeof participant.monthly_data === 'string') {
        monthlyData = JSON.parse(participant.monthly_data);
      } else {
        monthlyData = participant.monthly_data;
      }
    } catch (error) {
      console.warn('⚠️ Erreur parsing monthly_data:', error);
      return [];
    }

    const monthlyDataArray = Object.entries(monthlyData)
      .filter(([month]) => month.startsWith(year))
      .map(([month, data]: [string, any]) => ({
        month: format(new Date(month + '-01'), 'MMM yyyy', { locale: fr }),
        monthKey: month,
        volume_partage: Number(data.volume_partage || 0),
        volume_complementaire: Number(data.volume_complementaire || 0),
        injection_partagee: Number(data.injection_partagee || 0),
        injection_complementaire: Number(data.injection_complementaire || 0),
        participantCount: 1
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return monthlyDataArray;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadParticipantData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
      onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Calculer les totaux annuels
  const yearlyTotals = monthlyData.reduce((totals, month) => {
    console.log(`📊 Ajout mois ${month.month}:`, {
      volume_partage: month.volume_partage,
      volume_complementaire: month.volume_complementaire,
      injection_partagee: month.injection_partagee,
      injection_complementaire: month.injection_complementaire
    });
    
    return {
      volume_partage: totals.volume_partage + (month.volume_partage || 0),
      volume_complementaire: totals.volume_complementaire + (month.volume_complementaire || 0),
      injection_partagee: totals.injection_partagee + (month.injection_partagee || 0),
      injection_complementaire: totals.injection_complementaire + (month.injection_complementaire || 0)
    };
  }, {
    volume_partage: 0,
    volume_complementaire: 0,
    injection_partagee: 0,
    injection_complementaire: 0
  });

  console.log('📊 TOTAUX ANNUELS CALCULÉS:', yearlyTotals);

  const totalConsumption = yearlyTotals.volume_partage + yearlyTotals.volume_complementaire;
  const totalInjection = yearlyTotals.injection_partagee + yearlyTotals.injection_complementaire;
  const injectionSharedPercentage = totalInjection > 0 ? (yearlyTotals.injection_partagee / totalInjection) * 100 : 0;
  const consumptionSharedPercentage = totalConsumption > 0 ? (yearlyTotals.volume_partage / totalConsumption) * 100 : 0;
  
  // Déterminer si le groupe est composé principalement de consommateurs
  const isConsumerGroup = groupParticipants.filter(p => p.type === 'consumer').length > groupParticipants.filter(p => p.type === 'producer').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Participant non trouvé</p>
          <button onClick={handleLogout} className="mt-4 text-blue-600 hover:text-blue-800">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const isGroupDashboard = participant.groupe && groupParticipants.length > 1;
  const dashboardTitle = isGroupDashboard ? `Groupe ${participant.groupe}` : participant.name;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src="/images/logo-v2.png" alt="Sun Is Up Logo" className="h-12 w-12" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {dashboardTitle}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
              
              <button
                onClick={onLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour admin
              </button>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </button>
              
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-500">
                  {isConsumerGroup ? 'Consommation partagée' : 'Injection partagée'}
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {isConsumerGroup 
                    ? `${(yearlyTotals.volume_partage / 1000).toFixed(2)} MWh`
                    : `${(yearlyTotals.injection_partagee / 1000).toFixed(2)} MWh`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-500">
                  {isConsumerGroup ? 'Consommation réseau' : 'Injection réseau'}
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {isConsumerGroup 
                    ? `${(yearlyTotals.volume_complementaire / 1000).toFixed(2)} MWh`
                    : `${(yearlyTotals.injection_complementaire / 1000).toFixed(2)} MWh`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-500">
                  {isConsumerGroup ? '% Consommation partagée' : '% Injection partagée'}
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {isConsumerGroup 
                    ? `${consumptionSharedPercentage.toFixed(1)}%`
                    : `${injectionSharedPercentage.toFixed(1)}%`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-500">
                  {isGroupDashboard ? 'Participants' : 'Statut'}
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {isGroupDashboard ? groupParticipants.length : 'Individuel'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isGroupDashboard ? `Évolution du groupe ${participant.groupe}` : 'Votre évolution énergétique'}
              </h3>
              <p className="text-sm text-gray-600">
                Données mensuelles pour l'année {selectedYear}
              </p>
            </div>
          </div>
          
          {monthlyData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      border: '1px solid #e5e7eb'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} kWh`, '']}
                  />
                  <Legend />
                  <Bar dataKey="volume_partage" fill="#10B981" name="Consommation Partagée" />
                  <Bar dataKey="volume_complementaire" fill="#3B82F6" name="Consommation Réseau" />
                  <Bar dataKey="injection_partagee" fill="#F59E0B" name="Injection Partagée" />
                  <Bar dataKey="injection_complementaire" fill="#8B5CF6" name="Injection Réseau" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Aucune donnée disponible</p>
              <p className="text-sm">Aucune donnée trouvée pour l'année {selectedYear}</p>
            </div>
          )}
        </div>

        {/* Tableau détaillé des participants du groupe */}
        {isGroupDashboard && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Détail par participant - Groupe {participant.groupe}
                </h3>
                <p className="text-sm text-gray-600">
                  Données individuelles pour l'année {selectedYear}
                </p>
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
                      Cons. Partagée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cons. Réseau
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inj. Partagée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inj. Réseau
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupParticipants.map((groupParticipant) => {
                    // Calculer les totaux individuels pour ce participant
                    const individualTotals = processIndividualMonthlyData(groupParticipant, selectedYear)
                      .reduce((totals, month) => ({
                        volume_partage: totals.volume_partage + month.volume_partage,
                        volume_complementaire: totals.volume_complementaire + month.volume_complementaire,
                        injection_partagee: totals.injection_partagee + month.injection_partagee,
                        injection_complementaire: totals.injection_complementaire + month.injection_complementaire
                      }), {
                        volume_partage: 0,
                        volume_complementaire: 0,
                        injection_partagee: 0,
                        injection_complementaire: 0
                      });

                    const isCurrentUser = groupParticipant.email === user.email;

                    return (
                      <tr key={groupParticipant.id} className={isCurrentUser ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                groupParticipant.type === 'producer' ? 'bg-amber-100' : 'bg-blue-100'
                              }`}>
                                {groupParticipant.type === 'producer' ? (
                                  <Sun className={`w-5 h-5 ${isCurrentUser ? 'text-amber-700' : 'text-amber-600'}`} />
                                ) : (
                                  <Building2 className={`w-5 h-5 ${isCurrentUser ? 'text-blue-700' : 'text-blue-600'}`} />
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {groupParticipant.name}
                                </div>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                    Vous
                                  </span>
                                )}
                              </div>
                              {groupParticipant.ean_code && (
                                <div className="text-xs text-gray-500 font-mono">
                                  {groupParticipant.ean_code}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            groupParticipant.type === 'producer' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {groupParticipant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(individualTotals.volume_partage / 1000).toFixed(2)} MWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(individualTotals.volume_complementaire / 1000).toFixed(2)} MWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(individualTotals.injection_partagee / 1000).toFixed(2)} MWh
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(individualTotals.injection_complementaire / 1000).toFixed(2)} MWh
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}