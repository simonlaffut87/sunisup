/*
  # Add contact requests tracking

  1. New Tables
    - `contact_requests`
      - `id` (uuid, primary key)
      - `email` (text)
      - `message` (text)
      - `has_bill` (boolean)
      - `has_meter_photo` (boolean)
      - `has_additional_doc` (boolean)
      - `email_sent` (boolean)
      - `email_id` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `contact_requests` table
    - Add policies for authenticated users
*/

CREATE TABLE contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text NOT NULL,
  has_bill boolean DEFAULT false,
  has_meter_photo boolean DEFAULT false,
  has_additional_doc boolean DEFAULT false,
  email_sent boolean DEFAULT false,
  email_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
  ON contact_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read"
  ON contact_requests
  FOR SELECT
  TO authenticated
  USING (true);