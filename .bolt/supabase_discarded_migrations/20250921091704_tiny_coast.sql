/*
  # Configuration des templates d'email d'authentification

  1. Configuration
    - Template d'email de réinitialisation de mot de passe personnalisé
    - Redirection vers la page de réinitialisation de l'application
    - Messages en français pour les utilisateurs belges

  2. Sécurité
    - Liens avec expiration de 24h
    - Tokens sécurisés
    - Validation côté client et serveur
*/

-- Configuration du template d'email de réinitialisation
UPDATE auth.config 
SET 
  site_url = 'https://sunisup.be',
  uri_allow_list = 'https://sunisup.be,https://sunisup.be/**,http://localhost:5173,http://localhost:5173/**'
WHERE true;

-- Mise à jour des templates d'email (si la table existe)
DO $$
BEGIN
  -- Vérifier si la table auth.email_templates existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'email_templates'
  ) THEN
    
    -- Template de réinitialisation de mot de passe
    INSERT INTO auth.email_templates (template_name, subject, body_html, body_text)
    VALUES (
      'recovery',
      'Réinitialisation de votre mot de passe - Sun Is Up',
      '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de votre mot de passe - Sun Is Up</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        .title { color: #F59E0B; font-size: 28px; font-weight: bold; margin: 0; }
        .subtitle { color: #6B7280; margin: 5px 0 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0; }
        .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0; color: #92400E; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">☀️</div>
            <h1 class="title">Sun Is Up</h1>
            <p class="subtitle">Communauté d''énergie bruxelloise</p>
        </div>
        <div class="content">
            <h2>Réinitialisation de votre mot de passe</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte membre Sun Is Up.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .SiteURL }}/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery" class="button">
                    🔐 Réinitialiser mon mot de passe
                </a>
            </div>
            <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien est valide pendant 24 heures et ne peut être utilisé qu''une seule fois.
            </div>
            <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #F3F4F6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px;">
                {{ .SiteURL }}/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery
            </p>
        </div>
        <div class="footer">
            <p><strong>Sun Is Up ASBL</strong><br>info@sunisup.be | +32 471 31 71 48</p>
        </div>
    </div>
</body>
</html>',
      'Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte membre Sun Is Up.

Cliquez sur ce lien pour définir un nouveau mot de passe :
{{ .SiteURL }}/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery

Ce lien est valide pendant 24 heures et ne peut être utilisé qu''une seule fois.

Si vous n''avez pas demandé cette réinitialisation, ignorez cet email.

---
Sun Is Up ASBL
Communauté d''énergie bruxelloise
info@sunisup.be | +32 471 31 71 48'
    )
    ON CONFLICT (template_name) 
    DO UPDATE SET
      subject = EXCLUDED.subject,
      body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text,
      updated_at = now();

    -- Template de confirmation d'email
    INSERT INTO auth.email_templates (template_name, subject, body_html, body_text)
    VALUES (
      'confirmation',
      'Confirmez votre compte membre - Sun Is Up',
      '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmez votre compte - Sun Is Up</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; }
        .container { background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        .title { color: #F59E0B; font-size: 28px; font-weight: bold; margin: 0; }
        .subtitle { color: #6B7280; margin: 5px 0 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">☀️</div>
            <h1 class="title">Sun Is Up</h1>
            <p class="subtitle">Communauté d''énergie bruxelloise</p>
        </div>
        <div class="content">
            <h2>Bienvenue dans la communauté !</h2>
            <p>Bonjour,</p>
            <p>Merci de rejoindre Sun Is Up ! Pour finaliser la création de votre compte membre, veuillez confirmer votre adresse email :</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" class="button">
                    ✅ Confirmer mon email
                </a>
            </div>
            <p>Après confirmation, vous pourrez accéder à votre dashboard personnel pour suivre vos données énergétiques.</p>
        </div>
        <div class="footer">
            <p><strong>Sun Is Up ASBL</strong><br>info@sunisup.be | +32 471 31 71 48</p>
        </div>
    </div>
</body>
</html>',
      'Bienvenue dans la communauté Sun Is Up !

Pour finaliser la création de votre compte membre, veuillez confirmer votre adresse email en cliquant sur ce lien :

{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email

Après confirmation, vous pourrez accéder à votre dashboard personnel.

---
Sun Is Up ASBL
info@sunisup.be | +32 471 31 71 48'
    )
    ON CONFLICT (template_name) 
    DO UPDATE SET
      subject = EXCLUDED.subject,
      body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text,
      updated_at = now();

  ELSE
    -- Si la table n'existe pas, on ne peut pas configurer les templates
    RAISE NOTICE 'Table auth.email_templates not found - email templates cannot be configured';
  END IF;
END $$;