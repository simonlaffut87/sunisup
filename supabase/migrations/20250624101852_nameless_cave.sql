/*
  # Add production data for producer users

  1. Changes
    - Update Pierre Durand to be a producer
    - Add production data to energy_data for producer users
    - Generate realistic production patterns for solar energy

  2. Data Generation
    - Solar production follows sun patterns (peak at midday)
    - Higher production in summer months
    - Weather variations included
*/

-- Update Pierre Durand to be a producer
UPDATE users 
SET member_type = 'producer' 
WHERE email = 'pierre.durand@example.com';

-- Function to generate production data for producers
DO $$
DECLARE
  producer_id uuid;
  current_date_iter date;
  hour_iter integer;
  quarter_iter integer;
  base_production numeric;
  production_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
  random_factor numeric;
  solar_factor numeric;
  seasonal_factor numeric;
  month_num integer;
BEGIN
  -- Get Pierre Durand's user ID
  SELECT id INTO producer_id FROM users WHERE email = 'pierre.durand@example.com';
  
  IF producer_id IS NULL THEN
    RAISE NOTICE 'Producer user not found';
    RETURN;
  END IF;
  
  -- Update existing energy data to include production for this user
  current_date_iter := CURRENT_DATE - INTERVAL '31 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    month_num := EXTRACT(MONTH FROM current_date_iter);
    
    -- Seasonal factor (higher in summer)
    seasonal_factor := CASE 
      WHEN month_num IN (6, 7, 8) THEN 1.3  -- Summer
      WHEN month_num IN (4, 5, 9, 10) THEN 1.0  -- Spring/Autumn
      ELSE 0.6  -- Winter
    END;
    
    -- For each day, update existing records with production data
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      quarter_iter := 0;
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        
        -- Solar production pattern (bell curve centered on noon)
        IF hour_iter BETWEEN 6 AND 18 THEN
          -- Calculate solar factor based on time of day (bell curve)
          solar_factor := EXP(-0.5 * POWER((hour_iter - 12.0) / 4.0, 2));
          
          -- Random weather factor (clouds, etc.)
          random_factor := 0.7 + random() * 0.6; -- Between 0.7 and 1.3
          
          -- Base production (assuming 10kWp installation)
          base_production := 2.5 * solar_factor * seasonal_factor * random_factor;
        ELSE
          base_production := 0; -- No solar production at night
        END IF;
        
        production_value := GREATEST(0, base_production);
        
        -- Shared energy is typically 70-90% of production (some is self-consumed)
        shared_energy_value := production_value * (0.70 + random() * 0.20);
        
        -- Update existing energy_data record
        UPDATE energy_data 
        SET 
          production = production_value,
          shared_energy = shared_energy_value,
          consumption = production_value * 0.15 -- Producers also consume some energy
        WHERE 
          user_id = producer_id 
          AND timestamp = timestamp_value;
        
        quarter_iter := quarter_iter + 1;
      END LOOP;
      
      hour_iter := hour_iter + 1;
    END LOOP;
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Updated production data for producer: %', producer_id;
END $$;