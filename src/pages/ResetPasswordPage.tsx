import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { SEOHead } from '../components/SEOHead';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    checkResetToken();
  }, []);

  const checkResetToken = async () => {
    try {
      // Vérifier si nous avons les paramètres nécessaires
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      const urlError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('🔍 Paramètres URL:', { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        type,
        urlError,
        errorDescription 
      });

      // Vérifier s'il y a une erreur dans l'URL
      if (urlError) {
        console.error('❌ Erreur dans l\'URL:', urlError, errorDescription);
        setIsValidToken(false);
        setTokenChecked(true);
        toast.error(`Erreur: ${errorDescription || urlError}`);
        return;
      }

      if (!accessToken || !refreshToken || type !== 'recovery') {
        console.warn('⚠️ Paramètres manquants ou invalides');
        setIsValidToken(false);
        setTokenChecked(true);
        toast.error('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
        return;
      }

      // Essayer de définir la session avec les tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('❌ Erreur lors de la définition de la session:', error);
        setIsValidToken(false);
        toast.error(`Lien de réinitialisation invalide ou expiré: ${error.message}`);
      } else if (data.session) {
        console.log('✅ Session de récupération établie');
        setIsValidToken(true);
        toast.success('Lien de réinitialisation valide. Vous pouvez maintenant définir un nouveau mot de passe.');
      } else {
        console.warn('⚠️ Aucune session créée');
        setIsValidToken(false);
        toast.error('Impossible de créer une session de récupération');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du token:', error);
      setIsValidToken(false);
      toast.error(`Erreur lors de la vérification du lien: ${error.message}`);
    } finally {
      setTokenChecked(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Erreur mise à jour mot de passe:', error);
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
      } else {
        console.log('✅ Mot de passe mis à jour avec succès');
        toast.success('Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.');
        
        // Rediriger vers la page d'accueil après 2 secondes
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenChecked) {
    return (
      <>
        <SEOHead 
          title="Réinitialisation du mot de passe - Sun Is Up"
          description="Réinitialisez votre mot de passe pour accéder à votre compte membre Sun Is Up"
          noIndex={true}
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification du lien de réinitialisation...</p>
          </div>
        </div>
      </>
    );
  }

  if (isValidToken === false) {
    return (
      <>
        <SEOHead 
          title="Lien invalide - Sun Is Up"
          description="Le lien de réinitialisation est invalide ou a expiré"
          noIndex={true}
        />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lien invalide</h1>
            <p className="text-gray-600 mb-6">
              Ce lien de réinitialisation est invalide ou a expiré. 
              Veuillez demander un nouveau lien de réinitialisation.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Nouveau mot de passe - Sun Is Up"
        description="Définissez votre nouveau mot de passe pour votre compte membre Sun Is Up"
        noIndex={true}
      />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Nouveau mot de passe
            </h1>
            <p className="text-gray-600">
              Définissez un nouveau mot de passe sécurisé pour votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  Les mots de passe ne correspondent pas
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Mettre à jour le mot de passe</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </>
  );
}