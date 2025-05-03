-- Add streak column to warriors table
ALTER TABLE warriors ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;

-- Create or replace function to handle daily check-in and streak management
CREATE OR REPLACE FUNCTION warrior_daily_check_in(p_warrior_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_last_check_in DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
    -- Get the last check-in date for this warrior
    SELECT last_check_in::DATE INTO v_last_check_in
    FROM warriors
    WHERE id = p_warrior_id;
    
    -- If already checked in today, return false
    IF v_last_check_in = v_today THEN
        RETURN FALSE;
    END IF;
    
    -- Update streak logic
    IF v_last_check_in = v_yesterday THEN
        -- Consecutive day, increment streak
        UPDATE warriors
        SET 
            energy = LEAST(energy + 50, level * 100),  -- Add energy but cap at max
            last_check_in = v_today,
            streak = streak + 1,  -- Increment streak
            updated_at = NOW()
        WHERE id = p_warrior_id;
    ELSE
        -- Streak broken or first check-in, reset streak to 1
        UPDATE warriors
        SET 
            energy = LEAST(energy + 50, level * 100),  -- Add energy but cap at max
            last_check_in = v_today,
            streak = 1,  -- Reset streak to 1
            updated_at = NOW()
        WHERE id = p_warrior_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
