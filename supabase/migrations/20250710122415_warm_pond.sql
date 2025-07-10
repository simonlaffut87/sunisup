/*
  # Simplifier la table participants

  1. Modifications
    - Rendre les champs techniques optionnels (peak_power, annual_production, annual_consumption, lat, lng)
    - Ces champs ne sont plus requis dans le formulaire mais restent dans la table pour compatibilité

  2. Sécurité
    - Aucun changement aux politiques RLS existantes
*/

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