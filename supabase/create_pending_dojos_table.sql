-- Create a table to store pending dojo information
CREATE TABLE public.pending_dojos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed BOOLEAN DEFAULT FALSE
);

-- Add RLS policies
ALTER TABLE public.pending_dojos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own pending dojo
CREATE POLICY "Users can view their own pending dojo" 
  ON public.pending_dojos 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Allow system to insert pending dojos
CREATE POLICY "System can insert pending dojos" 
  ON public.pending_dojos 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create a function to process pending dojos after user confirmation
CREATE OR REPLACE FUNCTION process_pending_dojo()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user confirms their email, check if they have a pending dojo
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Check if there's a pending dojo for this user
    DECLARE
      pending_dojo RECORD;
    BEGIN
      SELECT * INTO pending_dojo FROM public.pending_dojos 
      WHERE user_id = NEW.id AND processed = FALSE;
      
      IF FOUND THEN
        -- Create profile if it doesn't exist
        INSERT INTO public.profiles (id, username, created_at, updated_at)
        VALUES (
          NEW.id, 
          pending_dojo.name, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Create dojo
        INSERT INTO public.dojos (
          name, 
          owner_id, 
          location, 
          description, 
          created_at, 
          updated_at
        )
        VALUES (
          pending_dojo.name,
          NEW.id,
          pending_dojo.location,
          pending_dojo.description,
          NOW(),
          NOW()
        );
        
        -- Mark as processed
        UPDATE public.pending_dojos
        SET processed = TRUE
        WHERE id = pending_dojo.id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER process_pending_dojo_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION process_pending_dojo();

-- Comment explaining the purpose
COMMENT ON TABLE public.pending_dojos IS 'Stores information about dojos that are pending creation until the user confirms their email';
