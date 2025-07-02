/*
  # Create admin account and mock users with energy data

  1. New Tables
    - Creates admin user and test users in auth.users
    - Generates realistic energy consumption data for 30 days
    - Each user has different consumption patterns based on their profile

  2. Users Created
    - Admin: info@sunisup.be (password: admin)
    - Test users with various consumption profiles
    - 30 days of quarter-hourly energy data for each user

  3. Security
    - Uses proper password hashing
    - Generates realistic consumption patterns
    - Includes shared energy calculations
*/

-- Fonction pour créer des utilisateurs avec mot de passe
CREATE OR REPLACE FUNCTION create_user_with_password(email text, password text, user_name text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN
  -- Générer un ID utilisateur
  user_id := gen_random_uuid();
  
  -- Créer l'utilisateur dans auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', user_name),
    false,
    '',
    '',
    '',
    ''
  );
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le compte admin et les utilisateurs fictifs
DO $$
DECLARE
  admin_id uuid;
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  user4_id uuid;
  user5_id uuid;
  current_date_iter date;
  hour_iter integer;
  quarter_iter integer;
  base_consumption numeric;
  consumption_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
BEGIN
  -- Créer le compte admin
  admin_id := create_user_with_password('info@sunisup.be', 'admin', 'Administrateur Sun Is Up');
  
  -- Créer des utilisateurs fictifs
  user1_id := create_user_with_password('marie.dupont@example.com', 'password123', 'Marie Dupont');
  user2_id := create_user_with_password('jean.martin@example.com', 'password123', 'Jean Martin');
  user3_id := create_user_with_password('sophie.bernard@example.com', 'password123', 'Sophie Bernard');
  user4_id := create_user_with_password('pierre.durand@example.com', 'password123', 'Pierre Durand');
  user5_id := create_user_with_password('claire.moreau@example.com', 'password123', 'Claire Moreau');
  
  -- Générer des données d'énergie pour les 30 derniers jours
  current_date_iter := CURRENT_DATE - INTERVAL '30 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    -- Pour chaque jour, générer 96 points de données (24h * 4 quarts d'heure)
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      quarter_iter := 0;
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        
        -- Données pour Marie Dupont (profil résidentiel)
        base_consumption := CASE 
          WHEN hour_iter BETWEEN 6 AND 9 THEN 3.5 + random() * 2  -- Matin
          WHEN hour_iter BETWEEN 17 AND 22 THEN 4.2 + random() * 2.5  -- Soir
          WHEN hour_iter >= 23 OR hour_iter <= 5 THEN 0.8 + random() * 0.5  -- Nuit
          ELSE 1.5 + random() * 1  -- Journée
        END;
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.25 + random() * 0.15);  -- 25-40% partagé
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user1_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- Données pour Jean Martin (profil commercial - boulangerie)
        base_consumption := CASE 
          WHEN hour_iter BETWEEN 4 AND 12 THEN 8 + random() * 4  -- Activité matinale intense
          WHEN hour_iter BETWEEN 13 AND 18 THEN 5 + random() * 2  -- Après-midi modéré
          ELSE 2 + random() * 1  -- Soir/nuit
        END;
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.30 + random() * 0.20);  -- 30-50% partagé
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user2_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- Données pour Sophie Bernard (profil bureau)
        base_consumption := CASE 
          WHEN hour_iter BETWEEN 8 AND 18 THEN 6 + random() * 3  -- Heures de bureau
          WHEN hour_iter BETWEEN 19 AND 22 THEN 2 + random() * 1  -- Soirée
          ELSE 1 + random() * 0.5  -- Nuit
        END;
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.35 + random() * 0.15);  -- 35-50% partagé
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user3_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- Données pour Pierre Durand (profil industriel - atelier)
        base_consumption := CASE 
          WHEN hour_iter BETWEEN 7 AND 17 THEN 12 + random() * 6  -- Heures de travail
          WHEN hour_iter BETWEEN 18 AND 20 THEN 4 + random() * 2  -- Nettoyage
          ELSE 2 + random() * 1  -- Veille
        END;
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.20 + random() * 0.25);  -- 20-45% partagé
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user4_id, timestamp_value, consumption_value, shared_energy_value);
        
        -- Données pour Claire Moreau (profil café/restaurant)
        base_consumption := CASE 
          WHEN hour_iter BETWEEN 6 AND 11 THEN 7 + random() * 3  -- Service petit-déjeuner
          WHEN hour_iter BETWEEN 11 AND 15 THEN 10 + random() * 4  -- Service déjeuner
          WHEN hour_iter BETWEEN 17 AND 23 THEN 9 + random() * 3  -- Service dîner
          ELSE 2 + random() * 1  -- Fermeture
        END;
        consumption_value := base_consumption;
        shared_energy_value := consumption_value * (0.28 + random() * 0.17);  -- 28-45% partagé
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy)
        VALUES (user5_id, timestamp_value, consumption_value, shared_energy_value);
        
        quarter_iter := quarter_iter + 1;
      END LOOP;
      hour_iter := hour_iter + 1;
    END LOOP;
    current_date_iter := current_date_iter + 1;
  END LOOP;
  
  RAISE NOTICE 'Compte admin créé: info@sunisup.be / admin';
  RAISE NOTICE 'Utilisateurs fictifs créés avec données d''énergie pour 30 jours';
END $$;

-- Nettoyer la fonction temporaire
DROP FUNCTION create_user_with_password(text, text, text);