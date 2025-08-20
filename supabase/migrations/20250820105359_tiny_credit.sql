/*
  # Ajout de la colonne billing_data pour la facturation

  1. Modifications
    - Ajouter la colonne `billing_data` à la table `participants`
    - Cette colonne stockera les données de facturation au format JSON

  2. Structure des données de facturation
    - Informations client (nom, adresse, EAN, etc.)
    - Coûts réseau (utilisation réseau, surcharges, tarifs, etc.)
    - Données mensuelles de consommation et production
    - Calculs de facturation
*/

-- Ajouter la colonne billing_data à la table participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'billing_data'
  ) THEN
    ALTER TABLE participants ADD COLUMN billing_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Créer un index pour optimiser les requêtes sur billing_data
CREATE INDEX IF NOT EXISTS idx_participants_billing_data 
ON participants USING gin (billing_data);

-- Commentaire sur la colonne
COMMENT ON COLUMN participants.billing_data IS 'Données de facturation au format JSON incluant les coûts réseau et informations de facturation';