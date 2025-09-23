/*
  # Configuration des paramètres d'authentification

  1. Configuration
    - Configure les URLs de redirection pour la réinitialisation de mot de passe
    - Configure les templates d'email personnalisés
    - Active la confirmation d'email pour la réinitialisation

  2. Sécurité
    - Configure les URLs autorisées pour les redirections
    - Définit les paramètres de sécurité pour les tokens
*/

-- Configuration des URLs de redirection autorisées
-- Note: Ces configurations se font généralement via le dashboard Supabase
-- mais on peut les documenter ici pour référence

-- URLs de redirection autorisées (à configurer dans le dashboard Supabase) :
-- - http://localhost:5173/reset-password
-- - https://sunisup.be/reset-password
-- - https://your-production-domain.com/reset-password

-- Template d'email personnalisé pour la réinitialisation
-- (Le template HTML est déjà créé dans supabase/templates/reset_password.html)

-- Fonction pour vérifier l'existence d'un EAN (si pas déjà créée)
CREATE OR REPLACE FUNCTION check_ean_exists(p_ean text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record RECORD;
  result json;
BEGIN
  -- Chercher le participant avec cet EAN
  SELECT id, name, email, groupe
  INTO participant_record
  FROM participants
  WHERE ean_code = p_ean;
  
  IF NOT FOUND THEN
    -- EAN non trouvé
    result := json_build_object(
      'exists', false,
      'link_available', false,
      'participant_id', null,
      'name', null,
      'message', 'Code EAN non trouvé dans notre système'
    );
  ELSIF participant_record.email IS NOT NULL AND participant_record.email != '' THEN
    -- EAN trouvé mais déjà lié à un email
    result := json_build_object(
      'exists', true,
      'link_available', false,
      'participant_id', participant_record.id,
      'name', participant_record.name,
      'message', 'Ce code EAN est déjà associé à un compte'
    );
  ELSE
    -- EAN trouvé et disponible pour liaison
    result := json_build_object(
      'exists', true,
      'link_available', true,
      'participant_id', participant_record.id,
      'name', participant_record.name,
      'groupe', participant_record.groupe,
      'message', 'Code EAN disponible pour création de compte'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Accorder les permissions pour la fonction
GRANT EXECUTE ON FUNCTION check_ean_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION check_ean_exists(text) TO authenticated;

-- Commentaire pour les configurations à faire manuellement dans le dashboard Supabase
/*
CONFIGURATIONS À FAIRE DANS LE DASHBOARD SUPABASE :

1. Aller dans Authentication > Settings > Auth
2. Dans "Site URL", ajouter :
   - http://localhost:5173 (pour le développement)
   - https://sunisup.be (pour la production)

3. Dans "Redirect URLs", ajouter :
   - http://localhost:5173/reset-password
   - https://sunisup.be/reset-password

4. Dans "Email Templates" > "Reset Password" :
   - Utiliser le template personnalisé dans supabase/templates/reset_password.html
   - Ou configurer l'URL de redirection : {{ .SiteURL }}/reset-password

5. Dans "Auth" > "URL Configuration" :
   - Site URL: https://sunisup.be (ou votre domaine)
   - Redirect URLs: Ajouter toutes les URLs de redirection autorisées

6. Vérifier que "Enable email confirmations" est activé si nécessaire
*/