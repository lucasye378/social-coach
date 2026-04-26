-- Analytics events table for tracking user actions
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  feature TEXT,
  user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by event type and feature
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_feature ON analytics_events(event_type, feature);

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anon insert (service role bypasses RLS)
CREATE POLICY "Allow anon inserts" ON analytics_events
  FOR INSERT TO anon USING (true);

CREATE POLICY "Service role all" ON analytics_events
  FOR ALL TO service_role USING (true);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_email TEXT,
  subscription_id TEXT,
  price_id TEXT,
  status TEXT DEFAULT 'active',
  period_start TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
