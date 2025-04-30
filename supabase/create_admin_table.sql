-- Create a table to store admin accounts
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add RLS policies if the table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admin_users' AND policyname = 'Only admins can view admin users'
  ) THEN
    -- Add RLS policies
    ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

    -- Only authenticated users can view admin users
    CREATE POLICY "Only admins can view admin users" 
      ON public.admin_users 
      FOR SELECT 
      USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE is_active = TRUE));
  END IF;
END
$$;

-- Create a function to hash passwords (requires pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION hash_password(password TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing verify_password function if it exists
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);

-- Create a function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(username TEXT, password TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Use table alias to avoid ambiguity
  SELECT a.password_hash INTO stored_hash 
  FROM public.admin_users a
  WHERE a.username = username AND a.is_active = TRUE;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = crypt(password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to verify if an email belongs to an admin
CREATE OR REPLACE FUNCTION verify_admin_email(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users a
    JOIN auth.users u ON a.user_id = u.id
    WHERE u.email = p_email AND a.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial admin user (username: admin, password: qnzxc91227#)
INSERT INTO public.admin_users (username, password_hash, email, is_active)
VALUES ('admin', crypt('qnzxc91227#', gen_salt('bf', 10)), 'ash20pk@gmail.com', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Add comment to explain table purpose
COMMENT ON TABLE public.admin_users IS 'Stores admin users for the application';
