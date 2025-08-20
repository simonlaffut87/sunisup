import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart4, TrendingUp, Zap, LogOut, Calendar, Clock, Battery, 
  Leaf, ChevronLeft, ChevronRight, Loader2, Database
} from 'lucide-react';
import { format, parseISO, subDays, startOfDay, endOfDay, addDays, 
  addWeeks, addMonths, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAutoLogout } from '../hooks/useAutoLogout';

interface User {
  id: string;
  email: string;
  name: string;
  member_type: 'consumer' | 'producer';
  monthly_data?: string;
}

interface EnergyData {
  id: string;
  user_id: string;
  timestamp: string;
  consumption: number;
  shared_energy: number;
  production: number;
  created_at: string;
}

interface MemberDashboardProps {
  user: User;
  onLogout: () => void;
}

export function MemberDashboard({ user, onLogout }: MemberDashboardProps) {
  const [energyData, setEnergyData] = useState<EnergyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [monthlyData, setMonthlyData] = useState<any>({});

  // Fonction pour charger les données mensuelles depuis la colonne monthly_data
  const loadMonthlyDataFromParticipant = useCallback(async (participantId: string) => {
    try {
      const { data: participant, error } = await supabase
        .from('participants')
        .select('monthly_data')
        .eq('id', participantId)
        .single();

      if (error) {
        console.error('Erreur chargement monthly_data:', error);
        return {};
      }

      if (participant.monthly_data) {
        try {
          const parsed = typeof participant.monthly_data === 'string' 
            ? JSON.parse(participant.monthly_data)
            : participant.monthly_data;
          console.log('✅ Données mensuelles chargées:', parsed);
          return parsed;
        } catch (e) {
          console.warn('Erreur parsing monthly_data:', e);
          return {};
        }
      }

      return {};
    } catch (error) {
      console.error('Erreur lors du chargement des données mensuelles:', error);
      return {};
    }
  }, []);

  useEffect(() => {
    const fetchUserProfileEffect = async () => {
      try {
        // Chercher d'abord par participant_id dans les métadonnées utilisateur
        let participantData = null;
        
        if (user.user_metadata?.participant_id) {
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('id', user.user_metadata.participant_id)
            .single();
          
          if (!error && data) {
            participantData = data;
          }
        }
        
        // Si pas trouvé par participant_id, chercher par email
        if (!participantData) {
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('email', user.email)
            .single();
          
          if (!error && data) {
            participantData = data;
          }
        }
        
        // Si pas trouvé par email, chercher par EAN dans les métadonnées
        if (!participantData && user.user_metadata?.ean_code) {
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('ean_code', user.user_metadata.ean_code)
            .single();
          
          if (!error && data) {
            participantData = data;
          }
        }

        if (participantData) {
          setUserProfile({
            id: participantData.id,
            email: participantData.email || user.email,
            name: participantData.name || user.name,
            member_type: participantData.type,
            monthly_data: participantData.monthly_data
          });

          // Charger les données mensuelles
          const monthlyDataLoaded = await loadMonthlyDataFromParticipant(participantData.id);
          setMonthlyData(monthlyDataLoaded);
        } else {
          // Fallback si aucun participant trouvé
          setUserProfile({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.name || 'Membre',
            member_type: user.user_metadata?.member_type || 'consumer'
          });
          setMonthlyData({});
        }
        
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.name || 'Membre',
          member_type: user.user_metadata?.member_type || 'consumer'
        });
        setMonthlyData({});
      }
    };

    fetchUserProfileEffect();
  }, [user, loadMonthlyDataFromParticipant]);

  // Fonction pour charger les données d'énergie depuis energy_data (ancienne méthode)
  const fetchEnergyDataOld = useCallback(async (year: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setDataLoading(true);
    }

    try {
      const startDate = new Date(year, 0, 1); // 1er janvier de l'année
      const endDate = new Date(year, 11, 31, 23, 59, 59); // 31 décembre de l'année

      // Chercher d'abord par participant_id, puis par user_id
      let query = supabase.from('energy_data').select('*');
      
      if (userProfile?.id) {
        query = query.eq('user_id', userProfile.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      // Smooth transition for data update
      setEnergyData(data || []);

    } catch (error) {
      console.error('Error fetching energy data:', error);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setDataLoading(false);
      }
    }
  }, [user.id, userProfile?.id]);

  // Nouvelle fonction pour utiliser les données mensuelles
  const fetchEnergyData = useCallback(async (year: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setDataLoading(true);
    }

    try {
      // Créer des données mensuelles pour l'année sélectionnée
      const simulatedData = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthData = monthlyData[monthKey];
        
        const pointDate = new Date(year, month - 1, 15); // 15 du mois
        
        // Utiliser les données mensuelles si disponibles, sinon 0
        const volumePartageValue = monthData?.volume_partage || 0;
        const volumeResiduelValue = monthData?.volume_complementaire || 0;
        const injectionTotaleValue = (monthData?.injection_partagee || 0) + (monthData?.injection_complementaire || 0);
        
        simulatedData.push({
          id: `month-${month}`,
          user_id: userProfile?.id || user.id,
          timestamp: pointDate.toISOString(),
          consumption: volumeResiduelValue, // Volume résiduel
          shared_energy: volumePartageValue, // Volume partagé
          production: injectionTotaleValue, // Injection totale
          created_at: new Date().toISOString(),
          month: month,
          monthName: format(pointDate, 'MMM', { locale: fr })
        });
      }
      
      setEnergyData(simulatedData);
      
      // Si aucune donnée mensuelle, essayer les vraies données
      if (simulatedData.every(d => d.consumption === 0 && d.shared_energy === 0 && d.production === 0)) {
        await fetchEnergyDataOld(year, isInitial);
        return;
        }
        
        setEnergyData(simulatedData);
      } else {
        setEnergyData(simulatedData);
      }

    } catch (error) {
      console.error('Error fetching energy data:', error);
      // Fallback vers les vraies données en cas d'erreur
      await fetchEnergyDataOld(year, isInitial);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setDataLoading(false);
      }
    }
  }, [user.id, userProfile?.id, monthlyData, fetchEnergyDataOld]);

  // Initial data load
  useEffect(() => {
    fetchEnergyData(selectedYear, true);
  }, [fetchEnergyData, user.id]);

  // Data refresh when viewMode or selectedDate changes (but not initial load)
  useEffect(() => {
    if (!loading) { // Only if not initial load
      fetchEnergyData(selectedYear, false);
    }
  }, [selectedYear, fetchEnergyData, loading]);

  const formatData = (data: EnergyData[]) => {
    return data.map(item => ({
      ...item,
      time: item.monthName || format(new Date(item.timestamp), 'MMM'),
      date: item.monthName || format(new Date(item.timestamp), 'MMM'),
      consumption: Number(item.consumption),
      shared_energy: Number(item.shared_energy),
      production: Number(item.production || 0)
    }));
  };

  const chartData = React.useMemo(() => {
    if (!energyData.length) return [];
    
    // Formater les données mensuelles
    try {
      return formatData(energyData);
    } catch (error) {
      console.error('Error formatting chart data:', error);
      return [];
    }
  }, [energyData]);

  const totalConsumption = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.consumption), 0);
  }, [energyData]);

  const totalSharedEnergy = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.shared_energy), 0);
  }, [energyData]);

  const totalProduction = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.production || 0), 0);
  }, [energyData]);

  const residualConsumption = React.useMemo(() => {
    return Math.max(0, totalConsumption - totalSharedEnergy);
  }, [totalConsumption, totalSharedEnergy]);

  // Données mensuelles pour le mois sélectionné
  const currentMonthData = React.useMemo(() => {
    const monthKey = format(new Date(), 'yyyy-MM');
    return monthlyData[monthKey] || null;
  }, [monthlyData]);

  // Nouvelles métriques basées sur les données mensuelles
  const totalInjection = React.useMemo(() => {
    // Calculer l'injection totale pour l'année sélectionnée
    let totalInjectionYear = 0;
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
      const monthData = monthlyData[monthKey];
      if (monthData) {
        totalInjectionYear += (monthData.injection_partagee || 0) + (monthData.injection_complementaire || 0);
      }
    }
    return totalInjectionYear;
  }, [monthlyData, selectedYear]);

  const volumePartage = React.useMemo(() => {
    // Calculer le volume partagé pour l'année sélectionnée
    let totalVolumePartage = 0;
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
      const monthData = monthlyData[monthKey];
      if (monthData) {
        totalVolumePartage += monthData.volume_partage || 0;
      }
    }
    return totalVolumePartage;
  }, [monthlyData, selectedYear]);

  const volumeResiduel = React.useMemo(() => {
    // Calculer le volume résiduel pour l'année sélectionnée
    let totalVolumeResiduel = 0;
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
      const monthData = monthlyData[monthKey];
      if (monthData) {
        totalVolumeResiduel += monthData.volume_complementaire || 0;
      }
    }
    return totalVolumeResiduel;
  }, [monthlyData, selectedYear]);

  const volumeTotal = React.useMemo(() => {
    return volumePartage + volumeResiduel;
  }, [volumePartage, volumeResiduel]);

  // Calculer le pourcentage d'énergie partagée
  const sharedPercentage = React.useMemo(() => {
    return volumeTotal > 0 ? ((volumePartage / volumeTotal) * 100) : 0;
  }, [volumePartage, volumeTotal]);

  // Optimized navigation functions with immediate UI update
  const navigatePrevious = useCallback(() => {
    setSelectedYear(prev => prev - 1);
  }, []);

  const navigateNext = useCallback(() => {
    setSelectedYear(prev => prev + 1);
  }, []);

  // Hook de déconnexion automatique pour les membres - NOUVEAU
  useAutoLogout({
    onLogout,
    timeoutMinutes: 15, // 15 minutes d'inactivité
    isLoggedIn: true // Toujours actif pour le member dashboard
  });

  // Calculate period display text
  const getPeriodDisplayText = () => {
    return `Année ${selectedYear}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const isProducer = userProfile?.member_type === 'producer';
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
                  Bonjour {userProfile?.name || user.name || user.email}
                </h1>
                <p className="text-sm text-gray-600">
                  {isProducer ? 'Producteur' : 'Consommateur'} - Sun Is Up
                </p>
                <p className="text-xs text-gray-500">
                  Données pour l'année {selectedYear}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Données mensuelles si disponibles */}
        {currentMonthData && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Database className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Données mensuelles - {format(selectedDate, 'MMMM yyyy', { locale: fr })}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600">Volume Partagé</div>
                <div className="text-xl font-bold text-blue-900">
                  {currentMonthData.volume_partage?.toFixed(2) || '0.00'} kWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <div className="text-sm text-green-600">Volume Complémentaire</div>
                <div className="text-xl font-bold text-green-900">
                  {currentMonthData.volume_complementaire?.toFixed(2) || '0.00'} kWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-600">Injection Partagée</div>
                <div className="text-xl font-bold text-amber-900">
                  {currentMonthData.injection_partagee?.toFixed(2) || '0.00'} kWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="text-sm text-purple-600">Injection Résiduelle</div>
                <div className="text-xl font-bold text-purple-900">
                  {currentMonthData.injection_residuelle?.toFixed(2) || '0.00'} kWh
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              Dernière mise à jour: {currentMonthData.updated_at ? format(new Date(currentMonthData.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Inconnue'}
            </div>
          </div>
        )}

        {/* Stats Cards with smooth transition */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-opacity duration-300 ${dataLoading ? 'opacity-60' : 'opacity-100'}`}>
          {/* Injection totale */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Injection totale</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{totalInjection.toFixed(1)}</p>
                <p className="text-sm text-gray-500">kWh</p>
                {currentMonthData && (
                  <p className="text-xs text-amber-600">
                    Total annuel: {totalInjection.toFixed(1)} kWh
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {periodText}
                </p>
              </div>
            </div>
          </div>

          {/* Volume partagé */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Leaf className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Volume partagé</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{volumePartage.toFixed(1)}</p>
                <p className="text-sm text-gray-500">kWh</p>
                {currentMonthData && (
                  <p className="text-xs text-green-600">
                    Total annuel: {volumePartage.toFixed(1)} kWh
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {periodText}
                </p>
              </div>
            </div>
          </div>

          {/* Volume résiduel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Volume résiduel</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{volumeResiduel.toFixed(1)}</p>
                <p className="text-sm text-gray-500">kWh</p>
                {currentMonthData && (
                  <p className="text-xs text-blue-600">
                    Total annuel: {volumeResiduel.toFixed(1)} kWh
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {periodText}
                </p>
              </div>
            </div>
          </div>

          {/* Taux de partage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart4 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Taux de partage</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{sharedPercentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">du volume total</p>
                {currentMonthData && (
                  <p className="text-xs text-purple-600">
                    {volumePartage.toFixed(1)} / {volumeTotal.toFixed(1)} kWh (année)
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {periodText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Selector with Navigation - Enhanced with loading state */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Year Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Année :</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                disabled={dataLoading}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Period Display and Navigation */}
            <div className="flex items-center gap-4">
              {/* Period Display with loading indicator */}
              <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg relative">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className={`font-medium text-gray-900 min-w-0 transition-opacity duration-200 ${dataLoading ? 'opacity-50' : 'opacity-100'}`}>
                  {periodText}
                </span>
                {dataLoading && (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-2" />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  disabled={dataLoading}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={navigateNext}
                  disabled={dataLoading}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Année suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chart with smooth loading transition */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-500" />
            Données énergétiques mensuelles
          </h3>
          
          {/* Loading overlay */}
          {dataLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
              <div className="flex items-center gap-3 text-amber-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-medium">Mise à jour des données...</span>
              </div>
            </div>
          )}
          
          <div className={`h-80 transition-opacity duration-300 ${dataLoading ? 'opacity-30' : 'opacity-100'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorSharedEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="time"
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                  tickMargin={5}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                  tickMargin={5}
                  label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)} kWh`, '']}
                />
                <Legend />
                
                <Area 
                  type="monotone" 
                  dataKey="shared_energy" 
                  name="Volume partagé" 
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorSharedEnergy)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="consumption" 
                  name="Volume résiduel" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorConsumption)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="production" 
                  name="Injection totale" 
                  stroke="#F59E0B" 
                  fillOpacity={1} 
                  fill="url(#colorProduction)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
      <footer className="bg-gray-100 py-4 text-center text-sm text-gray-500">
        <p>Dernière mise à jour: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
      </footer>
    </div>
  );
}