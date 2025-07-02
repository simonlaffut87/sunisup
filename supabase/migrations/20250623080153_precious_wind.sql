/*
  # Add new participants to Brussels energy community

  1. New Participants
    - Café du Square Coghen (Uccle) - Consumer, 28,000 kWh/year
    - Bureau Avenue Georges Henry (Woluwe-Saint-Lambert) - Consumer, 32,000 kWh/year
    - Commerce Herman Debroux (Auderghem) - Consumer, 38,000 kWh/year
    - Atelier Anderlecht (Anderlecht) - Consumer, 42,000 kWh/year

  2. Changes
    - Insert 4 new consumer participants across Brussels
    - All participants have realistic consumption profiles
    - Coordinates correspond to actual Brussels locations
*/

-- Insert new participants
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
  'Café du Square Coghen',
  'consumer',
  'Square Coghen 12, 1180 Uccle',
  0,
  0,
  28000,
  50.8089,
  4.3456
),
(
  'Bureau Avenue Georges Henry',
  'consumer',
  'Avenue Georges Henry 85, 1200 Woluwe-Saint-Lambert',
  0,
  0,
  32000,
  50.8456,
  4.4123
),
(
  'Commerce Herman Debroux',
  'consumer',
  'Boulevard du Souverain 280, 1160 Auderghem',
  0,
  0,
  38000,
  50.8156,
  4.4089
),
(
  'Atelier Anderlecht',
  'consumer',
  'Rue de Birmingham 45, 1070 Anderlecht',
  0,
  0,
  42000,
  50.8367,
  4.3089
);