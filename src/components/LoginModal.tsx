import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { t } = useTranslation();
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          toast.error(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
          setLoading(false);
          return;
        }

        toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
        setIsResetPassword(false);
      } else {
        // Only login is allowed - no account creation
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou mot de passe incorrect. Contactez-nous si vous n\'avez pas encore de compte membre.');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Veuillez confirmer votre email avant de vous connecter.');
          } else {
            toast.error(error.message || 'Erreur de connexion');
          }
          setLoading(false);
          return;
        }

        toast.success('Connexion réussie !');
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('Une erreur inattendue s\'est produite. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const goToResetPassword = () => {
    setIsResetPassword(true);
    setPassword('');
  };

  const goBackToLogin = () => {
    setIsResetPassword(false);
    resetForm();
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (isResetPassword) return 'Réinitialiser le mot de passe';
    return 'Connexion membre';
  };

  const getSubmitText = () => {
    if (loading) {
      if (isResetPassword) return 'Envoi...';
      return 'Connexion...';
    }
    if (isResetPassword) return 'Envoyer le lien';
    return 'Se connecter';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              {isResetPassword && (
                <button
                  onClick={goBackToLogin}
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

          {isResetPassword && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
            </div>
          )}

          {!isResetPassword && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">
                <strong>Accès réservé aux membres.</strong> Si vous n'avez pas encore de compte, contactez-nous pour rejoindre la communauté.
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

            {!isResetPassword && (
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
            {!isResetPassword && (
              <button
                onClick={goToResetPassword}
                className="text-sm text-gray-600 hover:text-gray-800 block"
              >
                Mot de passe oublié ?
              </button>
            )}
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Pas encore membre ?{' '}
                <button
                  onClick={onClose}
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  Contactez-nous pour rejoindre la communauté
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}