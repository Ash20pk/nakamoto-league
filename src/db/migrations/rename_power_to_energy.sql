-- Add energy system for warriors
-- This migration adds energy columns and related functions

-- First, add the new columns
ALTER TABLE warriors 
ADD COLUMN IF NOT EXISTS energy INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS energy_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS experience INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_check_in DATE DEFAULT NULL;

-- Update the ranking system to use power_level as primary ranking factor
CREATE OR REPLACE FUNCTION update_warrior_ranks()
RETURNS VOID AS $$
DECLARE
  warrior_record RECORD;
  current_rank INT := 1;
BEGIN
  -- Update all warriors' ranks based on power_level (primary) and win_rate (secondary)
  FOR warrior_record IN 
    SELECT id
    FROM warriors
    ORDER BY power_level DESC, win_rate DESC
  LOOP
    UPDATE warriors
    SET rank = current_rank
    WHERE id = warrior_record.id;
    
    current_rank := current_rank + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to regenerate warrior energy
CREATE OR REPLACE FUNCTION regenerate_warrior_energy(p_warrior_id UUID)
RETURNS INT AS $$
DECLARE
  current_energy INT;
  max_energy INT;
  last_updated TIMESTAMP;
  hours_passed FLOAT;
  regen_rate INT;
  new_energy INT;
BEGIN
  -- Get current energy and last update time
  SELECT energy, energy_last_updated, level * 100 
  INTO current_energy, last_updated, max_energy
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Calculate hours passed since last update
  hours_passed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_updated)) / 3600;
  
  -- Regeneration rate: 10% of max energy per hour
  regen_rate := max_energy * 0.1;
  
  -- Calculate new energy
  new_energy := current_energy + (regen_rate * hours_passed);
  
  -- Cap at max energy
  IF new_energy > max_energy THEN
    new_energy := max_energy;
  END IF;
  
  -- Update the warrior's energy
  UPDATE warriors
  SET 
    energy = new_energy,
    energy_last_updated = CURRENT_TIMESTAMP
  WHERE id = p_warrior_id;
  
  RETURN new_energy;
END;
$$ LANGUAGE plpgsql;

-- Create function for daily check-in
CREATE OR REPLACE FUNCTION warrior_daily_check_in(p_warrior_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_check DATE;
  current_energy INT;
  max_energy INT;
  bonus_energy INT := 50;
  success BOOLEAN := FALSE;
BEGIN
  -- Get the warrior's last check-in date and current energy
  SELECT last_check_in, energy, level * 100
  INTO last_check, current_energy, max_energy
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Check if the warrior has already checked in today
  IF last_check = CURRENT_DATE THEN
    -- Already checked in today
    success := FALSE;
  ELSE
    -- Award the bonus energy
    UPDATE warriors
    SET 
      energy = LEAST(current_energy + bonus_energy, max_energy),
      last_check_in = CURRENT_DATE
    WHERE id = p_warrior_id;
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;

-- Create function to spend energy
CREATE OR REPLACE FUNCTION spend_warrior_energy(p_warrior_id UUID, p_amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  current_energy INT;
  success BOOLEAN := FALSE;
BEGIN
  -- First regenerate energy to make sure it's up to date
  PERFORM regenerate_warrior_energy(p_warrior_id);
  
  -- Get current energy
  SELECT energy INTO current_energy
  FROM warriors
  WHERE id = p_warrior_id;
  
  -- Check if the warrior has enough energy
  IF current_energy >= p_amount THEN
    -- Spend the energy
    UPDATE warriors
    SET energy = energy - p_amount
    WHERE id = p_warrior_id;
    
    success := TRUE;
  ELSE
    -- Not enough energy
    success := FALSE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate experience
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

-- Create function to calculate level based on experience
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

-- Create function to update all warrior stats
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
  
  -- Update the warrior's stats
  UPDATE warriors
  SET 
    win_rate = new_win_rate,
    experience = new_experience,
    level = new_level
  WHERE id = p_warrior_id;
  
  -- Regenerate energy
  PERFORM regenerate_warrior_energy(p_warrior_id);
  
  -- Update power_level separately (handled by existing function)
  PERFORM update_warrior_power_level(p_warrior_id);
  
  -- Update ranks after stats have been updated
  PERFORM update_warrior_ranks();
END;
$$ LANGUAGE plpgsql;
