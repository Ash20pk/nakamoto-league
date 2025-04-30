-- Function to create a dojo account with proper transaction handling
CREATE OR REPLACE FUNCTION create_dojo_account(
  p_email TEXT,
  p_username TEXT,
  p_dojo_name TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Create a temporary password (will be reset later)
  v_user_id := gen_random_uuid();
  
  -- Insert directly into profiles table first
  INSERT INTO profiles (id, username, created_at, updated_at)
  VALUES (v_user_id, p_username, NOW(), NOW());
  
  -- Insert into dojos table
  INSERT INTO dojos (name, owner_id, location, description, created_at, updated_at)
  VALUES (p_dojo_name, v_user_id, p_location, p_description, NOW(), NOW());
  
  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Dojo account created successfully'
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  -- Return error
  v_result := jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
