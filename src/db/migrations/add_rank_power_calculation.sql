-- Add functions to calculate and update warrior rank and power level

-- Function to calculate power level based on battle performance and activities
CREATE OR REPLACE FUNCTION calculate_warrior_power_level(warrior_id UUID)
RETURNS INT AS $$
DECLARE
  base_power INT := 100; -- Starting power level
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
  WHERE (challenger_id = warrior_id OR defender_id = warrior_id)
    AND status = 'COMPLETED';
  
  -- Calculate tournament experience (each tournament participation adds experience)
  SELECT COUNT(*) INTO tournament_experience
  FROM tournament_participants
  WHERE warrior_id = warrior_id;
  
  -- Calculate win streak and bonuses from battle history
  FOR battle_record IN 
    SELECT 
      winner_id = warrior_id AS is_winner,
      completed_at
    FROM battles
    WHERE (challenger_id = warrior_id OR defender_id = warrior_id)
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

-- Function to calculate rank based on power level
-- Rank is 1-100, with 1 being the highest rank
CREATE OR REPLACE FUNCTION calculate_warrior_rank()
RETURNS VOID AS $$
DECLARE
  warrior_record RECORD;
  rank_counter INT := 1;
BEGIN
  -- First update all power levels
  FOR warrior_record IN SELECT id FROM warriors LOOP
    UPDATE warriors
    SET power_level = calculate_warrior_power_level(warrior_record.id)
    WHERE id = warrior_record.id;
  END LOOP;
  
  -- Then assign ranks based on power level (highest power = rank 1)
  FOR warrior_record IN 
    SELECT id 
    FROM warriors 
    ORDER BY power_level DESC
  LOOP
    UPDATE warriors
    SET rank = rank_counter
    WHERE id = warrior_record.id;
    
    rank_counter := rank_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update a single warrior's power level
CREATE OR REPLACE FUNCTION update_warrior_power_level(warrior_id UUID)
RETURNS INT AS $$
DECLARE
  new_power INT;
BEGIN
  -- Calculate and update power level
  SELECT calculate_warrior_power_level(warrior_id) INTO new_power;
  
  UPDATE warriors
  SET power_level = new_power
  WHERE id = warrior_id;
  
  -- Recalculate all ranks since one warrior's power changed
  PERFORM calculate_warrior_rank();
  
  RETURN new_power;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update power and rank after battle completion
CREATE OR REPLACE FUNCTION update_warrior_stats_after_battle()
RETURNS TRIGGER AS $$
BEGIN
  -- If a battle is completed, update stats for both warriors
  IF (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED') OR 
     (NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL) THEN
    
    -- Update challenger stats
    UPDATE warriors
    SET 
      win_rate = calculate_warrior_win_rate(NEW.challenger_id),
      power_level = calculate_warrior_power_level(NEW.challenger_id)
    WHERE id = NEW.challenger_id;
    
    -- Update defender stats
    UPDATE warriors
    SET 
      win_rate = calculate_warrior_win_rate(NEW.defender_id),
      power_level = calculate_warrior_power_level(NEW.defender_id)
    WHERE id = NEW.defender_id;
    
    -- Recalculate all ranks
    PERFORM calculate_warrior_rank();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update power and rank after tournament participation
CREATE OR REPLACE FUNCTION update_warrior_stats_after_tournament()
RETURNS TRIGGER AS $$
BEGIN
  -- When a warrior joins a tournament, update their power level
  UPDATE warriors
  SET power_level = calculate_warrior_power_level(NEW.warrior_id)
  WHERE id = NEW.warrior_id;
  
  -- Recalculate all ranks
  PERFORM calculate_warrior_rank();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_win_rates_after_battle ON battles;

-- Create a new trigger that updates all stats
CREATE TRIGGER update_warrior_stats_after_battle
AFTER UPDATE ON battles
FOR EACH ROW
EXECUTE FUNCTION update_warrior_stats_after_battle();

-- Create a trigger on the tournament_participants table
CREATE TRIGGER update_stats_after_tournament_join
AFTER INSERT ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION update_warrior_stats_after_tournament();

-- Update all warriors with their current stats
DO $$
BEGIN
  -- This will update power levels and then ranks for all warriors
  PERFORM calculate_warrior_rank();
END;
$$ LANGUAGE plpgsql;
