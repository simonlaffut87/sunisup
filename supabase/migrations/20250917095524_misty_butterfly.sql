/*
  # Mise à jour des politiques RLS pour la table participants

  1. Suppression des anciennes politiques
     - Supprime toutes les politiques existantes sur la table participants

  2. Nouvelles politiques de sécurité
     - Admin (info@sunisup.be) : Accès complet (SELECT, INSERT, UPDATE, DELETE)
     - Utilisateurs connectés : Lecture uniquement de leurs propres données (email correspondant)
     - Utilisateurs anonymes : Aucun accès

  3. Sécurité renforcée
     - Suppression de l'accès anonyme
     - Restriction des droits d'écriture aux seuls administrateurs
     - Accès utilisateur limité à leurs propres données
*/

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Admin full access" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read access" ON participants;
DROP POLICY IF EXISTS "Allow authenticated delete" ON participants;
DROP POLICY IF EXISTS "Allow authenticated insert" ON participants;
DROP POLICY IF EXISTS "Allow authenticated update" ON participants;
DROP POLICY IF EXISTS "Users can access own participant data" ON participants;

-- Politique admin : accès complet pour info@sunisup.be
CREATE POLICY "Admin full access"
  ON participants
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = 'info@sunisup.be'::text)
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'info@sunisup.be'::text);

-- Politique utilisateurs connectés : lecture de leurs propres données uniquement
CREATE POLICY "Users can read own data"
  ON participants
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'::text));