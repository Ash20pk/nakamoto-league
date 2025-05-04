-- Migration: tournament_organizer_to_dojo.sql
-- Description: Update tournaments to be associated with dojos instead of individual users
-- Date: 2025-05-04

-- Step 1: Drop the existing foreign key constraint that links tournaments.organizer_id to profiles.id
ALTER TABLE public.tournaments
DROP CONSTRAINT IF EXISTS tournaments_organizer_id_fkey;

-- Step 2: Create a temporary table to store the mapping between user_id and dojo_id
CREATE TEMP TABLE user_dojo_mapping AS
SELECT owner_id as user_id, id as dojo_id
FROM public.dojos;

-- Step 3: Update existing tournaments to use dojo_id instead of user_id as organizer_id
-- This will update tournaments where the organizer_id (currently a user_id) is the owner of a dojo
UPDATE public.tournaments
SET organizer_id = user_dojo_mapping.dojo_id
FROM user_dojo_mapping
WHERE tournaments.organizer_id = user_dojo_mapping.user_id;

-- Step 4: Check if any tournaments would violate the new constraint
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.tournaments t
    LEFT JOIN public.dojos d ON t.organizer_id = d.id
    WHERE d.id IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Cannot add foreign key constraint: % tournaments have invalid dojo references', invalid_count;
    END IF;
END $$;

-- Step 5: Add the new foreign key constraint to ensure organizer_id references a valid dojo_id
ALTER TABLE public.tournaments
ADD CONSTRAINT tournaments_organizer_id_fkey
FOREIGN KEY (organizer_id)
REFERENCES public.dojos(id)
ON DELETE CASCADE;

-- Step 6: Update the column comment to reflect the new relationship
COMMENT ON COLUMN public.tournaments.organizer_id IS 'Foreign key to dojos table. Represents the dojo that created/organizes this tournament.';

-- Drop the temporary table
DROP TABLE user_dojo_mapping;
