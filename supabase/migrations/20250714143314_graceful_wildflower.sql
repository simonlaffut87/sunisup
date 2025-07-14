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