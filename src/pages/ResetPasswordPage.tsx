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
      const code = searchParams.get("code");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");
      const urlError = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setIsValidToken(false);
          toast.error(`Lien invalide ou expiré: ${error.message}`);
        } else if (data.session) {
          setIsValidToken(true);
          toast.success("Lien valide ! Vous pouvez maintenant changer votre mot de passe.");
        } else {
          setIsValidToken(false);
          toast.error("Impossible de créer une session");
        }
        setTokenChecked(true);
        return;
      }

      if (urlError) {
        setIsValidToken(false);
        setTokenChecked(true);
        toast.error(`Erreur: ${errorDescription || urlError}`);
        return;
      }

      if (accessToken && refreshToken && type === "recovery") {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          setIsValidToken(false);
          toast.error(`Tokens invalides: ${error.message}`);
        } else if (data.session) {
          setIsValidToken(true);
          toast.success("Lien valide. Vous pouvez maintenant définir un nouveau mot de passe.");
        } else {
          setIsValidToken(false);
          toast.error("Impossible de créer une session de récupération");
        }
      } else {
        setIsValidToken(false);
        toast.error("Aucun code de réinitialisation trouvé dans l'URL.");
      }
    } catch (error: any) {
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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
      } else {
        toast.success("Mot de passe mis à jour avec succès ! Redirection...");
        await supabase.auth.signOut();
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (error: any) {
      toast.error("Une erreur inattendue s'est produite");
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
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-neutral-600">Vérification du lien de réinitialisation...</p>
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
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-brand-flame/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-brand-flame" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Lien invalide ou expiré</h1>
            <p className="text-neutral-600 mb-6">
              Ce lien de réinitialisation est invalide ou a expiré.
              Veuillez demander un nouveau lien de réinitialisation.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-brand-gold/100 hover:bg-brand-gold text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour à l'accueil
              </button>
              <p className="text-sm text-neutral-500">
                Vous pouvez demander un nouveau lien depuis la page de connexion
              </p>
            </div>
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 mb-2 font-sans">Nouveau mot de passe</h1>
            <p className="text-neutral-600 font-sans">Définissez un nouveau mot de passe sécurisé pour votre compte</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 font-sans">Nouveau mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-neutral-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-sans">Minimum 6 caractères</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 font-sans">Confirmer le mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-neutral-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <div className="bg-brand-flame border border-brand-flame rounded-lg p-3">
                <p className="text-sm text-brand-flame font-sans">Les mots de passe ne correspondent pas</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full bg-brand-gold/100 hover:bg-brand-gold text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
            >
              {loading ? "Chargement..." : "Réinitialiser le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
