-- First, disable RLS temporarily to fix the admin user
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Update the admin user with proper user_id and email
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

-- Fix the RLS policy to avoid recursion
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;

-- Create a better policy that doesn't cause recursion
CREATE POLICY "Admin users can be viewed by authenticated users" 
  ON public.admin_users 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
