import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart4, TrendingUp, Zap, LogOut, Calendar, Clock, Battery, ArrowLeft,
  Leaf, ChevronLeft, ChevronRight, Loader2, Database, Users, Building2
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
  BarChart,
  Bar,
  AreaChart
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
  const [groupData, setGroupData] = useState<any>({});
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);

  // Fonction pour charger les données mensuelles depuis la colonne monthly_data
  const loadMonthlyDataFromParticipant = useCallback(async (participantId: string) => {
    try {
      console.log('📊 Chargement monthly_data pour participant ID:', participantId);
      
      const { data: participant, error } = await supabase
        .from('participants')
        .select('monthly_data')
        .eq('id', participantId)
        .limit(1);

      if (error) {
        console.error('Erreur chargement monthly_data:', error);
        console.log('❌ Impossible de charger monthly_data:', error.message);
        return {};
      }

      if (!participant || participant.length === 0) {
        console.log('⚠️ Aucun participant trouvé pour cet ID');
        return {};
      }

      const participantData = participant[0];
      console.log('📋 monthly_data brut récupéré:', participant.monthly_data);
      
      if (participantData.monthly_data) {
        try {
          const parsed = typeof participantData.monthly_data === 'string' 
            ? JSON.parse(participantData.monthly_data)
            : participantData.monthly_data;
          console.log('✅ Données mensuelles parsées:', Object.keys(parsed));
          console.log('📊 Détail des mois disponibles:', parsed);
          return parsed;
        } catch (e) {
          console.warn('Erreur parsing monthly_data:', e);
          console.log('❌ Erreur parsing monthly_data:', e.message);
          return {};
        }
      }

      console.log('⚠️ Aucune monthly_data trouvée pour ce participant');
      return {};
    } catch (error) {
      console.error('Erreur lors du chargement des données mensuelles:', error);
      console.log('❌ Erreur générale chargement monthly_data:', error.message);
      return {};
    }
  }, []);

  // Fonction pour charger les données du groupe
  const loadGroupData = useCallback(async (groupe: string, selectedYear: number) => {
    if (!groupe) {
      setGroupData({});
      setGroupParticipants([]);
      return;
    }

    try {
      console.log('📊 Chargement des données du groupe:', groupe);
      
      // Charger TOUS les participants du groupe, qu'ils aient un email ou non
      const { data: participants, error } = await supabase
        .from('participants')
        .select('*')
        .eq('groupe', groupe);

      if (error) {
        console.error('❌ Erreur chargement participants du groupe:', error);
        return;
      }

      console.log('✅ Participants du groupe trouvés:', participants?.length || 0);
      setGroupParticipants(participants || []);

      // Agréger les données mensuelles de tous les participants du groupe
      const groupMonthlyData: any = {};
      
      participants?.forEach(participant => {
        if (participant.monthly_data) {
          try {
            const participantMonthlyData = typeof participant.monthly_data === 'string' 
              ? JSON.parse(participant.monthly_data)
              : participant.monthly_data;
            
            // Pour chaque mois dans les données du participant
            Object.entries(participantMonthlyData).forEach(([month, data]: [string, any]) => {
              console.log('🔍 Analyse des participants du groupe:', groupParticipants.length);
              
              if (month.startsWith(selectedYear.toString())) {
                console.log(`📊 Participant: ${participant.name}, monthly_data:`, participant.monthly_data);
                
                if (!groupMonthlyData[month]) {
                  groupMonthlyData[month] = {
                    volume_partage: 0,
                    volume_complementaire: 0,
                    injection_partagee: 0,
                    injection_complementaire: 0,
                    participants: []
                  };
                }
                
                if (participant.monthly_data) {
                  console.log(`📅 Données mensuelles pour ${participant.name}:`, Object.keys(participant.monthly_data));
                  
                  Object.entries(participant.monthly_data).forEach(([month, data]: [string, any]) => {
                    if (month.startsWith(selectedYear.toString())) {
                      console.log(`📊 Mois ${month} pour ${participant.name}:`, data);
                    }
                  });
                }
                
                groupMonthlyData[month].volume_partage += data.volume_partage || 0;
                groupMonthlyData[month].volume_complementaire += data.volume_complementaire || 0;
                groupMonthlyData[month].injection_partagee += data.injection_partagee || 0;
                groupMonthlyData[month].injection_complementaire += data.injection_complementaire || 0;
                groupMonthlyData[month].participants.push({
                  name: participant.name,
                  type: participant.type,
                  data: data
                });
              }
            });
          } catch (e) {
            console.warn(`⚠️ Erreur parsing monthly_data pour ${participant.name}:`, e);
          }
        }
      });

      console.log('📊 Données agrégées du groupe:', groupMonthlyData);
      setGroupData(groupMonthlyData);

    } catch (error) {
      console.error('❌ Erreur chargement données du groupe:', error);
    }
  }, []);
  
  useEffect(() => {
    const fetchUserProfileEffect = async () => {
      try {
        console.log('🔍 Recherche du profil utilisateur pour:', user.email);
        console.log('📋 User ID:', user.id);
        console.log('📋 Métadonnées utilisateur:', user.user_metadata);
        
        // PRIORITÉ 1: Si on a un participant_id spécifique passé en props, l'utiliser
        if (user.participant_id) {
          console.log('🎯 PRIORITÉ: Utilisation du participant_id spécifique:', user.participant_id);
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('id', user.participant_id)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            const participantData = data[0];
            console.log('✅ Participant spécifique trouvé:', participantData.name);
            setUserProfile({
              id: participantData.id,
              email: participantData.email || user.email,
              name: participantData.name || user.name,
              member_type: participantData.type,
              monthly_data: participantData.monthly_data
            });

            const monthlyDataLoaded = await loadMonthlyDataFromParticipant(participantData.id);
            setMonthlyData(monthlyDataLoaded);
            return;
          }
        }
        
        // PRIORITÉ 2: Chercher par email d'abord (plus fiable après mise à jour)
        console.log('🔍 Recherche par email:', user.email);
        const { data: participantByEmail, error: emailError } = await supabase
          .from('participants')
          .select('*')
          .eq('email', user.email)
          .limit(1);
        
        if (!emailError && participantByEmail && participantByEmail.length > 0) {
          const participantData = participantByEmail[0];
          console.log('✅ Participant trouvé par email:', participantData.name);
          setUserProfile({
            id: participantData.id,
            email: participantData.email || user.email,
            name: participantData.name || user.name,
            member_type: participantData.type,
            monthly_data: participantData.monthly_data
          });

          const monthlyDataLoaded = await loadMonthlyDataFromParticipant(participantData.id);
          setMonthlyData(monthlyDataLoaded);
          return;
        }
        
        // PRIORITÉ 3: Chercher par participant_id dans les métadonnées utilisateur
        let participantData = null;
        
        if (user.user_metadata?.participant_id) {
          console.log('🔍 Recherche par participant_id:', user.user_metadata.participant_id);
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('id', user.user_metadata.participant_id)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            console.log('✅ Participant trouvé par participant_id:', data[0].name);
            participantData = data[0];
          } else {
            console.log('❌ Participant non trouvé par participant_id:', error?.message);
          }
        }
        
        // PRIORITÉ 4: Si pas trouvé par email, chercher par EAN dans les métadonnées
        if (!participantData && user.user_metadata?.ean_code) {
          console.log('🔍 Recherche par EAN code:', user.user_metadata.ean_code);
          const { data, error } = await supabase
            .from('participants')
            .select('*')
            .eq('ean_code', user.user_metadata.ean_code)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            console.log('✅ Participant trouvé par EAN:', data[0].name);
            participantData = data[0];
          } else {
            console.log('❌ Participant non trouvé par EAN:', error?.message);
          }
        }

        console.log(`📊 Totaux pour ${participant.name}:`, participantTotals);
        
        if (participantData) {
          console.log('✅ Profil participant final:', {
            id: participantData.id,
            name: participantData.name,
            email: participantData.email,
            ean_code: participantData.ean_code,
            hasMonthlyData: !!participantData.monthly_data
          });
          
          setUserProfile({
            id: participantData.id,
            email: participantData.email || user.email,
            name: participantData.name || user.name,
            member_type: participantData.type,
            monthly_data: participantData.monthly_data
          });

          // Charger les données mensuelles
          const monthlyDataLoaded = await loadMonthlyDataFromParticipant(participantData.id);
          console.log('📊 Données mensuelles chargées:', monthlyDataLoaded);
          setMonthlyData(monthlyDataLoaded);
        } else {
          console.log('❌ Aucun participant trouvé - utilisation du profil utilisateur de base');
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
        console.log('❌ Erreur lors de la récupération du profil utilisateur');
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

  // Charger les données du groupe quand le profil utilisateur change
  useEffect(() => {
    if (userProfile?.groupe) {
      loadGroupData(userProfile.groupe, selectedYear);
    }
  }, [userProfile?.groupe, selectedYear, loadGroupData]);
  
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
      console.log('📊 Chargement des données mensuelles pour l\'année:', year);
      console.log('👤 Profil utilisateur:', userProfile);
      console.log('📋 Données mensuelles disponibles:', Object.keys(monthlyData));
      
      // Charger les données monthly_data du participant depuis la base
      if (!userProfile?.id) {
        console.warn('⚠️ Aucun profil utilisateur trouvé');
        setEnergyData([]);
        return;
      }

      // Recharger les données fraîches depuis la base
      console.log('🔄 Rechargement des données fraîches depuis la base...');
      const { data: participant, error } = await supabase
        .from('participants')
        .select('monthly_data, name, ean_code')
        .eq('id', userProfile.id)
        .limit(1);

      if (error) {
        console.error('❌ Erreur chargement participant:', error);
        console.log('❌ Impossible de charger le participant depuis la base');
        throw error;
      }

      console.log('✅ TOUS les participants du groupe trouvés:', groupParticipants?.length || 0);
      console.log('📋 Liste des participants:', groupParticipants?.map(p => `${p.name} (email: ${p.email ? 'oui' : 'non'})`));
      
      if (!participant || participant.length === 0) {
        console.log('❌ Aucun participant trouvé avec cet ID');
        throw new Error('Participant non trouvé');
      }

      const participantData = participant[0];
      console.log('📋 Participant chargé:', {
        console.log('📊 Données finales du groupe:', groupParticipantsData);
        console.log('📅 Données mensuelles du groupe:', groupYearlyData);
        
        name: participantData.name,
        ean_code: participantData.ean_code,
        hasMonthlyData: !!participantData.monthly_data
      });
      console.log('📊 monthly_data brut depuis la base:', participantData.monthly_data);

      let monthlyDataFromDB = {};
      if (participantData.monthly_data) {
        try {
          monthlyDataFromDB = typeof participantData.monthly_data === 'string' 
            ? JSON.parse(participantData.monthly_data)
            : participantData.monthly_data;
          console.log('✅ monthly_data parsé - mois disponibles:', Object.keys(monthlyDataFromDB));
          console.log('📊 Détail des données par mois:', monthlyDataFromDB);
        } catch (e) {
          console.warn('⚠️ Erreur parsing monthly_data:', e);
          monthlyDataFromDB = {};
        }
      } else {
        console.log('⚠️ Aucune monthly_data trouvée pour ce participant');
      }

      // Mettre à jour les données mensuelles locales
      setMonthlyData(monthlyDataFromDB);
      
      // Créer les données mensuelles pour l'année sélectionnée
      const monthlyDataArray = [];
      
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const monthData = monthlyDataFromDB[monthKey];
        
        if (monthData) {
          console.log(`📅 ${monthKey} - Données trouvées:`, {
            volume_partage: monthData.volume_partage,
            volume_complementaire: monthData.volume_complementaire,
            injection_partagee: monthData.injection_partagee,
            injection_complementaire: monthData.injection_complementaire
          });
        }
        
        const pointDate = new Date(year, month - 1, 15); // 15 du mois
        
        // Utiliser les vraies données mensuelles
        const volumePartageValue = monthData?.volume_partage || 0;
        const volumeResiduelValue = monthData?.volume_complementaire || 0;
        const injectionPartageeValue = monthData?.injection_partagee || 0;
        const injectionResiduelleValue = monthData?.injection_complementaire || 0;
        
        monthlyDataArray.push({
          id: `month-${month}`,
          user_id: userProfile.id,
          timestamp: pointDate.toISOString(),
          consumption: volumeResiduelValue, // Volume résiduel (complémentaire)
          shared_energy: volumePartageValue, // Volume partagé
          injection_partagee: injectionPartageeValue, // Injection partagée
          injection_complementaire: injectionResiduelleValue, // Injection résiduelle
          created_at: new Date().toISOString(),
          month: month,
          monthName: format(pointDate, 'MMM', { locale: fr })
        });
      }
      
      console.log('📊 Données générées pour le graphique:', monthlyDataArray.length, 'points');
      console.log('📈 Données avec valeurs non-nulles:', monthlyDataArray.filter(d => 
        d.consumption > 0 || d.shared_energy > 0 || d.injection_partagee > 0 || d.injection_residuelle > 0
      ).length);
      setEnergyData(monthlyDataArray);
        

    } catch (error) {
      console.error('Error fetching energy data:', error);
      console.log('❌ Erreur lors du chargement des données énergétiques');
      // En cas d'erreur, afficher des données vides
      setEnergyData([]);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setDataLoading(false);
      }
    }
  }, [userProfile?.id]);

  // Initial data load
  useEffect(() => {
    if (userProfile?.id) {
      fetchEnergyData(selectedYear, true);
    }
  }, [fetchEnergyData, userProfile?.id]);

  // Data refresh when viewMode or selectedDate changes (but not initial load)
  useEffect(() => {
    if (!loading && userProfile?.id) { // Only if not initial load and user profile loaded
      fetchEnergyData(selectedYear, false);
    }
  }, [selectedYear, fetchEnergyData, loading, userProfile?.id]);

  const formatData = (data: EnergyData[]) => {
    return data.map(item => ({
      ...item,
      time: item.monthName || format(new Date(item.timestamp), 'MMM'),
      date: item.monthName || format(new Date(item.timestamp), 'MMM'),
      consumption: Number(item.consumption),
      shared_energy: Number(item.shared_energy),
      production: Number(item.production || 0),
      injection_partagee: Number(item.injection_partagee || 0),
      injection_complementaire: Number(item.injection_complementaire || 0),
      // Versions divisées par 1000 pour l'affichage en MWh
      consumption_mwh: Number(item.consumption) / 1000,
      shared_energy_mwh: Number(item.shared_energy) / 1000,
      injection_partagee_mwh: Number(item.injection_partagee || 0) / 1000,
      injection_complementaire_mwh: Number(item.injection_complementaire || 0) / 1000
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

  // Calculer la période avec des données disponibles
  const availableDataPeriod = React.useMemo(() => {
    const monthsWithData = [];
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${selectedYear}-${String(month).padStart(2, '0')}`;
      const monthData = monthlyData[monthKey];
      if (monthData && (
        (monthData.volume_partage && monthData.volume_partage > 0) ||
        (monthData.volume_complementaire && monthData.volume_complementaire > 0) ||
        (monthData.injection_partagee && monthData.injection_partagee > 0) ||
        (monthData.injection_complementaire && monthData.injection_complementaire > 0)
      )) {
        monthsWithData.push({
          month,
          monthKey,
          data: monthData
        });
      }
    }
    
    if (monthsWithData.length === 0) {
      return null;
    }
    
    const firstMonth = monthsWithData[0].month;
    const lastMonth = monthsWithData[monthsWithData.length - 1].month;
    
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    
    let periodText;
    if (firstMonth === lastMonth) {
      periodText = `${monthNames[firstMonth - 1]} ${selectedYear}`;
    } else {
      periodText = `${monthNames[firstMonth - 1]} à ${monthNames[lastMonth - 1]} ${selectedYear}`;
    }
    
    return {
      monthsWithData,
      periodText,
      monthCount: monthsWithData.length
    };
  }, [monthlyData, selectedYear]);

  // Nouvelles métriques basées sur les données mensuelles disponibles
  const totalInjection = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    return availableDataPeriod.monthsWithData.reduce((total, { data }) => {
      return total + (data.injection_partagee || 0) + (data.injection_complementaire || 0);
    }, 0);
  }, [availableDataPeriod]);

  const injectionPartagee = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    return availableDataPeriod.monthsWithData.reduce((total, { data }) => {
      return total + (data.injection_partagee || 0);
    }, 0);
  }, [availableDataPeriod]);

  const injectionResiduelle = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    return availableDataPeriod.monthsWithData.reduce((total, { data }) => {
      return total + (data.injection_complementaire || 0);
    }, 0);
  }, [availableDataPeriod]);
  
  const volumePartage = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    return availableDataPeriod.monthsWithData.reduce((total, { data }) => {
      return total + (data.volume_partage || 0);
    }, 0);
  }, [availableDataPeriod]);

  const volumeResiduel = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    return availableDataPeriod.monthsWithData.reduce((total, { data }) => {
      return total + (data.volume_complementaire || 0);
    }, 0);
  }, [availableDataPeriod]);

  const volumeTotal = React.useMemo(() => {
    return volumePartage + volumeResiduel;
  }, [volumePartage, volumeResiduel]);

  // Calculer le taux de partage moyen
  const sharedPercentage = React.useMemo(() => {
    if (!availableDataPeriod) return 0;
    
    // Pour les consommateurs: consommation partagée / consommation totale
    // Pour les producteurs: injection partagée / injection totale
    if (userProfile?.member_type === 'producer') {
      const totalInjectionForCalc = injectionPartagee + injectionResiduelle;
      if (totalInjectionForCalc === 0) return 0;
      return (injectionPartagee / totalInjectionForCalc) * 100;
    } else {
      // Consommateur
      const totalConsumptionForCalc = volumePartage + volumeResiduel;
      if (totalConsumptionForCalc === 0) return 0;
      return (volumePartage / totalConsumptionForCalc) * 100;
    }
  }, [availableDataPeriod, volumePartage, volumeResiduel, injectionPartagee, injectionResiduelle, userProfile?.member_type]);

  // Calculer les totaux pour l'affichage du taux
  const totalForSharing = React.useMemo(() => {
    if (userProfile?.member_type === 'producer') {
      return injectionPartagee + injectionResiduelle;
    } else {
      return volumePartage + volumeResiduel;
    }
  }, [userProfile?.member_type, volumePartage, volumeResiduel, injectionPartagee, injectionResiduelle]);

  const sharedForSharing = React.useMemo(() => {
    if (userProfile?.member_type === 'producer') {
      return injectionPartagee;
    } else {
      return volumePartage;
    }
  }, [userProfile?.member_type, volumePartage, injectionPartagee]);

  // Calculer le taux de partage pondéré par volume
  const weightedSharedPercentage = React.useMemo(() => {
    if (!availableDataPeriod || volumeTotal === 0) return 0;
    
    let totalWeightedPercentage = 0;
    let totalWeight = 0;
    
    availableDataPeriod.monthsWithData.forEach(({ data }) => {
      const monthVolumePartage = data.volume_partage || 0;
      const monthVolumeTotal = (data.volume_partage || 0) + (data.volume_complementaire || 0);
      
      if (monthVolumeTotal > 0) {
        const monthPercentage = (monthVolumePartage / monthVolumeTotal) * 100;
        totalWeightedPercentage += monthPercentage * monthVolumeTotal;
        totalWeight += monthVolumeTotal;
      }
    });
    
    return totalWeight > 0 ? totalWeightedPercentage / totalWeight : 0;
  }, [availableDataPeriod, volumeTotal]);

  // Calculer les totaux du groupe
  const groupTotals = React.useMemo(() => {
    if (!userProfile?.groupe || Object.keys(groupData).length === 0) {
      return null;
    }

    let totalVolumePartage = 0;
    let totalVolumeComplementaire = 0;
    let totalInjectionPartagee = 0;
    let totalInjectionComplementaire = 0;

    Object.values(groupData).forEach((monthData: any) => {
      totalVolumePartage += monthData.volume_partage || 0;
      totalVolumeComplementaire += monthData.volume_complementaire || 0;
      totalInjectionPartagee += monthData.injection_partagee || 0;
      totalInjectionComplementaire += monthData.injection_complementaire || 0;
    });

    return {
      volumePartage: totalVolumePartage,
      volumeComplementaire: totalVolumeComplementaire,
      injectionPartagee: totalInjectionPartagee,
      injectionComplementaire: totalInjectionComplementaire,
      participantCount: groupParticipants.length
    };
  }, [groupData, groupParticipants, userProfile?.groupe]);
  
  // Période d'affichage
  const displayPeriod = React.useMemo(() => {
    if (availableDataPeriod) {
      return availableDataPeriod.periodText;
    }
    return `Année ${selectedYear} (aucune donnée)`;
  }, [availableDataPeriod, selectedYear]);

  // Fonction pour obtenir le texte de période
  const getPeriodDisplayText = () => {
    return displayPeriod;
  };

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
              <button
                onClick={onLogout}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
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
                {userProfile?.groupe && (
                  <p className="text-xs text-amber-600 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    Groupe: {userProfile.groupe}
                  </p>
                )}
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
                Données mensuelles - {format(new Date(), 'MMMM yyyy', { locale: fr })}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600">Consommation Partagée</div>
                <div className="text-xl font-bold text-blue-900">
                  {((currentMonthData.volume_partage || 0) / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <div className="text-sm text-green-600">Consommation Réseau</div>
                <div className="text-xl font-bold text-green-900">
                  {((currentMonthData.volume_complementaire || 0) / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-600">Injection Partagée</div>
                <div className="text-xl font-bold text-amber-900">
                  {((currentMonthData.injection_partagee || 0) / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="text-sm text-purple-600">Injection Réseau</div>
                <div className="text-xl font-bold text-purple-900">
                  {((currentMonthData.injection_complementaire || 0) / 1000).toFixed(3)} MWh
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              Dernière mise à jour: {currentMonthData.updated_at ? format(new Date(currentMonthData.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : 'Inconnue'}
            </div>
          </div>
        )}

        {/* Données du groupe si applicable */}
        {userProfile?.groupe && groupTotals && (
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Données du groupe "{userProfile.groupe}" - {selectedYear}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-lg border border-purple-100">
                <div className="text-sm text-purple-600">Consommation Partagée</div>
                <div className="text-xl font-bold text-purple-900">
                  {(groupTotals.volumePartage / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-indigo-100">
                <div className="text-sm text-indigo-600">Consommation Réseau</div>
                <div className="text-xl font-bold text-indigo-900">
                  {(groupTotals.volumeComplementaire / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-600">Injection Partagée</div>
                <div className="text-xl font-bold text-amber-900">
                  {(groupTotals.injectionPartagee / 1000).toFixed(3)} MWh
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <div className="text-sm text-green-600">Injection Réseau</div>
                <div className="text-xl font-bold text-green-900">
                  {(groupTotals.injectionComplementaire / 1000).toFixed(3)} MWh
                </div>
              </div>
            </div>

            {/* Détail par participant du groupe */}
            <div className="bg-white rounded-lg border border-purple-100 overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                <h4 className="font-medium text-purple-900 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Participants du groupe ({groupTotals.participantCount})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cons. Partagée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cons. Réseau
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inj. Partagée
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inj. Réseau
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupParticipants.map((participant) => {
                      // Calculer les totaux pour ce participant sur l'année
                      let participantTotals = {
                        volumePartage: 0,
                        volumeComplementaire: 0,
                        injectionPartagee: 0,
                        injectionComplementaire: 0
                      };

                      if (participant.monthly_data) {
                        try {
                          const monthlyData = typeof participant.monthly_data === 'string' 
                            ? JSON.parse(participant.monthly_data)
                            : participant.monthly_data;
                          
                          Object.entries(monthlyData).forEach(([month, data]: [string, any]) => {
                            if (month.startsWith(selectedYear.toString())) {
                              participantTotals.volumePartage += data.volume_partage || 0;
                              participantTotals.volumeComplementaire += data.volume_complementaire || 0;
                              participantTotals.injectionPartagee += data.injection_partagee || 0;
                              participantTotals.injectionComplementaire += data.injection_complementaire || 0;
                            }
                          });
                        } catch (e) {
                          console.warn(`Erreur parsing données pour ${participant.name}:`, e);
                        }
                      }

                      console.log(`📊 Totaux pour ${participant.name}:`, participantTotals);

                      return (
                        <tr key={participant.id} className={`hover:bg-purple-50 ${participant.id === userProfile?.id ? 'bg-purple-100' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">
                                {participant.name}
                                {participant.id === userProfile?.id && (
                                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                    Vous
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              participant.type === 'producer' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {participant.type === 'producer' ? 'Producteur' : 'Consommateur'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(participantTotals.volumePartage / 1000).toFixed(3)} MWh
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(participantTotals.volumeComplementaire / 1000).toFixed(3)} MWh
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(participantTotals.injectionPartagee / 1000).toFixed(3)} MWh
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(participantTotals.injectionComplementaire / 1000).toFixed(3)} MWh
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Stats Cards with smooth transition */}
        <div className={`grid grid-cols-1 md:grid-cols-5 gap-6 mb-8 transition-opacity duration-300 ${dataLoading ? 'opacity-60' : 'opacity-100'}`}>
          {/* Injection partagée */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600 leading-tight">Injection partagée</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{(injectionPartagee / 1000).toFixed(3)}</p>
                <p className="text-sm text-gray-500">MWh</p>
                {currentMonthData && (
                  <p className="text-xs text-amber-600">
                    Total période: {(injectionPartagee / 1000).toFixed(3)} MWh
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {periodText}
                </p>
              </div>
            </div>
          </div>

          {/* Injection résiduelle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600 leading-tight">Injection réseau</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{(injectionResiduelle / 1000).toFixed(3)}</p>
                <p className="text-sm text-gray-500">MWh</p>
                {currentMonthData && (
                  <p className="text-xs text-purple-600">
                    Total période: {(injectionResiduelle / 1000).toFixed(3)} MWh
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
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Leaf className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600 leading-tight">Consommation partagée</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{(volumePartage / 1000).toFixed(3)}</p>
                <p className="text-sm text-gray-500">MWh</p>
                {currentMonthData && (
                  <p className="text-xs text-green-600">
                    Total période: {(volumePartage / 1000).toFixed(3)} MWh
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
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600 leading-tight">Consommation réseau</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{(volumeResiduel / 1000).toFixed(3)}</p>
                <p className="text-sm text-gray-500">MWh</p>
                {currentMonthData && (
                  <p className="text-xs text-blue-600">
                    Total période: {(volumeResiduel / 1000).toFixed(3)} MWh
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
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart4 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-600 leading-tight">Taux de partage</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-900">{sharedPercentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">
                  {userProfile?.member_type === 'producer' ? 'de l\'injection totale' : 'de la consommation totale'}
                </p>
                {currentMonthData && (
                  <p className="text-xs text-purple-600">
                    {(sharedForSharing / 1000).toFixed(3)} / {(totalForSharing / 1000).toFixed(3)} MWh (période)
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
            Données énergétiques mensuelles - {userProfile?.name}
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
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
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
                  label={{ value: 'MWh', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(3)} MWh`, '']}
                />
                <Legend />
                
                <Bar 
                  type="monotone" 
                  dataKey="shared_energy_mwh" 
                  name="Consommation Partagée" 
                  fill="#10B981"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  type="monotone" 
                  dataKey="consumption_mwh" 
                  name="Consommation Réseau" 
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="injection_partagee_mwh" 
                  name="Injection Partagée" 
                  fill="#F59E0B"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="injection_complementaire_mwh"
                  name="Injection Réseau" 
                  fill="#8B5CF6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique du groupe si applicable */}
        {userProfile?.groupe && Object.keys(groupData).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-500" />
              Données énergétiques du groupe "{userProfile.groupe}"
            </h3>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(groupData).map(([month, data]: [string, any]) => ({
                    month: format(new Date(month + '-01'), 'MMM', { locale: fr }),
                    'Consommation Partagée': (data.volume_partage / 1000),
                    'Consommation Réseau': (data.volume_complementaire / 1000),
                    'Injection Partagée': (data.injection_partagee / 1000),
                    'Injection Réseau': (data.injection_complementaire / 1000)
                  })).sort((a, b) => a.month.localeCompare(b.month))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month"
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    tickMargin={5}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    tickMargin={5}
                    label={{ value: 'MWh', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [`${value.toFixed(3)} MWh`, '']}
                  />
                  <Legend />
                  
                  <Bar 
                    dataKey="Consommation Partagée" 
                    name="Consommation Partagée (Groupe)" 
                    fill="#8B5CF6"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="Consommation Réseau" 
                    name="Consommation Réseau (Groupe)" 
                    fill="#6366F1"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="Injection Partagée"
                    name="Injection Partagée (Groupe)" 
                    fill="#F59E0B"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="Injection Réseau"
                    name="Injection Réseau (Groupe)" 
                    fill="#10B981"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
      <footer className="bg-gray-100 py-4 text-center text-sm text-gray-500">
        <p>Dernière mise à jour: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
      </footer>
    </div>
  );
}