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
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [monthlyData, setMonthlyData] = useState<any>({});

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('participants') 
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        setUserProfile({
          id: data.id,
          email: data.email || user.email,
          name: data.name || user.name,
          member_type: data.type,
          monthly_data: data.monthly_data
        });

        // Parser les données mensuelles
        if (data.monthly_data) {
          try {
            const parsed = JSON.parse(data.monthly_data);
            setMonthlyData(parsed);
          } catch (e) {
            console.warn('Erreur parsing monthly_data:', e);
            setMonthlyData({});
          }
        }
        
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile({
          id: user.id,
          email: user.email,
          name: user.name || data?.name || 'Membre',
          member_type: user.member_type || data?.type || 'consumer'
        });
        setMonthlyData({});
      }
    };

    fetchUserProfile();
  }, [user]);

  // Memoized function to fetch energy data
  const fetchEnergyData = useCallback(async (mode: 'day' | 'week' | 'month', date: Date, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setDataLoading(true);
    }

    try {
      let startDate;
      let endDate = endOfDay(date);
      
      // Calculer les dates de début et de fin en fonction du mode de vue
      switch (mode) {
        case 'day':
          startDate = startOfDay(date);
          break;
        case 'week':
          startDate = startOfDay(subDays(date, 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(date, 30));
          break;
      }

      const { data, error } = await supabase
        .from('energy_data')
        .select('*')
        .eq('user_id', user.id || '')
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
  }, [user.id]);

  // Initial data load
  useEffect(() => {
    fetchEnergyData(viewMode, selectedDate, true);
  }, [fetchEnergyData, user.id]);

  // Data refresh when viewMode or selectedDate changes (but not initial load)
  useEffect(() => {
    if (!loading) { // Only if not initial load
      fetchEnergyData(viewMode, selectedDate, false);
    }
  }, [viewMode, selectedDate, fetchEnergyData, loading]);

  const formatData = (data: EnergyData[]) => {
    return data.map(item => ({
      ...item,
      time: format(new Date(item.timestamp), 'HH:mm'),
      date: format(new Date(item.timestamp), 'dd/MM'),
      consumption: Number(item.consumption),
      shared_energy: Number(item.shared_energy),
      production: Number(item.production || 0)
    }));
  };

  const aggregateDataByHour = (data: EnergyData[]) => {
    const hourlyData: Record<string, { consumption: number; shared_energy: number; production: number; count: number }> = {};
    
    data.forEach(item => {
      const hour = format(new Date(item.timestamp), 'HH:00');
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { consumption: 0, shared_energy: 0, production: 0, count: 0 };
      }
      
      hourlyData[hour].consumption += Number(item.consumption);
      hourlyData[hour].shared_energy += Number(item.shared_energy);
      hourlyData[hour].production += Number(item.production || 0);
      hourlyData[hour].count += 1;
    });
    
    return Object.entries(hourlyData).map(([hour, values]) => ({
      time: hour,
      consumption: values.consumption / values.count,
      shared_energy: values.shared_energy / values.count,
      production: values.production / values.count
    }));
  };

  const aggregateDataByDay = (data: EnergyData[]) => {
    const dailyData: Record<string, { consumption: number; shared_energy: number; production: number; count: number }> = {};
    
    data.forEach(item => {
      const day = format(new Date(item.timestamp), 'dd/MM');
      
      if (!dailyData[day]) {
        dailyData[day] = { consumption: 0, shared_energy: 0, production: 0, count: 0 };
      }
      
      dailyData[day].consumption += Number(item.consumption);
      dailyData[day].shared_energy += Number(item.shared_energy);
      dailyData[day].production += Number(item.production || 0);
      dailyData[day].count += 1;
    });
    
    return Object.entries(dailyData).map(([day, values]) => ({
      date: day,
      consumption: values.consumption,
      shared_energy: values.shared_energy, 
      production: values.production,
      count: values.count
    }));
  };

  const chartData = React.useMemo(() => {
    if (!energyData.length) return [];
    
    // Formater les données selon le mode de vue
    try {
      switch (viewMode) {
        case 'day':
          return aggregateDataByHour(energyData);
        case 'week':
        case 'month':
          return aggregateDataByDay(energyData);
        default:
          return formatData(energyData);
      }
    } catch (error) {
      console.error('Error formatting chart data:', error);
      return [];
    }
  }, [energyData, viewMode]);

  const totalConsumption = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.consumption), 0);
  }, [energyData]);

  const totalSharedEnergy = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.shared_energy), 0);
  }, [energyData]);

  const totalProduction = React.useMemo(() => {
    return energyData.reduce((sum, item) => sum + Number(item.production || 0), 0);
  }, [energyData]);

  // Données mensuelles pour le mois sélectionné
  const currentMonthData = React.useMemo(() => {
    const monthKey = format(selectedDate, 'yyyy-MM');
    return monthlyData[monthKey] || null;
  }, [monthlyData, selectedDate]);
  
  // Calculer le pourcentage d'énergie partagée
  const sharedPercentage = React.useMemo(() => {
    if (userProfile?.member_type === 'producer') {
      return totalProduction > 0 ? ((totalSharedEnergy / totalProduction) * 100) : 0;
    } else {
      return totalConsumption > 0 ? ((totalSharedEnergy / totalConsumption) * 100) : 0;
    }
  }, [totalConsumption, totalSharedEnergy, totalProduction, userProfile?.member_type]);

  const residualConsumption = React.useMemo(() => {
    return Math.max(0, totalConsumption - totalSharedEnergy);
  }, [totalConsumption, totalSharedEnergy]);

  // Optimized navigation functions with immediate UI update
  const navigatePrevious = useCallback(() => {
    setSelectedDate(prev => {
      switch (viewMode) {
        case 'day':
          return subDays(prev, 1);
        case 'week':
          return subWeeks(prev, 1);
        case 'month':
          return subMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setSelectedDate(prev => {
      switch (viewMode) {
        case 'day':
          return addDays(prev, 1);
        case 'week':
          return addWeeks(prev, 1);
        case 'month':
          return addMonths(prev, 1);
        default:
          return prev;
      }
    });
  }, [viewMode]);

  // Optimized view mode change
  const handleViewModeChange = useCallback((newMode: 'day' | 'week' | 'month') => {
    setViewMode(newMode);
  }, []);

  // Optimized date change
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  }, []);

  // Hook de déconnexion automatique pour les membres - NOUVEAU
  useAutoLogout({
    onLogout,
    timeoutMinutes: 15, // 15 minutes d'inactivité
    isLoggedIn: true // Toujours actif pour le member dashboard
  });

  // Calculate period display text
  const getPeriodDisplayText = () => {
    const endDate = selectedDate;
    let startDate;
    
    switch (viewMode) {
      case 'day':
        return format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr });
      case 'week':
        startDate = subDays(selectedDate, 7);
        return `Du ${format(startDate, 'dd/MM', { locale: fr })} au ${format(endDate, 'dd/MM/yyyy', { locale: fr })}`;
      case 'month':
        startDate = subDays(selectedDate, 30);
        return `Du ${format(startDate, 'dd/MM', { locale: fr })} au ${format(endDate, 'dd/MM/yyyy', { locale: fr })}`;
      default:
        return format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr });
    }
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
          {isProducer ? (
            <>
              {/* Production totale */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Zap className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Production totale</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{totalProduction.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Énergie partagée */}
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
                    <p className="text-3xl font-bold text-gray-900">{totalSharedEnergy.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Autoconsommation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Battery className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Autoconsommation</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{totalConsumption.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
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
                    <p className="text-sm text-gray-500">de la production</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Consommation totale */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart4 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Consommation totale</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{totalConsumption.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Énergie partagée */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Leaf className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Énergie partagée</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{totalSharedEnergy.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Consommation résiduelle */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Consommation résiduelle</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{residualConsumption.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">kWh</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pourcentage partagé */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <BarChart4 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Pourcentage partagé</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{sharedPercentage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-500">de la consommation</p>
                    <p className="text-xs text-gray-400">
                      {periodText}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Period Selector with Navigation - Enhanced with loading state */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Period Type Selector */}
            <div className="flex space-x-2">
              <button 
                onClick={() => handleViewModeChange('day')}
                disabled={dataLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${
                  viewMode === 'day' 
                    ? 'bg-amber-500 text-white shadow-md' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Jour
              </button>
              <button 
                onClick={() => handleViewModeChange('week')}
                disabled={dataLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${
                  viewMode === 'week' 
                    ? 'bg-amber-500 text-white shadow-md' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Semaine
              </button>
              <button 
                onClick={() => handleViewModeChange('month')}
                disabled={dataLoading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${
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
                  title={`${viewMode === 'day' ? 'Jour' : viewMode === 'week' ? 'Semaine' : 'Mois'} précédent`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={navigateNext}
                  disabled={dataLoading}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`${viewMode === 'day' ? 'Jour' : viewMode === 'week' ? 'Semaine' : 'Mois'} suivant`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Date Picker */}
              <div className="flex items-center">
                <input 
                  type="date" 
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  disabled={dataLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chart with smooth loading transition */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-500" />
            {isProducer ? 'Production et partage' : 'Consommation et énergie partagée'}
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
                  dataKey={viewMode === 'day' ? 'time' : 'date'} 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                  tickMargin={5}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fontSize: 12 }}
                  tickMargin={5}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)} kWh`, '']}
                />
                <Legend />
                
                {isProducer ? (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="production" 
                      name="Production" 
                      stroke="#F59E0B" 
                      fillOpacity={1} 
                      fill="url(#colorProduction)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="shared_energy" 
                      name="Énergie partagée" 
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#colorSharedEnergy)" 
                    />
                  </>
                ) : (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="consumption" 
                      name="Consommation" 
                      stroke="#3B82F6" 
                      fillOpacity={1} 
                      fill="url(#colorConsumption)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="shared_energy" 
                      name="Énergie partagée" 
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#colorSharedEnergy)" 
                    />
                  </>
                )}
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