-- Add email column to admin_users table
ALTER TABLE public.admin_users
ADD COLUMN email TEXT UNIQUE;

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

-- Update the reset password function to check email
CREATE OR REPLACE FUNCTION request_admin_password_reset(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if email exists in admin users
  IF NOT verify_admin_email(p_email) THEN
    -- Return true anyway to prevent email enumeration attacks
    RETURN TRUE;
  END IF;
  
  -- In a real implementation, this would trigger the email sending
  -- But Supabase Auth will handle this for us
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
