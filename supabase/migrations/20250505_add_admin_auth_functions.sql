-- Create or replace the verify_password function with renamed parameters to avoid ambiguity
CREATE OR REPLACE FUNCTION verify_password(
  input_username TEXT,
  input_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
  result BOOLEAN;
BEGIN
  -- Get the password hash for the given username
  SELECT password_hash INTO stored_hash
  FROM admin_users AS au
  WHERE au.username = input_username AND au.is_active = TRUE;
  
  -- If no user found, return false
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the password using pgcrypto's crypt function
  -- This compares the input password with the stored hash
  SELECT stored_hash = crypt(input_password, stored_hash) INTO result;
  
  RETURN result;
END;
$$;
