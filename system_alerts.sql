-- Phase 3: The Megaphone (System Alerts)

-- 1. Create System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'success')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;

-- 3. RLS Policies
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active alerts
CREATE POLICY "Anyone can view active alerts" 
ON system_alerts FOR SELECT 
USING (is_active = true);

-- Policy: Only Admins can manage alerts
CREATE POLICY "Admins can manage alerts" 
ON system_alerts FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
