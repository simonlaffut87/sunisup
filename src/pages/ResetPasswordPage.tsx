import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { SEOHead } from "../components/SEOHead";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      console.log("🔍 Vérification du token de réinitialisation...");
      console.log("🔍 URL actuelle:", window.location.href);
      console.log("🔍 Paramètres URL:", window.location.search);
      
      // Récupérer tous les paramètres possibles
      const code = searchParams.get("code");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");
      const urlError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      const tokenHash = searchParams.get("token_hash");
      const tokenType = searchParams.get("token_type");

      console.log("📋 Paramètres URL:", { 
        code: code ? code.substring(0, 8) + '...' : null,
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        type,
        tokenHash: tokenHash ? tokenHash.substring(0, 8) + '...' : null,
        tokenType,
        urlError, 
        errorDescription 
      });

      // Vérifier s'il y a une erreur dans l'URL
      if (urlError) {
        console.error("❌ Erreur dans l'URL:", urlError, errorDescription);
        setIsValidToken(false);
        setTokenChecked(true);
        toast.error(`Erreur: ${errorDescription || urlError}`);
        return;
      }

      // Format moderne avec code (PKCE flow) - le plus courant maintenant
      if (code || tokenHash) {
        const authCode = code || tokenHash;
        console.log("🔄 Utilisation du nouveau format avec code...");
        console.log("🔍 Code utilisé:", authCode ? authCode.substring(0, 8) + '...' : 'null');
        
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          
          if (exchangeError) {
            console.error("❌ Erreur échange code:", exchangeError);
            console.error("❌ Détails erreur:", exchangeError);
            setIsValidToken(false);
            
            // Messages d'erreur plus spécifiques
            if (exchangeError.message.includes('invalid_grant')) {
              toast.error("Le lien de réinitialisation a expiré ou a déjà été utilisé. Demandez un nouveau lien.");
            } else if (exchangeError.message.includes('invalid_request')) {
              toast.error("Format de lien invalide. Vérifiez que vous avez copié le lien complet.");
            } else {
              toast.error(`Lien invalide: ${exchangeError.message}`);
            }
          } else if (data.session) {
            console.log("✅ Session établie via code");
            console.log("✅ Utilisateur:", data.user?.email);
            setIsValidToken(true);
            toast.success("Lien valide. Vous pouvez maintenant définir un nouveau mot de passe.");
          } else {
            console.warn("⚠️ Aucune session créée");
            setIsValidToken(false);
            toast.error("Impossible de créer une session de récupération");
          }
        } catch (error) {
          console.error("❌ Exception lors de l'échange du code:", error);
          setIsValidToken(false);
          toast.error(`Erreur technique: ${error.message}. Contactez le support si le problème persiste.`);
        }
      }
      // Ancien format avec access_token et refresh_token
      else if (accessToken && refreshToken && type === "recovery") {
        console.log("🔄 Utilisation de l'ancien format avec tokens...");
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error("❌ Erreur session:", sessionError);
            setIsValidToken(false);
            toast.error(`Tokens invalides: ${sessionError.message}`);
          } else if (data.session) {
            console.log("✅ Session établie via tokens");
            setIsValidToken(true);
            toast.success("Lien valide. Vous pouvez maintenant définir un nouveau mot de passe.");
          } else {
            console.warn("⚠️ Aucune session créée");
            setIsValidToken(false);
            toast.error("Impossible de créer une session de récupération");
          }
        } catch (error) {
          console.error("❌ Exception lors de la définition de session:", error);
          setIsValidToken(false);
          toast.error(`Erreur lors de la vérification: ${error.message}`);
        }
      }
      // Aucun paramètre valide trouvé
      else {
        console.warn("⚠️ Aucun paramètre de récupération valide trouvé");
        console.warn("⚠️ URL complète:", window.location.href);
        setIsValidToken(false);
        toast.error("Lien de réinitialisation invalide ou incomplet. Vérifiez que vous avez cliqué sur le lien complet depuis votre email.");
      }

    } catch (error) {
      console.error("❌ Erreur générale lors de la vérification:", error);
      setIsValidToken(false);
      toast.error(`Erreur lors de la vérification du lien: ${error.message}`);
    } finally {
      setTokenChecked(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      console.log("🔄 Mise à jour du mot de passe...");
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("❌ Erreur mise à jour mot de passe:", updateError);
        toast.error(`Erreur lors de la mise à jour: ${updateError.message}`);
      } else {
        console.log("✅ Mot de passe mis à jour avec succès");
        toast.success("Mot de passe mis à jour avec succès ! Redirection vers l'accueil...");
        
        // Déconnexion pour forcer une nouvelle connexion
        await supabase.auth.signOut();
        
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Exception:", error);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
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

  // Invalid token state
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lien invalide ou expiré</h1>
            <p className="text-gray-600 mb-6">
              Ce lien de réinitialisation est invalide ou a expiré.
              Veuillez demander un nouveau lien de réinitialisation.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour à l'accueil
              </button>
              <p className="text-sm text-gray-500">
                Vous pouvez demander un nouveau lien depuis la page de connexion
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Valid token - show password reset form
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>
            <p className="text-gray-600">Définissez un nouveau mot de passe sécurisé pour votre compte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Champ mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
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
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            {/* Champ confirmation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
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
                <p className="text-sm text-red-700">Les mots de passe ne correspondent pas</p>
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
              onClick={() => navigate("/")}
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