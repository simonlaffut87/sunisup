import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowLeft, Hash, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [eanCode, setEanCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check if Supabase is available
    if (!isSupabaseAvailable()) {
      toast.error('Mode hors ligne - la connexion nécessite une configuration Supabase valide');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          toast.error(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
          setLoading(false);
          return;
        }

        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
        setMode('login');
      } else if (mode === 'register') {
        // Vérifier que l'EAN existe dans la base participants
        if (!eanCode || eanCode.length !== 18) {
          toast.error('Veuillez entrer un code EAN valide de 18 chiffres');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères');
          setLoading(false);
          return;
        }

        // Vérifier que l'EAN existe via RPC (accessible en rôle anon)
        const { data: eanCheck, error: participantError } = await supabase
          .rpc('check_ean_exists', { p_ean: eanCode });

        if (eanCheckError) {
          console.error('Erreur lors de la recherche du participant:', eanCheckError);
          toast.error('Erreur lors de la vérification du code EAN. Veuillez réessayer.');
          setLoading(false);
          return;
        }

        if (!eanCheck || eanCheck.exists !== true) {
          toast.error('Code EAN non trouvé dans notre système. Contactez-nous pour être ajouté à la communauté.');
          setLoading(false);
          return;
        }
        if (eanCheck.link_available !== true) {
          toast.error('Ce code EAN est déjà associé à un compte. Utilisez la connexion ou contactez-nous.');
          setLoading(false);
          return;
        }
        const participantId = eanCheck.participant_id as string | undefined;
        const participantName = (eanCheck.name as string | undefined) || '';
        console.log('Participant trouvé:', participantId, participantName, eanCode);
        // Vérifier si le participant a déjà un email associé
        // La vérification "email déjà associé" est gérée côté DB par le trigger/RLS

        console.log('Tentative de création de compte pour:', { email, participantName, eanCode, participantId });

        // Créer le compte utilisateur (avec métadonnées et redirection)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              ean_code: eanCode,
              participant_id: participantId,
              name: participantName || undefined
            }
          }
        });

        if (error) {
          console.error('Erreur création compte:', error);
          
          // Gestion spécifique des erreurs
          if (error.message.includes('User already registered')) {
            toast.error('Un compte existe déjà avec cette adresse email. Si c\'est votre compte, utilisez la connexion. Sinon, contactez-nous.');
          } else if (error.message.includes('Database error saving new user')) {
            toast.error('Erreur de configuration de la base de données. Veuillez contacter le support technique.');
          } else {
            toast.error(`Erreur lors de la création du compte: ${error.message}. Contactez-nous si le problème persiste.`);
          }
          setLoading(false);
          return;
        }

        console.log('Compte créé avec succès:', data);

        // Si l'email doit être confirmé, il n'y aura pas de session immédiate
        if (!data.session) {
          toast.success('Compte créé ! Veuillez confirmer votre email pour finaliser l\'inscription.');
          // La liaison de l'email participant sera effectuée automatiquement à la première connexion
          return;
        }

        // Si session active, lier immédiatement l'email du participant et de son groupe
        console.log('Mise à jour de l\'email du participant et de son groupe...');
        
        // D'abord, récupérer les informations du participant pour connaître son groupe
        const { data: participantInfo, error: participantInfoError } = await supabase
          .from('participants')
          .select('groupe')
          .eq('id', participantId || '')
          .single();

        if (participantInfoError) {
          console.error('Error fetching participant info:', participantInfoError);
          toast.error('Compte créé mais erreur lors de la récupération des informations du participant.');
          setLoading(false);
          return;
        }

        // Si le participant fait partie d'un groupe, mettre à jour l'email pour tous les participants du groupe
        if (participantInfo.groupe) {
          console.log(`Mise à jour de l'email pour tous les participants du groupe: "${participantInfo.groupe}"`);
          
          const { error: groupUpdateError } = await supabase
            .from('participants')
            .update({ email })
            .eq('groupe', participantInfo.groupe)
            .is('email', null);

          if (groupUpdateError) {
            console.error('Error updating group participants email:', groupUpdateError);
            toast.error('Compte créé mais erreur lors de l\'association avec le groupe. Contactez-nous.');
            setLoading(false);
            return;
          }
          
          console.log('Email mis à jour pour tous les participants du groupe');
          toast.success(`Compte créé et associé à tous les participants du groupe "${participantInfo.groupe}".`);
        } else {
          // Pas de groupe, mettre à jour seulement ce participant
          const { error: updateError } = await supabase
            .from('participants')
            .update({ email })
            .eq('id', participantId || '')
            .is('email', null);

          if (updateError) {
            console.error('Error updating participant email:', updateError);
            toast.error('Compte créé mais erreur lors de l\'association avec le participant. Contactez-nous.');
            setLoading(false);
            return;
          }
          
          console.log('Email du participant mis à jour avec succès');
          toast.success('Compte créé et associé au participant.');
        }
        
        onLoginSuccess(data.user);
        onClose();

      } else {
        // Mode login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Login error:', error);
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou mot de passe incorrect. Contactez-nous si vous n\'avez pas encore de compte membre.');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Veuillez confirmer votre email avant de vous connecter.');
          } else if (error.message.includes('invalid_credentials')) {
            toast.error('Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte.');
          } else {
            toast.error(`Erreur de connexion: ${error.message}`);
          }
        } else if (data?.user) {
          toast.success('Connexion réussie !');
          onLoginSuccess(data.user);
          onClose();
        } else {
          toast.error('Erreur de connexion: aucune donnée utilisateur reçue');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message?.includes('No Supabase connection available')) {
        toast.error('Mode hors ligne - la connexion nécessite une configuration Supabase valide');
      } else {
        toast.error(`Une erreur inattendue s'est produite: ${error.message || 'Erreur inconnue'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // const resetForm = () => {
  //   setEmail('');
  //   setPassword('');
  //   setConfirmPassword('');
  //   setEanCode('');
  //   setShowPassword(false);
  //   setShowConfirmPassword(false);
  // };

  const switchMode = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode);
    setPassword('');
    setConfirmPassword('');
    setEanCode('');
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (mode) {
      case 'reset': return 'Réinitialiser le mot de passe';
      case 'register': return 'Créer un compte membre';
      default: return 'Connexion membre';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'reset': return 'Envoi...';
        case 'register': return 'Création...';
        default: return 'Connexion...';
      }
    }
    switch (mode) {
      case 'reset': return 'Envoyer le lien';
      case 'register': return 'Créer le compte';
      default: return 'Se connecter';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {mode !== 'login' && (
                <button
                  onClick={() => switchMode('login')}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold text-gray-900">
                {getTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {mode === 'reset' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
            </div>
          )}

          {mode === 'register' && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Création de compte membre.</strong> Votre code EAN doit être enregistré dans notre système.
              </p>
            </div>
          )}

          {mode === 'login' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Accès réservé aux membres.</strong> Si vous n'avez pas encore de compte, créez-en un avec votre code EAN.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code EAN (18 chiffres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={eanCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 18) {
                        setEanCode(value);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-gray-900 font-mono"
                    placeholder="541448000000000000"
                    maxLength={18}
                    required
                  />
                </div>
                {eanCode && eanCode.length < 18 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {18 - eanCode.length} chiffres restants
                  </p>
                )}
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
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
              </div>
            )}

            {mode === 'register' && (
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
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>{getSubmitText()}</span>
                </>
              ) : (
                getSubmitText()
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {mode === 'login' && (
              <button
                onClick={() => switchMode('reset')}
                className="text-sm text-gray-600 hover:text-gray-800 block"
              >
                Mot de passe oublié ?
              </button>
            )}
            
            {mode === 'login' && (
              <button
                onClick={() => switchMode('register')}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Créer un compte avec mon code EAN
              </button>
            )}
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                {mode === 'register' ? 'Déjà un compte ?' : 'Pas encore membre ?'}{' '}
                <button
                  onClick={mode === 'register' ? () => switchMode('login') : onClose}
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  {mode === 'register' ? 'Se connecter' : 'Contactez-nous pour rejoindre la communauté'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}