-- Add win_rate column to warriors table
ALTER TABLE warriors 
ADD COLUMN win_rate FLOAT DEFAULT 0.0;

-- Create a function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_warrior_win_rate(warrior_id UUID)
RETURNS FLOAT AS $$
DECLARE
  total_battles INT;
  won_battles INT;
  win_rate FLOAT;
BEGIN
  -- Count total completed battles the warrior participated in
  SELECT COUNT(*) INTO total_battles
  FROM battles
  WHERE (challenger_id = warrior_id OR defender_id = warrior_id)
    AND status = 'COMPLETED';
  
  -- Count battles won by the warrior
  SELECT COUNT(*) INTO won_battles
  FROM battles
  WHERE winner_id = warrior_id
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

-- Create a trigger function to update win_rate automatically
CREATE OR REPLACE FUNCTION update_warrior_win_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If a battle is completed, update win rates for both warriors
  IF (NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED') OR 
     (NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL) THEN
    
    -- Update challenger win rate
    UPDATE warriors
    SET win_rate = calculate_warrior_win_rate(NEW.challenger_id)
    WHERE id = NEW.challenger_id;
    
    -- Update defender win rate
    UPDATE warriors
    SET win_rate = calculate_warrior_win_rate(NEW.defender_id)
    WHERE id = NEW.defender_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the battles table
CREATE TRIGGER update_win_rates_after_battle
AFTER UPDATE ON battles
FOR EACH ROW
EXECUTE FUNCTION update_warrior_win_rate();

-- Update all existing warriors with their current win rates
DO $$
DECLARE
  warrior_record RECORD;
BEGIN
  FOR warrior_record IN SELECT id FROM warriors LOOP
    UPDATE warriors
    SET win_rate = calculate_warrior_win_rate(warrior_record.id)
    WHERE id = warrior_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
