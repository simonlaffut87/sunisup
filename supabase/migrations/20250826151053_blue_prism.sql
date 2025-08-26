/*
  # Ajouter colonne prix énergie partagée

  1. Modifications de table
    - Ajouter `shared_energy_price` à la table `participants`
      - Type: numeric (pour les prix en €/MWh)
      - Valeur par défaut: 100 (€/MWh)
      - Nullable: true

  2. Notes
    - Cette colonne permettra de personnaliser le prix de l'énergie partagée par participant
    - Valeur par défaut de 100 €/MWh alignée avec le commodity_rate existant
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'shared_energy_price'
  ) THEN
    ALTER TABLE participants ADD COLUMN shared_energy_price numeric DEFAULT 100;
  END IF;
END $$;