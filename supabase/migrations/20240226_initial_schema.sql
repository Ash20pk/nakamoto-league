-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE battle_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE tournament_format AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS');
CREATE TYPE warrior_specialty AS ENUM ('STRIKER', 'GRAPPLER', 'WEAPONS_MASTER', 'MIXED');

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dojos table
CREATE TABLE dojos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  location TEXT,
  banner_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warriors table
CREATE TABLE warriors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  dojo_id UUID REFERENCES dojos(id),
  specialty warrior_specialty NOT NULL,
  power_level INTEGER NOT NULL DEFAULT 100,
  rank INTEGER NOT NULL DEFAULT 1000,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),
  format tournament_format NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  prize_pool JSONB NOT NULL,
  rules TEXT[] NOT NULL DEFAULT '{}',
  requirements JSONB DEFAULT '{}'::JSONB,
  banner_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Participants table
CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  warrior_id UUID NOT NULL REFERENCES warriors(id),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'REGISTERED',
  UNIQUE(tournament_id, warrior_id)
);

-- Battles table
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id),
  challenger_id UUID NOT NULL REFERENCES warriors(id),
  defender_id UUID NOT NULL REFERENCES warriors(id),
  status battle_status NOT NULL DEFAULT 'PENDING',
  winner_id UUID REFERENCES warriors(id),
  battle_data JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Battle Submissions table (referenced in code but not in types)
CREATE TABLE battle_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES battles(id),
  warrior_id UUID NOT NULL REFERENCES warriors(id),
  solution_url TEXT NOT NULL,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(battle_id, warrior_id)
);

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warrior_id UUID NOT NULL REFERENCES warriors(id),
  title TEXT NOT NULL,
  description TEXT,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX idx_warriors_owner_id ON warriors(owner_id);
CREATE INDEX idx_warriors_dojo_id ON warriors(dojo_id);
CREATE INDEX idx_dojos_owner_id ON dojos(owner_id);
CREATE INDEX idx_tournaments_organizer_id ON tournaments(organizer_id);
CREATE INDEX idx_battles_tournament_id ON battles(tournament_id);
CREATE INDEX idx_battles_challenger_id ON battles(challenger_id);
CREATE INDEX idx_battles_defender_id ON battles(defender_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_warrior_id ON tournament_participants(warrior_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warriors ENABLE ROW LEVEL SECURITY;
ALTER TABLE dojos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);

-- Warriors Policies
CREATE POLICY "Warriors are viewable by everyone" 
ON warriors FOR SELECT 
USING (true);

CREATE POLICY "Users can create warriors they own" 
ON warriors FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own warriors" 
ON warriors FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own warriors" 
ON warriors FOR DELETE 
USING (auth.uid() = owner_id);

-- Dojos Policies
CREATE POLICY "Dojos are viewable by everyone" 
ON dojos FOR SELECT 
USING (true);

CREATE POLICY "Users can create dojos they own" 
ON dojos FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update dojos they own" 
ON dojos FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete dojos they own" 
ON dojos FOR DELETE 
USING (auth.uid() = owner_id);

-- Tournaments Policies
CREATE POLICY "Tournaments are viewable by everyone" 
ON tournaments FOR SELECT 
USING (true);

CREATE POLICY "Users can create tournaments they organize" 
ON tournaments FOR INSERT 
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Users can update tournaments they organize" 
ON tournaments FOR UPDATE 
USING (auth.uid() = organizer_id);

CREATE POLICY "Users can delete tournaments they organize" 
ON tournaments FOR DELETE 
USING (auth.uid() = organizer_id);

-- Tournament Participants Policies
CREATE POLICY "Tournament participants are viewable by everyone" 
ON tournament_participants FOR SELECT 
USING (true);

CREATE POLICY "Users can register their warriors for tournaments" 
ON tournament_participants FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = tournament_participants.warrior_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update their warrior's tournament registration" 
ON tournament_participants FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = tournament_participants.warrior_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Users can withdraw their warriors from tournaments" 
ON tournament_participants FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = tournament_participants.warrior_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Tournament organizers can manage participants" 
ON tournament_participants FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM tournaments
        WHERE id = tournament_participants.tournament_id
        AND organizer_id = auth.uid()
    )
);

-- Battles Policies
CREATE POLICY "Battles are viewable by everyone" 
ON battles FOR SELECT 
USING (true);

CREATE POLICY "Users can create battles with their warriors" 
ON battles FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = battles.challenger_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Participants can update their battles" 
ON battles FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE (id = battles.challenger_id OR id = battles.defender_id)
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Tournament organizers can update tournament battles" 
ON battles FOR UPDATE 
USING (
    battles.tournament_id IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM tournaments
        WHERE id = battles.tournament_id
        AND organizer_id = auth.uid()
    )
);

CREATE POLICY "Participants can delete their pending battles" 
ON battles FOR DELETE 
USING (
    status = 'PENDING' AND
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = battles.challenger_id
        AND owner_id = auth.uid()
    )
);

-- Battle Submissions Policies
CREATE POLICY "Battle submissions are viewable by participants and tournament organizers" 
ON battle_submissions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM battles b
        JOIN warriors w ON (w.id = b.challenger_id OR w.id = b.defender_id)
        WHERE b.id = battle_submissions.battle_id
        AND (
            w.owner_id = auth.uid() OR
            (b.tournament_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM tournaments t
                WHERE t.id = b.tournament_id
                AND t.organizer_id = auth.uid()
            ))
        )
    )
);

CREATE POLICY "Users can submit for their warriors" 
ON battle_submissions FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = battle_submissions.warrior_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update their warriors' submissions" 
ON battle_submissions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = battle_submissions.warrior_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their warriors' submissions" 
ON battle_submissions FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM warriors
        WHERE id = battle_submissions.warrior_id
        AND owner_id = auth.uid()
    )
);

-- Achievements Policies
CREATE POLICY "Achievements are viewable by everyone" 
ON achievements FOR SELECT 
USING (true);

CREATE POLICY "Only system can create achievements" 
ON achievements FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE username = 'system'
));

CREATE POLICY "Only system can update achievements" 
ON achievements FOR UPDATE 
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE username = 'system'
));

CREATE POLICY "Only system can delete achievements" 
ON achievements FOR DELETE 
USING (auth.uid() IN (
    SELECT id FROM profiles WHERE username = 'system'
));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON notifications FOR INSERT 
WITH CHECK (true);  -- This will typically be controlled by server functions

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" 
ON notifications FOR DELETE 
USING (user_id = auth.uid());

-- Add an additional group of policies for administrators
-- You'll need to have a way to identify admin users
-- This is a simplified example using a hypothetical admin flag in profiles

-- Example: Add admin role column to profiles
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Admin override policies
CREATE POLICY "Admins can manage all profiles" 
ON profiles FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all warriors" 
ON warriors FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all dojos" 
ON dojos FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all tournaments" 
ON tournaments FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all tournament participants" 
ON tournament_participants FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all battles" 
ON battles FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all battle submissions" 
ON battle_submissions FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all achievements" 
ON achievements FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);

CREATE POLICY "Admins can manage all notifications" 
ON notifications FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND is_admin = TRUE
    )
);