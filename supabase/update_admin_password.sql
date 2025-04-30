-- Function to update admin password hash
CREATE OR REPLACE FUNCTION update_admin_password(p_user_id UUID, p_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the password hash in admin_users table
  UPDATE public.admin_users
  SET password_hash = crypt(p_password, gen_salt('bf', 10))
  WHERE user_id = p_user_id;
  
  -- Return success
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
