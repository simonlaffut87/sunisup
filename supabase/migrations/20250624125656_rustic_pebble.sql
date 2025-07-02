/*
  # Create participant accounts and energy data

  1. Changes
    - Create user accounts for all participants
    - Generate realistic energy data for each participant
    - Handle conflicts properly to avoid duplicate key errors

  2. Security
    - All accounts use password: password123
    - Accounts are created with proper email addresses
    - Energy data is generated for the last 31 days
*/

-- Function to safely create or update users with password
CREATE OR REPLACE FUNCTION safe_create_participant_user(email text, password text, user_name text, member_type text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO existing_user_id FROM auth.users WHERE auth.users.email = safe_create_participant_user.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- Update existing user
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(password, gen_salt('bf')),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object('name', user_name, 'member_type', member_type)
    WHERE id = existing_user_id;
    
    -- Upsert into users table
    INSERT INTO users (id, email, name, member_type)
    VALUES (existing_user_id, email, user_name, member_type)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      member_type = EXCLUDED.member_type,
      updated_at = NOW();
    
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
    );
    
    -- Insert into users table
    INSERT INTO users (id, email, name, member_type)
    VALUES (user_id, email, user_name, member_type);
    
    RETURN user_id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user %: %', email, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create accounts for participants
DO $$
DECLARE
  participant_record RECORD;
  user_id uuid;
  email_address text;
  clean_name text;
  success_count integer := 0;
  total_count integer := 0;
BEGIN
  -- Loop through all participants
  FOR participant_record IN 
    SELECT * FROM participants 
    ORDER BY name
  LOOP
    total_count := total_count + 1;
    
    BEGIN
      -- Generate clean email from participant name
      clean_name := LOWER(participant_record.name);
      clean_name := REPLACE(clean_name, ' ', '.');
      clean_name := REPLACE(clean_name, '''', '');
      clean_name := REPLACE(clean_name, 'é', 'e');
      clean_name := REPLACE(clean_name, 'è', 'e');
      clean_name := REPLACE(clean_name, 'ç', 'c');
      clean_name := REPLACE(clean_name, 'à', 'a');
      clean_name := REPLACE(clean_name, 'ô', 'o');
      clean_name := REPLACE(clean_name, 'ù', 'u');
      clean_name := REPLACE(clean_name, 'î', 'i');
      clean_name := REPLACE(clean_name, 'â', 'a');
      clean_name := REPLACE(clean_name, 'ê', 'e');
      clean_name := REPLACE(clean_name, 'û', 'u');
      
      email_address := clean_name || '@sunisup-member.com';
      
      -- Create user account
      user_id := safe_create_participant_user(
        email_address,
        'password123',
        participant_record.name,
        participant_record.type
      );
      
      IF user_id IS NOT NULL THEN
        success_count := success_count + 1;
        RAISE NOTICE 'Created account for %: % (%)', 
          participant_record.name, email_address, participant_record.type;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create account for %: %', participant_record.name, SQLERRM;
        CONTINUE;
    END;
  END LOOP;
  
  RAISE NOTICE 'Successfully created % out of % participant accounts', success_count, total_count;
  RAISE NOTICE 'All accounts use password: password123';
END $$;

-- Generate energy data for all participant accounts
DO $$
DECLARE
  user_record RECORD;
  participant_record RECORD;
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
  data_points_count integer := 0;
  user_count integer := 0;
BEGIN
  -- Loop through all users with @sunisup-member.com emails
  FOR user_record IN 
    SELECT u.*, p.name as participant_name, p.type as participant_type, p.peak_power
    FROM users u
    LEFT JOIN participants p ON LOWER(REPLACE(REPLACE(REPLACE(p.name, ' ', '.'), '''', ''), 'é', 'e')) = REPLACE(u.email, '@sunisup-member.com', '')
    WHERE u.email LIKE '%@sunisup-member.com'
    ORDER BY u.name
  LOOP
    user_count := user_count + 1;
    
    -- Delete existing energy data to avoid duplicates
    DELETE FROM energy_data WHERE user_id = user_record.id;
    
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
          
          IF user_record.member_type = 'producer' THEN
            -- PRODUCER LOGIC
            IF hour_iter BETWEEN 6 AND 18 THEN
              solar_factor := EXP(-0.5 * POWER((hour_iter - 12.0) / 4.0, 2));
              -- Use peak power from participant data or default to 10kWp
              base_value := (COALESCE(user_record.peak_power, 10) * 950 / 365 / 24) * solar_factor * seasonal_factor * random_factor;
              production_value := GREATEST(0, base_value);
            ELSE
              production_value := 0;
            END IF;
            
            consumption_value := production_value * (0.15 + random() * 0.10);
            shared_energy_value := GREATEST(0, production_value - consumption_value);
            
          ELSE
            -- CONSUMER LOGIC
            production_value := 0;
            
            -- Different patterns based on participant name
            IF user_record.participant_name ILIKE '%boulangerie%' OR user_record.participant_name ILIKE '%bakery%' THEN
              -- Bakery pattern
              IF hour_iter BETWEEN 4 AND 12 THEN
                base_value := 8 + random() * 4;
              ELSIF hour_iter BETWEEN 13 AND 18 THEN
                base_value := 5 + random() * 2;
              ELSE
                base_value := 2 + random() * 1;
              END IF;
              
            ELSIF user_record.participant_name ILIKE '%café%' OR user_record.participant_name ILIKE '%bar%' OR user_record.participant_name ILIKE '%restaurant%' OR user_record.participant_name ILIKE '%ouzerie%' THEN
              -- Restaurant pattern
              IF hour_iter BETWEEN 7 AND 10 THEN
                base_value := 6 + random() * 3;
              ELSIF hour_iter BETWEEN 11 AND 14 THEN
                base_value := 10 + random() * 4;
              ELSIF hour_iter BETWEEN 18 AND 22 THEN
                base_value := 9 + random() * 3;
              ELSIF hour_iter BETWEEN 6 AND 23 THEN
                base_value := 4 + random() * 2;
              ELSE
                base_value := 1 + random() * 0.5;
              END IF;
              
              IF is_weekend THEN
                base_value := base_value * 1.4;
              END IF;
              
            ELSIF user_record.participant_name ILIKE '%bureau%' OR user_record.participant_name ILIKE '%office%' THEN
              -- Office pattern
              IF is_weekend THEN
                base_value := 0.5 + random() * 0.5;
              ELSIF is_business_hours THEN
                base_value := 8 + random() * 4;
              ELSIF hour_iter BETWEEN 6 AND 8 OR hour_iter BETWEEN 18 AND 20 THEN
                base_value := 3 + random() * 2;
              ELSE
                base_value := 0.5 + random() * 0.5;
              END IF;
              
            ELSIF user_record.participant_name ILIKE '%atelier%' OR user_record.participant_name ILIKE '%workshop%' THEN
              -- Workshop pattern
              IF hour_iter BETWEEN 7 AND 17 THEN
                base_value := 12 + random() * 6;
              ELSIF hour_iter BETWEEN 18 AND 20 THEN
                base_value := 4 + random() * 2;
              ELSE
                base_value := 2 + random() * 1;
              END IF;
              
            ELSE
              -- Default pattern
              IF hour_iter BETWEEN 6 AND 9 THEN
                base_value := 4 + random() * 2;
              ELSIF hour_iter BETWEEN 17 AND 22 THEN
                base_value := 6 + random() * 3;
              ELSIF hour_iter BETWEEN 10 AND 16 THEN
                base_value := 3 + random() * 1.5;
              ELSE
                base_value := 1 + random() * 0.5;
              END IF;
              
              IF is_weekend THEN
                base_value := base_value * 1.2;
              END IF;
            END IF;
            
            consumption_value := base_value * random_factor;
            shared_energy_value := consumption_value * (0.25 + random() * 0.20);
          END IF;
          
          -- Insert energy data
          INSERT INTO energy_data (user_id, timestamp, consumption, shared_energy, production)
          VALUES (user_record.id, timestamp_value, consumption_value, shared_energy_value, production_value);
          
          data_points_count := data_points_count + 1;
          quarter_iter := quarter_iter + 1;
        END LOOP;
        
        hour_iter := hour_iter + 1;
      END LOOP;
      
      current_date_iter := current_date_iter + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Generated energy data for user %: % data points', user_record.name, (31 * 24 * 4);
  END LOOP;
  
  RAISE NOTICE 'Generated energy data for % users with % total data points', user_count, data_points_count;
END $$;

-- Clean up
DROP FUNCTION IF EXISTS safe_create_participant_user(text, text, text, text);