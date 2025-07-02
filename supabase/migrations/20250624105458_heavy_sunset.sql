/*
  # Add producer participants to the database

  1. New Participants
    - Solar Installation Molenbeek (Producer) - 15.2 kWp, 14,440 kWh/year
    - Rooftop Solar Ixelles (Producer) - 12.8 kWp, 12,160 kWh/year
    - Green Energy Schaerbeek (Producer) - 18.5 kWp, 17,575 kWh/year
    - Community Solar Uccle (Producer) - 10.4 kWp, 9,880 kWh/year

  2. Changes
    - Insert 4 new producer participants across Brussels
    - All participants have realistic production profiles
    - Coordinates correspond to actual Brussels locations
*/

-- Insert new producer participants
INSERT INTO participants (
  name,
  type,
  address,
  peak_power,
  annual_production,
  annual_consumption,
  lat,
  lng
) VALUES 
(
  'Installation Solaire Molenbeek',
  'producer',
  'Rue de la Fonderie 27, 1080 Molenbeek-Saint-Jean',
  15.2,
  14440,
  2500,
  50.8558,
  4.3369
),
(
  'Toiture Solaire Ixelles',
  'producer',
  'Avenue Louise 331, 1050 Ixelles',
  12.8,
  12160,
  1800,
  50.8331,
  4.3681
),
(
  'Énergie Verte Schaerbeek',
  'producer',
  'Boulevard Lambermont 150, 1030 Schaerbeek',
  18.5,
  17575,
  3200,
  50.8671,
  4.3712
),
(
  'Solaire Communautaire Uccle',
  'producer',
  'Chaussée d''Alsemberg 999, 1180 Uccle',
  10.4,
  9880,
  1500,
  50.8171,
  4.3412
);