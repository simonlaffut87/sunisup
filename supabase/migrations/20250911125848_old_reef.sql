/*
  # Correction des permissions RLS pour les administrateurs

  1. Politiques mises à jour
    - Lecture : Accessible à tous (anon + authenticated)
    - Écriture : Tous droits pour les utilisateurs authentifiés
    - Suppression : Autorisée pour les utilisateurs authentifiés
    - Mise à jour : Autorisée pour les utilisateurs authentifiés

  2. Sécurité
    - Les utilisateurs non-connectés peuvent seulement lire
    - Les utilisateurs connectés ont tous les droits (admin ou membre)
*/

-- Supprimer toutes les politiques existantes pour repartir sur une base propre
DROP POLICY IF EXISTS "participants_allow_anonymous_read" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_insert" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_update" ON participants;
DROP POLICY IF EXISTS "participants_allow_authenticated_delete" ON participants;

-- Politique de lecture : accessible à tous
CREATE POLICY "Allow read access to all users"
  ON participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Politique d'insertion : utilisateurs authentifiés seulement
CREATE POLICY "Allow insert for authenticated users"
  ON participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique de mise à jour : utilisateurs authentifiés seulement
CREATE POLICY "Allow update for authenticated users"
  ON participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique de suppression : utilisateurs authentifiés seulement
CREATE POLICY "Allow delete for authenticated users"
  ON participants
  FOR DELETE
  TO authenticated
  USING (true);

-- Vérifier que RLS est bien activé
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;