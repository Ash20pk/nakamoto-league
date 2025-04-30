-- First, check if we have a user with the admin email
SELECT id, email FROM auth.users WHERE email = 'ash20pk@gmail.com';

-- If no user exists, create one
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Check if user exists
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'ash20pk@gmail.com';
  
  -- If not, create a new user
  IF auth_user_id IS NULL THEN
    INSERT INTO auth.users (email, email_confirmed_at, role, is_sso_user)
    VALUES ('ash20pk@gmail.com', NOW(), 'authenticated', false)
    RETURNING id INTO auth_user_id;
    
    RAISE NOTICE 'Created new auth user with ID: %', auth_user_id;
  ELSE
    RAISE NOTICE 'Found existing auth user with ID: %', auth_user_id;
  END IF;
  
  -- Update the admin_users record to link to this user
  UPDATE public.admin_users
  SET 
    user_id = auth_user_id,
    email = 'ash20pk@gmail.com'
  WHERE username = 'admin';
  
  RAISE NOTICE 'Admin user linked successfully!';
END $$;

-- Check the updated admin user
SELECT 
  id, 
  username, 
  user_id,
  is_active,
  email
FROM public.admin_users
WHERE username = 'admin';
