-- Drop existing verify_password function
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);

-- Create a function to verify passwords with fixed parameter names
CREATE OR REPLACE FUNCTION verify_password(input_username TEXT, input_password TEXT) 
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Use table alias to avoid ambiguity
  SELECT a.password_hash INTO stored_hash 
  FROM public.admin_users a
  WHERE a.username = input_username AND a.is_active = TRUE;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
