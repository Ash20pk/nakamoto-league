-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE tournament_format AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS');
CREATE TYPE battle_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE warrior_specialty AS ENUM ('STRIKER', 'GRAPPLER', 'WEAPONS_MASTER', 'MIXED');

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create dojos table
CREATE TABLE dojos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location TEXT,
  banner_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(name, owner_id)
);

-- Create warriors table
CREATE TABLE warriors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  dojo_id UUID REFERENCES dojos(id) ON DELETE SET NULL,
  specialty warrior_specialty NOT NULL,
  power_level INTEGER DEFAULT 100 NOT NULL,
  rank INTEGER DEFAULT 1000 NOT NULL,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(name, owner_id)
);

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  format tournament_format NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL,
  entry_fee DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  prize_pool JSONB NOT NULL,
  rules TEXT[] NOT NULL,
  requirements JSONB DEFAULT '{"minRank": 1, "minPowerLevel": 1}'::jsonb NOT NULL,
  banner_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create tournament_participants table
CREATE TABLE tournament_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  warrior_id UUID REFERENCES warriors(id) ON DELETE CASCADE NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT DEFAULT 'REGISTERED' NOT NULL,
  UNIQUE(tournament_id, warrior_id)
);

-- Create battles table
CREATE TABLE battles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  challenger_id UUID REFERENCES warriors(id) ON DELETE CASCADE NOT NULL,
  defender_id UUID REFERENCES warriors(id) ON DELETE CASCADE NOT NULL,
  status battle_status DEFAULT 'PENDING' NOT NULL,
  winner_id UUID REFERENCES warriors(id) ON DELETE SET NULL,
  battle_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create battle_submissions table
CREATE TABLE battle_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE NOT NULL,
  warrior_id UUID REFERENCES warriors(id) ON DELETE CASCADE NOT NULL,
  solution_url TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(battle_id, warrior_id)
);

-- Create achievements table
CREATE TABLE achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  warrior_id UUID REFERENCES warriors(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  metadata JSONB
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dojos ENABLE ROW LEVEL SECURITY;
ALTER TABLE warriors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (auth.uid() = id);

-- Dojos policies
CREATE POLICY "Dojos are viewable by everyone" 
ON dojos FOR SELECT USING (true);

CREATE POLICY "Users can create dojos" 
ON dojos FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their dojos" 
ON dojos FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their dojos" 
ON dojos FOR DELETE USING (auth.uid() = owner_id);

-- Warriors policies
CREATE POLICY "Warriors are viewable by everyone" 
ON warriors FOR SELECT USING (true);

CREATE POLICY "Users can create warriors" 
ON warriors FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their warriors" 
ON warriors FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their warriors" 
ON warriors FOR DELETE USING (auth.uid() = owner_id);

-- Tournaments policies
CREATE POLICY "Tournaments are viewable by everyone" 
ON tournaments FOR SELECT USING (true);

CREATE POLICY "Users can create tournaments" 
ON tournaments FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their tournaments" 
ON tournaments FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their tournaments" 
ON tournaments FOR DELETE USING (auth.uid() = organizer_id);

-- Tournament participants policies
CREATE POLICY "Tournament participants are viewable by everyone" 
ON tournament_participants FOR SELECT USING (true);

CREATE POLICY "Warriors can join tournaments" 
ON tournament_participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM warriors
    WHERE id = tournament_participants.warrior_id
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Warriors can leave tournaments" 
ON tournament_participants FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM warriors
    WHERE id = tournament_participants.warrior_id
    AND owner_id = auth.uid()
  )
);

-- Battles policies
CREATE POLICY "Battles are viewable by everyone" 
ON battles FOR SELECT USING (true);

CREATE POLICY "Warriors can create battles" 
ON battles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM warriors
    WHERE id = battles.challenger_id
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Battle participants can update battles" 
ON battles FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM warriors
    WHERE id IN (battles.challenger_id, battles.defender_id)
    AND owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = battles.tournament_id
    AND organizer_id = auth.uid()
  )
);

-- Battle submissions policies
CREATE POLICY "Battle submissions are viewable by everyone" 
ON battle_submissions FOR SELECT USING (true);

CREATE POLICY "Warriors can submit to their battles" 
ON battle_submissions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM warriors w
    JOIN battles b ON (w.id = b.challenger_id OR w.id = b.defender_id)
    WHERE w.id = battle_submissions.warrior_id
    AND w.owner_id = auth.uid()
    AND b.id = battle_submissions.battle_id
  )
);

-- Achievements policies
CREATE POLICY "Achievements are viewable by everyone" 
ON achievements FOR SELECT USING (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_dojos_updated_at
  BEFORE UPDATE ON dojos
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_warriors_updated_at
  BEFORE UPDATE ON warriors
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_battles_updated_at
  BEFORE UPDATE ON battles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

  -- Auto-create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

  -- Handle battle completion
CREATE OR REPLACE FUNCTION handle_battle_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    -- Create notifications
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT w.owner_id,
           'Battle Completed',
           'Your battle has been completed!',
           'BATTLE_COMPLETED',
           jsonb_build_object('battle_id', NEW.id, 'warrior_id', w.id)
    FROM warriors w
    WHERE w.id IN (NEW.challenger_id, NEW.defender_id);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_battle_completion
  AFTER UPDATE ON battles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_battle_completion();

  