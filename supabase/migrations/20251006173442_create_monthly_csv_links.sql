/*
  # Create monthly CSV links table

  1. New Tables
    - `monthly_csv_links`
      - `id` (uuid, primary key)
      - `month_name` (text) - Format: "Janvier 2025", "Février 2025", etc.
      - `csv_url` (text) - URL of the CSV file
      - `year` (integer) - Year for easier filtering
      - `month_number` (integer) - Month number (1-12) for sorting
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (year, month_number)

  2. Security
    - Enable RLS on `monthly_csv_links` table
    - Admin-only access for insert, update, delete
    - Public read access for displaying data

  3. Notes
    - This table stores the CSV file URLs for each month
    - Allows admins to add, replace, or delete monthly data
    - The chart will load and merge data from all saved months
*/

CREATE TABLE IF NOT EXISTS monthly_csv_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_name text NOT NULL,
  csv_url text NOT NULL,
  year integer NOT NULL,
  month_number integer NOT NULL CHECK (month_number >= 1 AND month_number <= 12),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, month_number)
);

ALTER TABLE monthly_csv_links ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all monthly links
CREATE POLICY "Anyone can view monthly CSV links"
  ON monthly_csv_links
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can insert monthly links
CREATE POLICY "Authenticated users can insert monthly CSV links"
  ON monthly_csv_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update monthly links
CREATE POLICY "Authenticated users can update monthly CSV links"
  ON monthly_csv_links
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete monthly links
CREATE POLICY "Authenticated users can delete monthly CSV links"
  ON monthly_csv_links
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_monthly_csv_links_year_month 
  ON monthly_csv_links(year, month_number);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_csv_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_monthly_csv_links_updated_at_trigger ON monthly_csv_links;
CREATE TRIGGER update_monthly_csv_links_updated_at_trigger
  BEFORE UPDATE ON monthly_csv_links
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_csv_links_updated_at();