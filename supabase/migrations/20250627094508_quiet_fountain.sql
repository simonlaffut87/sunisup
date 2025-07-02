/*
  # Generate comprehensive test data for test.consumer@sunisup.be

  1. Changes
    - Generate 31 days of quarter-hourly energy data (2976 data points)
    - Realistic residential consumption patterns
    - Varied consumption based on time of day, day of week, and weather simulation
    - Shared energy calculations based on community availability

  2. Data Pattern
    - Higher consumption during morning (6-9h) and evening (17-22h) peaks
    - Lower consumption during day and night
    - Weekend variations
    - Random weather/usage factors for realism
*/

DO $$
DECLARE
  test_user_id uuid;
  current_date_iter date;
  hour_iter integer;
  quarter_iter integer;
  base_consumption numeric;
  consumption_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
  random_factor numeric;
  day_of_week integer;
  is_weekend boolean;
  weather_factor numeric;
  seasonal_factor numeric;
  month_num integer;
  data_points_count integer := 0;
BEGIN
  -- Get the test user ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'test.consumer@sunisup.be';
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'User test.consumer@sunisup.be not found. Please create the user first.';
    RETURN;
  END IF;
  
  -- Delete existing energy data for this user
  DELETE FROM energy_data WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Generating energy data for test.consumer@sunisup.be (User ID: %)', test_user_id;
  
  -- Generate data for the last 31 days
  current_date_iter := CURRENT_DATE - INTERVAL '31 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    -- Get day characteristics
    day_of_week := EXTRACT(DOW FROM current_date_iter);
    is_weekend := day_of_week = 0 OR day_of_week = 6; -- Sunday or Saturday
    month_num := EXTRACT(MONTH FROM current_date_iter);
    
    -- Seasonal factor (heating/cooling needs)
    seasonal_factor := CASE 
      WHEN month_num IN (12, 1, 2) THEN 1.4  -- Winter (heating)
      WHEN month_num IN (6, 7, 8) THEN 1.2   -- Summer (cooling)
      WHEN month_num IN (3, 4, 5, 9, 10, 11) THEN 1.0  -- Spring/Autumn
      ELSE 1.0
    END;
    
    -- Daily weather factor (simulates cloudy/sunny days, temperature variations)
    weather_factor := 0.85 + random() * 0.3; -- Between 0.85 and 1.15
    
    -- Generate 96 data points per day (24 hours * 4 quarters)
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      quarter_iter := 0;
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        
        -- Base consumption pattern for residential consumer
        IF hour_iter BETWEEN 6 AND 9 THEN
          -- Morning peak (shower, breakfast, getting ready)
          base_consumption := 2.8 + random() * 1.5;
        ELSIF hour_iter BETWEEN 17 AND 22 THEN
          -- Evening peak (cooking, entertainment, lighting)
          base_consumption := 3.5 + random() * 2.0;
        ELSIF hour_iter BETWEEN 10 AND 16 THEN
          -- Daytime (some appliances, work from home occasionally)
          base_consumption := 1.2 + random() * 0.8;
        ELSIF hour_iter >= 23 OR hour_iter <= 5 THEN
          -- Night (refrigerator, standby devices)
          base_consumption := 0.6 + random() * 0.4;
        ELSE
          -- Transition periods
          base_consumption := 1.8 + random() * 1.0;
        END IF;
        
        -- Weekend adjustments (more time at home)
        IF is_weekend THEN
          IF hour_iter BETWEEN 8 AND 12 THEN
            base_consumption := base_consumption * 1.3; -- Weekend morning activities
          ELSIF hour_iter BETWEEN 13 AND 17 THEN
            base_consumption := base_consumption * 1.2; -- Weekend afternoon
          ELSE
            base_consumption := base_consumption * 1.1; -- General weekend increase
          END IF;
        END IF;
        
        -- Apply seasonal and weather factors
        consumption_value := base_consumption * seasonal_factor * weather_factor;
        
        -- Add some random spikes for appliances (washing machine, dishwasher, etc.)
        IF random() < 0.05 THEN -- 5% chance of appliance spike
          consumption_value := consumption_value + (2 + random() * 3); -- Add 2-5 kWh spike
        END IF;
        
        -- Ensure minimum consumption (always some base load)
        consumption_value := GREATEST(consumption_value, 0.3);
        
        -- Calculate shared energy (community energy available)
        -- Shared energy is higher during sunny hours when solar production is high
        IF hour_iter BETWEEN 10 AND 16 THEN
          -- High solar production hours - more shared energy available
          shared_energy_value := consumption_value * (0.35 + random() * 0.25); -- 35-60%
        ELSIF hour_iter BETWEEN 8 AND 18 THEN
          -- Moderate solar production
          shared_energy_value := consumption_value * (0.25 + random() * 0.20); -- 25-45%
        ELSE
          -- Low/no solar production - limited shared energy
          shared_energy_value := consumption_value * (0.10 + random() * 0.15); -- 10-25%
        END IF;
        
        -- Ensure shared energy doesn't exceed consumption
        shared_energy_value := LEAST(shared_energy_value, consumption_value);
        
        -- Insert the data point
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (test_user_id, timestamp_value, consumption_value, shared_energy_value, 0);
        
        data_points_count := data_points_count + 1;
        quarter_iter := quarter_iter + 1;
      END LOOP;
      
      hour_iter := hour_iter + 1;
    END LOOP;
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Successfully generated % energy data points for test.consumer@sunisup.be', data_points_count;
  RAISE NOTICE 'Data covers 31 days with quarter-hourly measurements';
  RAISE NOTICE 'Pattern includes realistic residential consumption with morning/evening peaks';
  RAISE NOTICE 'Shared energy varies based on solar production availability (higher during day)';
END $$;