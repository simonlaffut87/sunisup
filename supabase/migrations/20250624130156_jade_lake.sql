/*
  # Create test accounts with energy data

  1. New Test Users
    - test.consumer@sunisup.be - Residential consumer profile
    - test.producer@sunisup.be - Solar producer profile (12 kWp)
    - demo.cafe@sunisup.be - Café/restaurant profile
    - demo.office@sunisup.be - Office/business profile

  2. Energy Data
    - 31 days of quarter-hourly data for each account
    - Realistic consumption/production patterns
    - Different profiles based on user type

  3. Security
    - All accounts use password: test123
    - Proper RLS policies apply
    - Safe upsert operations to avoid conflicts
*/

-- Function to safely create or update test users
CREATE OR REPLACE FUNCTION safe_create_test_user(
  p_email text, 
  p_password text, 
  p_user_name text, 
  p_member_type text
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_auth_user_exists boolean := false;
  v_users_table_exists boolean := false;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) INTO v_auth_user_exists;
  
  IF v_auth_user_exists THEN
    -- Get existing user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    -- Update auth.users
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', p_user_name, 'member_type', p_member_type)
    WHERE email = p_email;
    
  ELSE
    -- Create new user in auth.users
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('name', p_user_name, 'member_type', p_member_type),
      false,
      '',
      '',
      '',
      ''
    );
  END IF;
  
  -- Check if user exists in users table
  SELECT EXISTS(SELECT 1 FROM users WHERE id = v_user_id) INTO v_users_table_exists;
  
  IF v_users_table_exists THEN
    -- Update existing record in users table
    UPDATE users 
    SET 
      name = p_user_name,
      member_type = p_member_type,
      updated_at = NOW()
    WHERE id = v_user_id;
  ELSE
    -- Insert new record in users table
    INSERT INTO users (id, email, name, member_type)
    VALUES (v_user_id, p_email, p_user_name, p_member_type);
  END IF;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test accounts and generate energy data
DO $$
DECLARE
  consumer_id uuid;
  producer_id uuid;
  cafe_id uuid;
  office_id uuid;
  current_date_iter date;
  hour_iter integer;
  quarter_iter integer;
  base_value numeric;
  consumption_value numeric;
  production_value numeric;
  shared_energy_value numeric;
  timestamp_value timestamptz;
  random_factor numeric;
  solar_factor numeric;
  seasonal_factor numeric;
  month_num integer;
  day_of_week integer;
  is_weekend boolean;
  is_business_hours boolean;
BEGIN
  -- Create test accounts
  consumer_id := safe_create_test_user('test.consumer@sunisup.be', 'test123', 'Test Consommateur', 'consumer');
  producer_id := safe_create_test_user('test.producer@sunisup.be', 'test123', 'Test Producteur', 'producer');
  cafe_id := safe_create_test_user('demo.cafe@sunisup.be', 'test123', 'Démo Café', 'consumer');
  office_id := safe_create_test_user('demo.office@sunisup.be', 'test123', 'Démo Bureau', 'consumer');
  
  RAISE NOTICE 'Created/updated test accounts:';
  RAISE NOTICE '- test.consumer@sunisup.be / test123 (Consumer) - ID: %', consumer_id;
  RAISE NOTICE '- test.producer@sunisup.be / test123 (Producer) - ID: %', producer_id;
  RAISE NOTICE '- demo.cafe@sunisup.be / test123 (Café) - ID: %', cafe_id;
  RAISE NOTICE '- demo.office@sunisup.be / test123 (Office) - ID: %', office_id;
  
  -- Delete existing energy data for test accounts
  DELETE FROM energy_data WHERE user_id IN (consumer_id, producer_id, cafe_id, office_id);
  
  -- Generate energy data for the last 31 days
  current_date_iter := CURRENT_DATE - INTERVAL '31 days';
  
  WHILE current_date_iter <= CURRENT_DATE LOOP
    month_num := EXTRACT(MONTH FROM current_date_iter);
    day_of_week := EXTRACT(DOW FROM current_date_iter);
    is_weekend := day_of_week = 0 OR day_of_week = 6;
    
    -- Seasonal factor for solar production
    seasonal_factor := CASE 
      WHEN month_num IN (6, 7, 8) THEN 1.3  -- Summer
      WHEN month_num IN (4, 5, 9, 10) THEN 1.0  -- Spring/Autumn
      ELSE 0.6  -- Winter
    END;
    
    hour_iter := 0;
    WHILE hour_iter < 24 LOOP
      is_business_hours := hour_iter BETWEEN 8 AND 18;
      quarter_iter := 0;
      
      WHILE quarter_iter < 4 LOOP
        timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
        random_factor := 0.8 + random() * 0.4; -- Between 0.8 and 1.2
        
        -- Test Consumer (residential pattern)
        IF hour_iter BETWEEN 6 AND 9 THEN -- Morning
          base_value := 3.5 + random() * 2;
        ELSIF hour_iter BETWEEN 17 AND 22 THEN -- Evening
          base_value := 4.2 + random() * 2.5;
        ELSIF hour_iter >= 23 OR hour_iter <= 5 THEN -- Night
          base_value := 0.8 + random() * 0.5;
        ELSE -- Day
          base_value := 1.5 + random() * 1;
        END IF;
        
        IF is_weekend THEN
          base_value := base_value * 1.3; -- Higher consumption on weekends
        END IF;
        
        consumption_value := base_value * random_factor;
        shared_energy_value := consumption_value * (0.25 + random() * 0.15); -- 25-40% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (consumer_id, timestamp_value, consumption_value, shared_energy_value, 0);
        
        -- Test Producer (12 kWp solar installation)
        IF hour_iter BETWEEN 6 AND 18 THEN
          -- Bell curve centered on noon
          solar_factor := EXP(-0.5 * POWER((hour_iter - 12.0) / 4.0, 2));
          -- Scale based on 12 kWp installation (assuming 950 kWh/kWp annually)
          base_value := (12 * 950 / 365 / 24) * solar_factor * seasonal_factor * random_factor;
          production_value := GREATEST(0, base_value);
        ELSE
          production_value := 0; -- No solar at night
        END IF;
        
        -- Producer also consumes (15-25% of production capacity)
        consumption_value := production_value * (0.15 + random() * 0.10);
        -- Shared energy is production minus self-consumption
        shared_energy_value := GREATEST(0, production_value - consumption_value);
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (producer_id, timestamp_value, consumption_value, shared_energy_value, production_value);
        
        -- Demo Café (meal time peaks)
        IF hour_iter BETWEEN 7 AND 10 THEN -- Breakfast
          base_value := 6 + random() * 3;
        ELSIF hour_iter BETWEEN 11 AND 14 THEN -- Lunch
          base_value := 10 + random() * 4;
        ELSIF hour_iter BETWEEN 18 AND 22 THEN -- Dinner
          base_value := 9 + random() * 3;
        ELSIF hour_iter BETWEEN 6 AND 23 THEN -- Open hours
          base_value := 4 + random() * 2;
        ELSE -- Closed
          base_value := 1 + random() * 0.5;
        END IF;
        
        IF is_weekend THEN
          base_value := base_value * 1.4; -- Busier on weekends
        END IF;
        
        consumption_value := base_value * random_factor;
        shared_energy_value := consumption_value * (0.30 + random() * 0.20); -- 30-50% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (cafe_id, timestamp_value, consumption_value, shared_energy_value, 0);
        
        -- Demo Office (business hours pattern)
        IF is_weekend THEN
          base_value := 0.5 + random() * 0.5; -- Minimal on weekends
        ELSIF is_business_hours THEN
          base_value := 8 + random() * 4; -- Active during business hours
        ELSIF hour_iter BETWEEN 6 AND 8 OR hour_iter BETWEEN 18 AND 20 THEN
          base_value := 3 + random() * 2; -- Preparation/cleanup
        ELSE
          base_value := 0.5 + random() * 0.5; -- Night/off hours
        END IF;
        
        consumption_value := base_value * random_factor;
        shared_energy_value := consumption_value * (0.35 + random() * 0.15); -- 35-50% shared
        
        INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
        VALUES (office_id, timestamp_value, consumption_value, shared_energy_value, 0);
        
        quarter_iter := quarter_iter + 1;
      END LOOP;
      
      hour_iter := hour_iter + 1;
    END LOOP;
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
  
  RAISE NOTICE 'Generated energy data for all test accounts (31 days, quarter-hourly)';
  RAISE NOTICE 'Total data points per account: 2976 (96 per day × 31 days)';
  RAISE NOTICE 'All accounts use password: test123';
END $$;

-- Clean up
DROP FUNCTION safe_create_test_user(text, text, text, text);