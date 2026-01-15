-- Create celebrations table to track pending fireworks animations
CREATE TABLE IF NOT EXISTS celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  celebration_type TEXT NOT NULL CHECK (celebration_type IN ('prayer_answered', 'all_devotionals_complete')),
  related_id UUID, -- prayer_id or post_date (as text) depending on type
  post_date DATE, -- For devotional completions, the date when all members posted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shown_at TIMESTAMP WITH TIME ZONE, -- When the user actually saw the animation
  CONSTRAINT celebrations_group_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT celebrations_user_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS celebrations_user_id_idx ON celebrations(user_id);
CREATE INDEX IF NOT EXISTS celebrations_group_id_idx ON celebrations(group_id);
CREATE INDEX IF NOT EXISTS celebrations_shown_at_idx ON celebrations(shown_at);
CREATE INDEX IF NOT EXISTS celebrations_type_idx ON celebrations(celebration_type);

-- Enable RLS
ALTER TABLE celebrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own celebrations
CREATE POLICY "Users can view their own celebrations"
  ON celebrations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert celebrations for users
CREATE POLICY "System can insert celebrations"
  ON celebrations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own celebrations (to mark as shown)
CREATE POLICY "Users can update their own celebrations"
  ON celebrations
  FOR UPDATE
  USING (auth.uid() = user_id);
