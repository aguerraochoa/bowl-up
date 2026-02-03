-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table (one team per user)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  league TEXT DEFAULT '',
  features JSONB DEFAULT '{"betTracker": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_score INTEGER NOT NULL,
  strikes_frames_1_to_9 INTEGER NOT NULL DEFAULT 0,
  spares_frames_1_to_9 INTEGER NOT NULL DEFAULT 0,
  tenth_frame TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Debt tags table
CREATE TABLE IF NOT EXISTS debt_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES debt_tags(id) ON DELETE SET NULL,
  custom_name TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  paid_by UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'games', 'custom')),
  game_counts JSONB,
  custom_amounts JSONB,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Debt split between (many-to-many relationship)
CREATE TABLE IF NOT EXISTS debt_split_between (
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (debt_id, player_id)
);

-- Bet tallies table (for teams with betTracker enabled)
CREATE TABLE IF NOT EXISTS bet_tallies (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  tally INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (team_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_games_team_id ON games(team_id);
CREATE INDEX IF NOT EXISTS idx_games_player_id ON games(player_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_debt_tags_team_id ON debt_tags(team_id);
CREATE INDEX IF NOT EXISTS idx_debts_team_id ON debts(team_id);
CREATE INDEX IF NOT EXISTS idx_debt_split_between_debt_id ON debt_split_between(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_split_between_player_id ON debt_split_between(player_id);
CREATE INDEX IF NOT EXISTS idx_bet_tallies_team_id ON bet_tallies(team_id);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_split_between ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_tallies ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own team's data
CREATE POLICY "Users can view their own team"
  ON teams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own team"
  ON teams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their team's players"
  ON players FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their team's players"
  ON players FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their team's players"
  ON players FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their team's players"
  ON players FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their team's games"
  ON games FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their team's games"
  ON games FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their team's games"
  ON games FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their team's games"
  ON games FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their team's debt tags"
  ON debt_tags FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their team's debt tags"
  ON debt_tags FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their team's debt tags"
  ON debt_tags FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their team's debt tags"
  ON debt_tags FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their team's debts"
  ON debts FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their team's debts"
  ON debts FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their team's debts"
  ON debts FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their team's debts"
  ON debts FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their team's debt splits"
  ON debt_split_between FOR SELECT
  USING (debt_id IN (SELECT id FROM debts WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert their team's debt splits"
  ON debt_split_between FOR INSERT
  WITH CHECK (debt_id IN (SELECT id FROM debts WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())));

CREATE POLICY "Users can update their team's debt splits"
  ON debt_split_between FOR UPDATE
  USING (debt_id IN (SELECT id FROM debts WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete their team's debt splits"
  ON debt_split_between FOR DELETE
  USING (debt_id IN (SELECT id FROM debts WHERE team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())));

CREATE POLICY "Users can view their team's bet tallies"
  ON bet_tallies FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their team's bet tallies"
  ON bet_tallies FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their team's bet tallies"
  ON bet_tallies FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their team's bet tallies"
  ON bet_tallies FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE user_id = auth.uid()));

-- Function to automatically create team when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teams (user_id, name, league)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'team_name', 'My Team'), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create team on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user email by team name (for login)
CREATE OR REPLACE FUNCTION get_user_email_by_team_name(team_name TEXT)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT au.email INTO user_email
  FROM teams t
  JOIN auth.users au ON t.user_id = au.id
  WHERE t.name = team_name
  LIMIT 1;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
