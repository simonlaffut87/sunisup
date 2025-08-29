import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UseAutoLogoutProps {
  onLogout: () => void;
  timeoutMinutes?: number;
  isLoggedIn: boolean;
}

export function useAutoLogout({ 
  onLogout, 
  timeoutMinutes = 15, 
  isLoggedIn 
}: UseAutoLogoutProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const TIMEOUT_MS = timeoutMinutes * 60 * 1000; // 15 minutes en millisecondes
  const WARNING_MS = TIMEOUT_MS - (2 * 60 * 1000); // Avertissement 2 minutes avant

  // Fonction pour réinitialiser le timer
  const resetTimer = useCallback(() => {
    if (!isLoggedIn) return;

    lastActivityRef.current = Date.now();

    // Nettoyer les timers existants
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Timer d'avertissement (2 minutes avant déconnexion)
    warningTimeoutRef.current = setTimeout(() => {
      if (!isLoggedIn) return;
      
      const shouldLogout = confirm(
        '⚠️ Session d\'inactivité détectée\n\n' +
        'Vous serez automatiquement déconnecté dans 2 minutes pour des raisons de sécurité.\n\n' +
        'Cliquez sur "OK" pour rester connecté ou "Annuler" pour vous déconnecter maintenant.'
      );

      if (!shouldLogout) {
        // L'utilisateur veut se déconnecter maintenant
        handleLogout();
      } else {
        // L'utilisateur veut rester connecté, on remet le timer
        resetTimer();
      }
    }, WARNING_MS);

    // Timer de déconnexion automatique
    timeoutRef.current = setTimeout(() => {
      if (!isLoggedIn) return;
      handleLogout();
    }, TIMEOUT_MS);
  }, [isLoggedIn, TIMEOUT_MS, WARNING_MS]);

  // Fonction de déconnexion sécurisée
  const handleLogout = useCallback(async () => {
    try {
      // Nettoyer les timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }

      // Afficher un message informatif
      alert('🔒 Déconnexion automatique\n\nVous avez été déconnecté automatiquement après 15 minutes d\'inactivité pour protéger votre compte.');

      // Déconnexion complète
      await supabase.auth.signOut({ scope: 'global' });
      
      // Nettoyer le stockage local
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      sessionStorage.clear();
      
      // Appeler la fonction de déconnexion
      onLogout();
      
    } catch (error) {
      console.error('Error during auto-logout:', error);
      // Même en cas d'erreur, forcer la déconnexion locale
      onLogout();
    }
  }, [onLogout]);

  // Fonction pour détecter l'activité utilisateur
  const handleUserActivity = useCallback(() => {
    if (!isLoggedIn) return;
    resetTimer();
  }, [resetTimer, isLoggedIn]);

  // Événements à surveiller pour détecter l'activité
  const activityEvents = [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'focus'
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      // Nettoyer les timers si l'utilisateur n'est pas connecté
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      return;
    }

    // Démarrer le timer initial
    resetTimer();

    // Ajouter les écouteurs d'événements
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Surveiller les changements de visibilité de la page
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée - ne pas réinitialiser le timer
        return;
      } else {
        // Page visible - réinitialiser le timer
        handleUserActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Surveiller les changements de focus de la fenêtre
    const handleWindowFocus = () => {
      if (!document.hidden) {
        handleUserActivity();
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    // Nettoyage
    return () => {
      // Supprimer les écouteurs d'événements
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);

      // Nettoyer les timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [isLoggedIn, handleUserActivity, resetTimer]);

  // Fonction pour obtenir le temps restant (utile pour debug)
  const getTimeRemaining = useCallback(() => {
    if (!isLoggedIn || !lastActivityRef.current) return 0;
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, TIMEOUT_MS - elapsed);
  }, [isLoggedIn, TIMEOUT_MS]);

  return {
    resetTimer,
    getTimeRemaining,
    isActive: isLoggedIn && timeoutRef.current !== null
  };
}