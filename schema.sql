-- Create tables for partner connection functionality

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  connection_code TEXT UNIQUE,
  partner_id UUID REFERENCES user_profiles(id),
  mood TEXT DEFAULT 'happy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily quotes table
CREATE TABLE IF NOT EXISTS daily_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  quote_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quote_date)
);

-- Partner connection requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_connection_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_id ON user_profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_connection_code ON user_profiles(connection_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_partner_id ON user_profiles(partner_id);
CREATE INDEX IF NOT EXISTS idx_daily_quotes_user_date ON daily_quotes(user_id, quote_date);
CREATE INDEX IF NOT EXISTS idx_connection_requests_target_code ON connection_requests(target_connection_code);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Allow users to view their partner's profile
CREATE POLICY "Users can view partner profile" ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT partner_id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for daily_quotes
CREATE POLICY "Users can view their own quotes" ON daily_quotes
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can view partner quotes" ON daily_quotes
  FOR SELECT USING (
    user_id IN (
      SELECT partner_id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own quotes" ON daily_quotes
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can update their own quotes" ON daily_quotes
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for connection_requests
CREATE POLICY "Users can view their own requests" ON connection_requests
  FOR SELECT USING (
    requester_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can insert their own requests" ON connection_requests
  FOR INSERT WITH CHECK (
    requester_id IN (
      SELECT id FROM user_profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Function to generate connection code
CREATE OR REPLACE FUNCTION generate_connection_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE connection_code = code) INTO exists;
    
    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle partner connection
CREATE OR REPLACE FUNCTION connect_partners(connection_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  partner_user_id UUID;
BEGIN
  -- Get current user's ID
  SELECT id INTO current_user_id 
  FROM user_profiles 
  WHERE clerk_user_id = auth.jwt() ->> 'sub';
  
  -- Get partner's ID from connection code
  SELECT id INTO partner_user_id 
  FROM user_profiles 
  WHERE connection_code = connect_partners.connection_code;
  
  -- Check if both users exist and are not already connected
  IF current_user_id IS NULL OR partner_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF current_user_id = partner_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update both users to be connected
  UPDATE user_profiles SET partner_id = partner_user_id WHERE id = current_user_id;
  UPDATE user_profiles SET partner_id = current_user_id WHERE id = partner_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql; 