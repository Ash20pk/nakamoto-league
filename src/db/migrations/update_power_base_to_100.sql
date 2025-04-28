-- Update the base power level in the calculate_warrior_power_level function from 1000 to 100

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_warrior_power_level(UUID);

-- Recreate the function with base_power = 100
CREATE OR REPLACE FUNCTION calculate_warrior_power_level(p_warrior_id UUID)
RETURNS INT AS $$
DECLARE
  base_power INT := 100; -- Starting power level (changed from 1000)
  win_bonus INT := 0;
  battle_experience INT := 0;
  tournament_experience INT := 0;
  win_streak INT := 0;
  current_streak INT := 0;
  last_result BOOLEAN := NULL;
  battle_record RECORD;
  final_power INT;
BEGIN
  -- Calculate battle experience (each battle adds experience)
  SELECT COUNT(*) INTO battle_experience
  FROM battles
  WHERE (challenger_id = p_warrior_id OR defender_id = p_warrior_id)
    AND status = 'COMPLETED';
  
  -- Calculate tournament experience (each tournament participation adds experience)
  SELECT COUNT(*) INTO tournament_experience
  FROM tournament_participants
  WHERE warrior_id = p_warrior_id;
  
  -- Calculate win streak and bonuses from battle history
  FOR battle_record IN 
    SELECT 
      winner_id = p_warrior_id AS is_winner,
      completed_at
    FROM battles
    WHERE (challenger_id = p_warrior_id OR defender_id = p_warrior_id)
      AND status = 'COMPLETED'
    ORDER BY completed_at ASC
  LOOP
    -- Check if this battle was won
    IF battle_record.is_winner THEN
      -- Add win bonus
      win_bonus := win_bonus + 50;
      
      -- Track win streak
      IF last_result IS NULL OR last_result THEN
        current_streak := current_streak + 1;
      ELSE
        current_streak := 1;
      END IF;
      
      -- Update max streak if current streak is higher
      IF current_streak > win_streak THEN
        win_streak := current_streak;
      END IF;
      
      last_result := TRUE;
    ELSE
      -- Reset streak on loss
      current_streak := 0;
      last_result := FALSE;
    END IF;
  END LOOP;
  
  -- Calculate final power level
  -- Base power + win bonus + battle experience bonus + tournament experience bonus + streak bonus
  final_power := base_power + win_bonus + (battle_experience * 10) + (tournament_experience * 10) + (win_streak * 25);
  
  RETURN final_power;
END;
$$ LANGUAGE plpgsql;

-- Recalculate power levels for all warriors using the updated function
UPDATE warriors
SET power_level = calculate_warrior_power_level(id);

-- Recalculate ranks based on the new power levels
SELECT calculate_warrior_rank();
