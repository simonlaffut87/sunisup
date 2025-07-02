/*
  # Générer des données de production pour test.producer@sunisup.be

  1. Données de production
    - Installation solaire de 12 kWp
    - Production réaliste basée sur les heures d'ensoleillement
    - Variations saisonnières et météorologiques
    - Autoconsommation et injection réseau

  2. Profil de production
    - Production maximale entre 11h et 15h
    - Variations selon la saison (été/hiver)
    - Facteurs météorologiques simulés
    - Autoconsommation du producteur
*/

DO $$
DECLARE
  producer_user_id uuid;
  current_date_iter date;
  hour_iter integer;
  quarter_iter integer;
  base_production numeric;
  production_value numeric;
  consumption_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
  solar_factor numeric;
  seasonal_factor numeric;
  weather_factor numeric;
  cloud_factor numeric;
  month_num integer;
  day_of_week integer;
  is_weekend boolean;
  data_points_count integer := 0;
  peak_power numeric := 12; -- 12 kWp installation
BEGIN
  -- Get the producer test user ID
  SELECT id INTO producer_user_id 
  FROM auth.users 
  WHERE email = 'test.producer@sunisup.be';
  
  IF producer_user_id IS NULL THEN
    RAISE NOTICE 'User test.producer@sunisup.be not found. Please create the user first.';
    RETURN;
  END IF;
  
  -- Delete existing energy data for this user
  DELETE FROM energy_data WHERE user_id = producer_user_id;
  
  RAISE NOTICE 'Generating production data for test.producer@sunisup.be (User ID: %)', producer_user_id;
  RAISE NOTICE 'Solar installation: % kWp', peak_power;
  
  -- Generate data for the last 31 days
  current_date_iter := CURRENT_DATE - INTERVAL '31 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    -- Get day characteristics
    day_of_week := EXTRACT(DOW FROM current_date_iter);
    is_weekend := day_of_week = 0 OR day_of_week = 6;
    month_num := EXTRACT(MONTH FROM current_date_iter);
    
    -- Seasonal factor for solar production (Belgium climate)
    seasonal_factor := CASE 
      WHEN month_num IN (6, 7, 8) THEN 1.3      -- Summer: high sun, long days
      WHEN month_num IN (4, 5, 9, 10) THEN 1.0  -- Spring/Autumn: moderate
      WHEN month_num IN (3, 11) THEN 0.7        -- Late winter/early winter
      WHEN month_num IN (12, 1, 2) THEN 0.5     -- Winter: low sun, short days
      ELSE 1.0
    END;
    
    -- Daily weather factor (simulates cloud cover, rain, etc.)
    weather_factor := 0.6 + random() * 0.7; -- Between 0.6 and 1.3
    
    -- Some days are particularly cloudy
    IF random() < 0.15 THEN -- 15% chance of very cloudy day
      cloud_factor := 0.3 + random() * 0.4; -- 30-70% of normal production
    ELSE
      cloud_factor := 0.8 + random() * 0.4; -- 80-120% of normal production
    END IF;
    
    -- Generate 96 data points per day (24 hours * 4 quarters)
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      quarter_iter := 0;
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        
        -- Solar production pattern (bell curve centered around noon)
        IF hour_iter BETWEEN 6 AND 18 THEN
          -- Calculate solar irradiance factor (bell curve)
          -- Peak at 12:00, declining towards sunrise/sunset
          solar_factor := EXP(-0.5 * POWER((hour_iter + (quarter_iter * 0.25) - 12.0) / 4.5, 2));
          
          -- Adjust for seasonal daylight hours
          IF month_num IN (12, 1, 2) THEN
            -- Winter: shorter days, lower angle
            IF hour_iter < 8 OR hour_iter > 16 THEN
              solar_factor := solar_factor * 0.3;
            END IF;
          ELSIF month_num IN (6, 7, 8) THEN
            -- Summer: longer days, higher angle
            IF hour_iter >= 5 AND hour_iter <= 19 THEN
              solar_factor := solar_factor * 1.1;
            END IF;
          END IF;
          
          -- Calculate base production (kW at this moment)
          -- Peak power * solar factor * efficiency factors
          base_production := peak_power * solar_factor * seasonal_factor * weather_factor * cloud_factor;
          
          -- Add some random variation for micro-weather effects
          production_value := base_production * (0.9 + random() * 0.2); -- ±10% variation
          
          -- Ensure non-negative production
          production_value := GREATEST(0, production_value);
          
        ELSE
          -- No solar production at night
          production_value := 0;
        END IF;
        
        -- Producer's own consumption (they also use electricity)
        -- Residential pattern but slightly different (home during day for monitoring)
        IF hour_iter BETWEEN 7 AND 9 THEN
          -- Morning routine
          consumption_value := 1.8 + random() * 1.2;
        ELSIF hour_iter BETWEEN 12 AND 14 THEN
          -- Lunch time (home to check solar production)
          consumption_value := 2.2 + random() * 1.0;
        ELSIF hour_iter BETWEEN 17 AND 22 THEN
          -- Evening peak
          consumption_value := 2.8 + random() * 1.5;
        ELSIF hour_iter >= 23 OR hour_iter <= 6 THEN
          -- Night
          consumption_value := 0.5 + random() * 0.3;
        ELSE
          -- Rest of day
          consumption_value := 1.0 + random() * 0.8;
        END IF;
        
        -- Weekend adjustment (more time at home)
        IF is_weekend THEN
          consumption_value := consumption_value * 1.2;
        END IF;
        
        -- Calculate shared energy (injection into grid)
        -- This is production minus self-consumption
        shared_energy_value := GREATEST(0, production_value - consumption_value);
        
        -- If consumption exceeds production, they draw from grid
        -- In this case, shared_energy represents what they get from community
        IF production_value < consumption_value THEN
          -- They need energy from the grid/community
          -- Community can provide some of their needs during sunny hours
          IF hour_iter BETWEEN 9 AND 17 THEN
            shared_energy_value := (consumption_value - production_value) * (0.3 + random() * 0.4); -- 30-70% from community
          ELSE
            shared_energy_value := (consumption_value - production_value) * (0.1 + random() * 0.2); -- 10-30% from community
          END IF;
          shared_energy_value := LEAST(shared_energy_value, consumption_value - production_value);
        END IF;
        
        -- Insert the data point
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (producer_user_id, timestamp_value, consumption_value, shared_energy_value, production_value);
        
        data_points_count := data_points_count + 1;
        quarter_iter := quarter_iter + 1;
      END LOOP;
      
      hour_iter := hour_iter + 1;
    END LOOP;
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Successfully generated % energy data points for test.producer@sunisup.be', data_points_count;
  RAISE NOTICE 'Data covers 31 days with quarter-hourly measurements';
  RAISE NOTICE 'Production pattern: 12 kWp solar installation with realistic seasonal variations';
  RAISE NOTICE 'Includes autoconsommation and grid injection patterns';
  RAISE NOTICE 'Weather variations: cloudy days, seasonal factors, and daily irradiance curves';
END $$;