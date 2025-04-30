-- Check the status of the admin user
SELECT 
  id, 
  username, 
  user_id,
  is_active,
  email
FROM public.admin_users
WHERE username = 'admin';

-- Make sure the admin user is active
UPDATE public.admin_users
SET is_active = TRUE
WHERE username = 'admin';

-- Reset admin password
UPDATE public.admin_users
SET password_hash = crypt('qnzxc91227#', gen_salt('bf', 10))
WHERE username = 'admin';

-- If no admin user exists, create one
INSERT INTO public.admin_users (username, password_hash, email, is_active)
SELECT 'admin', crypt('qnzxc91227#', gen_salt('bf', 10)), 'ash20pk@gmail.com', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_users WHERE username = 'admin'
);

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Admin account has been fixed and password has been reset!';
END $$;
