/*
  # Create fictional accounts for all participants with energy data

  1. Changes
    - Create user accounts for all existing participants
    - Generate realistic energy consumption/production data for 31 days
    - Handle existing users gracefully with UPSERT operations
    - Create different consumption patterns based on participant type

  2. Security
    - Uses proper password hashing
    - Handles conflicts gracefully
    - Generates realistic energy patterns for each participant type
*/

-- Function to create or update users with password
CREATE OR REPLACE FUNCTION create_participant_user(email text, password text, user_name text, member_type text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  existing_user_id uuid;
  existing_profile_id uuid;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO existing_user_id FROM auth.users WHERE auth.users.email = create_participant_user.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- Update existing user in auth.users
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(password, gen_salt('bf')),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', user_name, 'member_type', member_type)
    WHERE id = existing_user_id;
    
    -- Check if profile exists in users table
    SELECT id INTO existing_profile_id FROM users WHERE id = existing_user_id;
    
    IF existing_profile_id IS NOT NULL THEN
      -- Update existing profile
      UPDATE users 
      SET 
        name = user_name,
        member_type = member_type::text,
        updated_at = NOW()
      WHERE id = existing_user_id;
    ELSE
      -- Insert new profile for existing auth user
      INSERT INTO users (id, email, name, member_type)
      VALUES (existing_user_id, email, user_name, member_type)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        member_type = EXCLUDED.member_type,
        updated_at = NOW();
    END IF;
    
    RETURN existing_user_id;
  ELSE
    -- Create new user
    user_id := gen_random_uuid();
    
    -- Insert into auth.users
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
      user_id,
      'authenticated',
      'authenticated',
      email,
      crypt(password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('name', user_name, 'member_type', member_type),
      false,
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (email) DO UPDATE SET
      encrypted_password = crypt(password, gen_salt('bf')),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', user_name, 'member_type', member_type);
    
    -- Get the actual user_id (in case of conflict resolution)
    SELECT id INTO user_id FROM auth.users WHERE email = create_participant_user.email;
    
    -- Insert into users table with conflict handling
    INSERT INTO users (id, email, name, member_type)
    VALUES (user_id, email, user_name, member_type)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      member_type = EXCLUDED.member_type,
      updated_at = NOW();
    
    RETURN user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create accounts for all participants and generate energy data
DO $$
DECLARE
  participant_record RECORD;
  user_id uuid;
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
  email_address text;
  clean_name text;
  participant_count integer := 0;
  data_points_count integer := 0;
BEGIN
  -- Loop through all participants and create accounts
  FOR participant_record IN 
    SELECT * FROM participants 
    ORDER BY name
  LOOP
    BEGIN
      -- Clean the name for email generation
      clean_name := LOWER(REPLACE(REPLACE(REPLACE(REPLACE(participant_record.name, ' ', '.'), '''', ''), 'é', 'e'), 'è', 'e'));
      clean_name := REPLACE(REPLACE(clean_name, 'ç', 'c'), 'à', 'a');
      email_address := clean_name || '@sunisup-member.com';
      
      -- Create user account
      user_id := create_participant_user(
        email_address,
        'password123',
        participant_record.name,
        participant_record.type
      );
      
      participant_count := participant_count + 1;
      
      RAISE NOTICE 'Created account % for %: % (% / password123)', 
        participant_count, participant_record.name, email_address, participant_record.type;
      
      -- Delete existing energy data for this user to avoid duplicates
      DELETE FROM energy_data WHERE user_id = user_id;
      
      -- Generate energy data for the last 31 days
      current_date_iter := CURRENT_DATE - INTERVAL '31 days';
      
      WHILE current_date_iter <= CURRENT_DATE LOOP
        month_num := EXTRACT(MONTH FROM current_date_iter);
        day_of_week := EXTRACT(DOW FROM current_date_iter);
        is_weekend := day_of_week = 0 OR day_of_week = 6;
        
        -- Seasonal factor for production
        seasonal_factor := CASE 
          WHEN month_num IN (6, 7, 8) THEN 1.3  -- Summer
          WHEN month_num IN (4, 5, 9, 10) THEN 1.0  -- Spring/Autumn
          ELSE 0.6  -- Winter
        END;
        
        -- Generate 96 data points per day (quarter-hourly)
        hour_iter := 0;
        WHILE hour_iter < 24 LOOP
          is_business_hours := hour_iter BETWEEN 8 AND 18;
          quarter_iter := 0;
          
          WHILE quarter_iter < 4 LOOP
            timestamp_value := current_date_iter + (hour_iter || ' hours')::interval + (quarter_iter * 15 || ' minutes')::interval;
            random_factor := 0.8 + random() * 0.4; -- Between 0.8 and 1.2
            
            IF participant_record.type = 'producer' THEN
              -- PRODUCER LOGIC
              -- Solar production pattern (bell curve centered on noon)
              IF hour_iter BETWEEN 6 AND 18 THEN
                solar_factor := EXP(-0.5 * POWER((hour_iter - 12.0) / 4.0, 2));
                -- Scale based on peak power (assuming 950 kWh/kWp annually)
                base_value := (participant_record.peak_power * 950 / 365 / 24) * solar_factor * seasonal_factor * random_factor;
                production_value := GREATEST(0, base_value);
              ELSE
                production_value := 0; -- No solar at night
              END IF;
              
              -- Producers also consume energy (typically 15-25% of their production capacity)
              consumption_value := production_value * (0.15 + random() * 0.10);
              
              -- Shared energy is production minus self-consumption
              shared_energy_value := GREATEST(0, production_value - consumption_value);
              
            ELSE
              -- CONSUMER LOGIC
              production_value := 0;
              
              -- Different consumption patterns based on participant name/type
              IF participant_record.name ILIKE '%boulangerie%' OR participant_record.name ILIKE '%bakery%' THEN
                -- Bakery pattern: early morning peak
                IF hour_iter BETWEEN 4 AND 12 THEN
                  base_value := 8 + random() * 4;
                ELSIF hour_iter BETWEEN 13 AND 18 THEN
                  base_value := 5 + random() * 2;
                ELSE
                  base_value := 2 + random() * 1;
                END IF;
                
              ELSIF participant_record.name ILIKE '%café%' OR participant_record.name ILIKE '%bar%' OR participant_record.name ILIKE '%restaurant%' OR participant_record.name ILIKE '%ouzerie%' THEN
                -- Café/Restaurant pattern: meal time peaks
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
                
              ELSIF participant_record.name ILIKE '%bureau%' OR participant_record.name ILIKE '%office%' THEN
                -- Office pattern: business hours
                IF is_weekend THEN
                  base_value := 0.5 + random() * 0.5;
                ELSIF is_business_hours THEN
                  base_value := 8 + random() * 4;
                ELSIF hour_iter BETWEEN 6 AND 8 OR hour_iter BETWEEN 18 AND 20 THEN
                  base_value := 3 + random() * 2;
                ELSE
                  base_value := 0.5 + random() * 0.5;
                END IF;
                
              ELSIF participant_record.name ILIKE '%atelier%' OR participant_record.name ILIKE '%workshop%' THEN
                -- Workshop pattern: working hours
                IF hour_iter BETWEEN 7 AND 17 THEN
                  base_value := 12 + random() * 6;
                ELSIF hour_iter BETWEEN 18 AND 20 THEN
                  base_value := 4 + random() * 2;
                ELSE
                  base_value := 2 + random() * 1;
                END IF;
                
              ELSE
                -- Default residential/commercial pattern
                IF hour_iter BETWEEN 6 AND 9 THEN -- Morning
                  base_value := 4 + random() * 2;
                ELSIF hour_iter BETWEEN 17 AND 22 THEN -- Evening
                  base_value := 6 + random() * 3;
                ELSIF hour_iter BETWEEN 10 AND 16 THEN -- Day
                  base_value := 3 + random() * 1.5;
                ELSE -- Night
                  base_value := 1 + random() * 0.5;
                END IF;
                
                IF is_weekend THEN
                  base_value := base_value * 1.2;
                END IF;
              END IF;
              
              consumption_value := base_value * random_factor;
              
              -- Shared energy is 25-45% of consumption
              shared_energy_value := consumption_value * (0.25 + random() * 0.20);
            END IF;
            
            -- Insert energy data with conflict handling
            INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
            VALUES (user_id, timestamp_value, consumption_value, shared_energy_value, production_value)
            ON CONFLICT (user_id, timestamp) DO UPDATE SET
              consumption = EXCLUDED.consumption,
              shared_energy = EXCLUDED.shared_energy,
              production = EXCLUDED.production;
            
            data_points_count := data_points_count + 1;
            quarter_iter := quarter_iter + 1;
          END LOOP;
          
          hour_iter := hour_iter + 1;
        END LOOP;
        
        current_date_iter := current_date_iter + INTERVAL '1 day';
      END LOOP;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating account for %: %', participant_record.name, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Successfully created % accounts and % energy data points', participant_count, data_points_count;
  RAISE NOTICE 'All accounts use password: password123';
  RAISE NOTICE 'Generated quarter-hourly energy data for 31 days per participant';
END $$;

-- Clean up
DROP FUNCTION IF EXISTS create_participant_user(text, text, text, text);