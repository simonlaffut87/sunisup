/*
  # Add Ouzerie participant

  1. Changes
    - Insert new consumer participant "Ouzerie"
    - Location: 235 chaussée d'ixelles, 1050 Ixelles
    - Annual consumption: 40 MWh (40,000 kWh)
*/

INSERT INTO participants (
  name,
  type,
  address,
  peak_power,
  annual_production,
  annual_consumption,
  lat,
  lng
) VALUES (
  'Ouzerie',
  'consumer',
  '235 chaussée d''ixelles, 1050 Ixelles',
  0,
  0,
  40000,
  50.8333,
  4.3687
);