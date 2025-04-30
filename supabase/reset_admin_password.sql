-- Reset admin password directly in the database
-- This script will set the admin password to 'qnzxc91227#' for the user with username 'admin'

-- Update the password hash in admin_users table
UPDATE public.admin_users
SET password_hash = crypt('qnzxc91227#', gen_salt('bf', 10))
WHERE username = 'admin';

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Admin password has been reset successfully!';
END $$;
