-- Billing and Subscription Schema
-- This table tracks all payment attempts and successful transactions
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'UZS',
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT UNIQUE, -- Payme transaction ID
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add billing fields to profiles if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'payme_id') THEN
    ALTER TABLE profiles ADD COLUMN payme_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'subscription_expiry') THEN
    ALTER TABLE profiles ADD COLUMN subscription_expiry TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'auto_freeze_enabled') THEN
    ALTER TABLE profiles ADD COLUMN auto_freeze_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Enable Realtime for billing_history
ALTER PUBLICATION supabase_realtime ADD TABLE billing_history;

-- RLS Policies for billing_history
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own billing history
CREATE POLICY "Users can view own billing history"
  ON billing_history FOR SELECT
  USING (auth.uid() = profile_id);

-- Admins can view all billing history
CREATE POLICY "Admins can view all billing history"
  ON billing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only service role or specialized functions should insert/update billing records
-- For now, we allow admins to manage it for manual overrides
CREATE POLICY "Admins can manage billing history"
  ON billing_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_profile_id ON billing_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_history(status);
CREATE INDEX IF NOT EXISTS idx_profiles_payme_id ON profiles(payme_id);
