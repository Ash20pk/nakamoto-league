-- Warrior Stats System for Nakamoto League
-- This migration adds and defines the complete warrior statistics system

-- First, add all required columns to the warriors table
ALTER TABLE warriors 
ADD COLUMN IF NOT EXISTS win_rate FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS experience INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS power INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS power_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_check_in DATE DEFAULT NULL;

-- Create a function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_warrior_win_rate(p_warrior_id UUID)
RETURNS FLOAT AS $$
DECLARE
  total_battles INT;
  won_battles INT;
  win_rate FLOAT;
BEGIN
  -- Count total completed battles the warrior participated in
  SELECT COUNT(*) INTO total_battles
  FROM battles
  WHERE (challenger_id = p_warrior_id OR defender_id = p_warrior_id)
    AND status = 'COMPLETED';
  
  -- Count battles won by the warrior
  SELECT COUNT(*) INTO won_battles
  FROM battles
  WHERE winner_id = p_warrior_id
    AND status = 'COMPLETED';
  
  -- Calculate win rate (handle division by zero)
  IF total_battles = 0 THEN
    win_rate := 0.0;
  ELSE
    win_rate := (won_battles::FLOAT / total_battles::FLOAT) * 100.0;
  END IF;
  
  RETURN win_rate;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate experience based on activities
CREATE OR REPLACE FUNCTION calculate_warrior_experience(p_warrior_id UUID)
RETURNS INT AS $$
DECLARE
  battle_exp INT := 0;
  tournament_exp INT := 0;
  win_exp INT := 0;
  total_exp INT;
BEGIN
  -- Experience from battles (10 XP per battle)
  SELECT COUNT(*) * 10 INTO battle_exp
  FROM battles
  WHERE (challenger_id = p_warrior_id OR defender_id = p_warrior_id)
    AND status = 'COMPLETED';
  
  -- Experience from tournament participation (25 XP per tournament)
  SELECT COUNT(*) * 25 INTO tournament_exp
  FROM tournament_participants
  WHERE warrior_id = p_warrior_id;
  
  -- Experience from wins (50 XP per win)
  SELECT COUNT(*) * 50 INTO win_exp
  FROM battles
  WHERE winner_id = p_warrior_id
    AND status = 'COMPLETED';
  
  -- Calculate total experience
  total_exp := battle_exp + tournament_exp + win_exp;
  
  RETURN total_exp;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate warrior level based on experience
CREATE OR REPLACE FUNCTION calculate_warrior_level(experience INT)
RETURNS INT AS $$
DECLARE
  level INT;
BEGIN
  -- Level formula: Each level requires more experience than the last
  -- Level 1: 0-99 XP
  -- Level 2: 100-299 XP
  -- Level 3: 300-599 XP
  -- And so on with an increasing curve
  
  IF experience < 100 THEN
    level := 1;
  ELSIF experience < 300 THEN
    level := 2;
  ELSIF experience < 600 THEN
    level := 3;
  ELSIF experience < 1000 THEN
    level := 4;
  ELSIF experience < 1500 THEN
    level := 5;
  ELSIF experience < 2100 THEN
    level := 6;
  ELSIF experience < 2800 THEN
    level := 7;
  ELSIF experience < 3600 THEN
    level := 8;
  ELSIF experience < 4500 THEN
    level := 9;
  ELSE
    -- For higher levels, use a formula
    level := 10 + ((experience - 4500) / 1000);
  END IF;
  
  RETURN level;
END;
$$ LANGUAGE plpgsql;

-- Create a function to regenerate power over time
CREATE OR REPLACE FUNCTION regenerate_warrior_power(p_warrior_id UUID)
RETURNS INT AS $$
DECLARE
  current_power INT;
  max_power INT;
  last_updated TIMESTAMP;
  hours_passed FLOAT;
  regen_rate INT;
  new_power INT;
BEGIN
  -- Get current power and last update time
  SELECT power, power_last_updated, level * 100 
  INTO current_power, last_updated, max_power
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Calculate hours passed since last update
  hours_passed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) / 3600;
  
  -- Regeneration rate: 10% of max power per hour
  regen_rate := max_power * 0.1;
  
  -- Calculate new power
  new_power := current_power + (regen_rate * hours_passed);
  
  -- Cap at max power
  IF new_power > max_power THEN
    new_power := max_power;
  END IF;
  
  -- Update the warrior's power
  UPDATE warriors
  SET 
    power = new_power,
    power_last_updated = CURRENT_TIMESTAMP
  WHERE id = p_warrior_id;
  
  RETURN new_power;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate and update all warrior stats
CREATE OR REPLACE FUNCTION update_warrior_stats(p_warrior_id UUID)
RETURNS VOID AS $$
DECLARE
  new_win_rate FLOAT;
  new_experience INT;
  new_level INT;
BEGIN
  -- Calculate new stats
  new_win_rate := calculate_warrior_win_rate(p_warrior_id);
  new_experience := calculate_warrior_experience(p_warrior_id);
  new_level := calculate_warrior_level(new_experience);
  
  -- Update the warrior
  UPDATE warriors
  SET 
    win_rate = new_win_rate,
    experience = new_experience,
    level = new_level
  WHERE id = p_warrior_id;
  
  -- Also regenerate power
  PERFORM regenerate_warrior_power(p_warrior_id);
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate warrior rank based on experience and win rate
CREATE OR REPLACE FUNCTION calculate_warrior_ranks()
RETURNS VOID AS $$
DECLARE
  warrior_record RECORD;
  rank_counter INT := 1;
BEGIN
  -- First update all warriors' stats
  FOR warrior_record IN SELECT id FROM warriors LOOP
    PERFORM update_warrior_stats(warrior_record.id);
  END LOOP;
  
  -- Then assign ranks based on a combination of level and win rate
  -- This creates a more balanced ranking system that values both progression and skill
  FOR warrior_record IN 
    SELECT id 
    FROM warriors 
    ORDER BY level DESC, win_rate DESC
  LOOP
    UPDATE warriors
    SET rank = rank_counter
    WHERE id = warrior_record.id;
    
    rank_counter := rank_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to spend power on activities
CREATE OR REPLACE FUNCTION spend_warrior_power(p_warrior_id UUID, amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  current_power INT;
BEGIN
  -- First regenerate power
  PERFORM regenerate_warrior_power(p_warrior_id);
  
  -- Get current power
  SELECT power INTO current_power
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Check if warrior has enough power
  IF current_power < amount THEN
    RETURN FALSE;
  END IF;
  
  -- Spend power
  UPDATE warriors
  SET 
    power = power - amount,
    power_last_updated = CURRENT_TIMESTAMP
  WHERE id = p_warrior_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function for daily check-in power bonus
CREATE OR REPLACE FUNCTION warrior_daily_check_in(p_warrior_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_check DATE;
  today DATE := CURRENT_DATE;
  max_power INT;
BEGIN
  -- Get last check-in date and max power
  SELECT last_check_in, level * 100 
  INTO last_check, max_power
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Check if already checked in today
  IF last_check = today THEN
    RETURN FALSE;
  END IF;
  
  -- First regenerate power
  PERFORM regenerate_warrior_power(p_warrior_id);
  
  -- Add 50 power for check-in and update check-in date
  UPDATE warriors
  SET 
    power = LEAST(power + 50, max_power), -- Don't exceed max power
    last_check_in = today,
    power_last_updated = CURRENT_TIMESTAMP
  WHERE id = p_warrior_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update stats after battle completion
CREATE OR REPLACE FUNCTION update_stats_after_battle()
RETURNS TRIGGER AS $$
BEGIN
  -- If a battle is completed, update stats for both warriors
  IF (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED') OR 
     (NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL) THEN
    
    -- Update challenger stats
    PERFORM update_warrior_stats(NEW.challenger_id);
    
    -- Update defender stats
    PERFORM update_warrior_stats(NEW.defender_id);
    
    -- Recalculate all ranks
    PERFORM calculate_warrior_ranks();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to update stats after tournament participation
CREATE OR REPLACE FUNCTION update_stats_after_tournament()
RETURNS TRIGGER AS $$
BEGIN
  -- When a warrior joins a tournament, update their stats
  PERFORM update_warrior_stats(NEW.warrior_id);
  
  -- Recalculate all ranks
  PERFORM calculate_warrior_ranks();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_stats_after_battle ON battles;
DROP TRIGGER IF EXISTS update_stats_after_tournament ON tournament_participants;

-- Create triggers
CREATE TRIGGER update_stats_after_battle
AFTER UPDATE ON battles
FOR EACH ROW
EXECUTE FUNCTION update_stats_after_battle();

CREATE TRIGGER update_stats_after_tournament
AFTER INSERT ON tournament_participants
FOR EACH ROW
EXECUTE FUNCTION update_stats_after_tournament();

-- Update all warriors with their current stats
DO $$
BEGIN
  PERFORM calculate_warrior_ranks();
END;
$$ LANGUAGE plpgsql;
