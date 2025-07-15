/*
  # Mise à jour de la table participants

  1. Ajout de champs
    - Ajout des champs email, ean_code, commodity_rate et entry_date à la table participants
    - Ces champs permettent de stocker les informations utilisateur directement dans la table participants
  
  2. Modifications de contraintes
    - Ajout d'un index unique sur ean_code
    - Ajout d'un index sur email
    - Rendre les champs techniques optionnels
*/

-- Ajouter les nouveaux champs à la table participants
DO $$
BEGIN
  -- Ajouter email si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'email'
  ) THEN
    ALTER TABLE participants ADD COLUMN email text;
  END IF;

  -- Ajouter ean_code si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'ean_code'
  ) THEN
    ALTER TABLE participants ADD COLUMN ean_code text;
  END IF;

  -- Ajouter commodity_rate si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'commodity_rate'
  ) THEN
    ALTER TABLE participants ADD COLUMN commodity_rate numeric;
  END IF;

  -- Ajouter entry_date si n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'entry_date'
  ) THEN
    ALTER TABLE participants ADD COLUMN entry_date date;
  END IF;
END $$;

-- Ajouter un index unique sur ean_code si pas déjà présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'participants' AND indexname = 'participants_ean_code_key'
  ) THEN
    CREATE UNIQUE INDEX participants_ean_code_key ON participants(ean_code) WHERE ean_code IS NOT NULL;
  END IF;
END $$;

-- Ajouter un index sur email si pas déjà présent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'participants' AND indexname = 'idx_participants_email'
  ) THEN
    CREATE INDEX idx_participants_email ON participants(email) WHERE email IS NOT NULL;
  END IF;
END $$;

-- Rendre les champs techniques optionnels
DO $$
BEGIN
  -- Modifier peak_power pour permettre NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'peak_power' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participants ALTER COLUMN peak_power DROP NOT NULL;
    ALTER TABLE participants ALTER COLUMN peak_power SET DEFAULT 0;
  END IF;

  -- Modifier annual_production pour permettre NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'annual_production' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participants ALTER COLUMN annual_production DROP NOT NULL;
    ALTER TABLE participants ALTER COLUMN annual_production SET DEFAULT 0;
  END IF;

  -- Modifier annual_consumption pour permettre NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'annual_consumption' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participants ALTER COLUMN annual_consumption DROP NOT NULL;
    ALTER TABLE participants ALTER COLUMN annual_consumption SET DEFAULT 0;
  END IF;

  -- Modifier lat pour permettre NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'lat' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participants ALTER COLUMN lat DROP NOT NULL;
    ALTER TABLE participants ALTER COLUMN lat SET DEFAULT 50.8503;
  END IF;

  -- Modifier lng pour permettre NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'lng' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE participants ALTER COLUMN lng DROP NOT NULL;
    ALTER TABLE participants ALTER COLUMN lng SET DEFAULT 4.3517;
  END IF;
END $$;

-- Mettre à jour les politiques RLS pour la table participants
DO $$
BEGIN
  -- Supprimer les politiques existantes si elles existent
  DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
  DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
  DROP POLICY IF EXISTS "Allow public read access" ON participants;
  
  -- Créer de nouvelles politiques
  CREATE POLICY "Allow authenticated read" ON participants
    FOR SELECT USING (true);
    
  CREATE POLICY "Allow authenticated insert" ON participants
    FOR INSERT WITH CHECK (true);
    
  CREATE POLICY "Allow authenticated update" ON participants
    FOR UPDATE USING (true);
    
  CREATE POLICY "Allow authenticated delete" ON participants
    FOR DELETE USING (true);
END $$;

-- Mettre à jour les politiques RLS pour la table energy_data
DO $$
BEGIN
  -- Supprimer les politiques existantes si elles existent
  DROP POLICY IF EXISTS "Users can read energy data" ON energy_data;
  DROP POLICY IF EXISTS "Users can insert energy data" ON energy_data;
  DROP POLICY IF EXISTS "Users can update energy data" ON energy_data;
  DROP POLICY IF EXISTS "Admin can delete energy data" ON energy_data;
  
  -- Créer de nouvelles politiques
  CREATE POLICY "Allow authenticated read energy data" ON energy_data
    FOR SELECT USING (true);
    
  CREATE POLICY "Allow authenticated insert energy data" ON energy_data
    FOR INSERT WITH CHECK (true);
    
  CREATE POLICY "Allow authenticated update energy data" ON energy_data
    FOR UPDATE USING (true);
    
  CREATE POLICY "Allow authenticated delete energy data" ON energy_data
    FOR DELETE USING (true);
END $$;

-- Mettre à jour la contrainte de clé étrangère sur energy_data si nécessaire
DO $$
BEGIN
  -- Vérifier si la contrainte existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'energy_data_user_id_fkey' AND table_name = 'energy_data'
  ) THEN
    -- Supprimer la contrainte existante
    ALTER TABLE energy_data DROP CONSTRAINT energy_data_user_id_fkey;
    
    -- Ajouter une nouvelle contrainte qui référence participants
    ALTER TABLE energy_data ADD CONSTRAINT energy_data_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES participants(id) ON DELETE CASCADE;
  END IF;
END $$;