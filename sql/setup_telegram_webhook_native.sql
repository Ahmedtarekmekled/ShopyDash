-- Enable the pg_net extension to make HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create a function that triggers the Edge Function
CREATE OR REPLACE FUNCTION trigger_telegram_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the status changed to READY_FOR_PICKUP
  IF NEW.status = 'READY_FOR_PICKUP' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Make an async HTTP POST request to the Edge Function
    PERFORM net.http_post(
      url := 'https://oxaepmflhjtiifwdjgdc.supabase.co/functions/v1/telegram-webhook',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YWVwbWZsaGp0aWlmd2RqZ2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDM0MjUsImV4cCI6MjA4NDY3OTQyNX0.fwu-1yupHNa-UHJsBTQSou09z9kJMKXa6NL9GlGw11U"}',
      body := json_build_object('record', row_to_json(NEW))::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Drop the OLD trigger from the generic "orders" table. 
-- This stops the duplicate messages (e.g. firing per sub-order).
DROP TRIGGER IF EXISTS "tr_notify_telegram_on_ready" ON "orders";

-- 2. Drop any existing trigger on parent_orders just in case
DROP TRIGGER IF EXISTS "tr_notify_telegram_on_ready" ON "parent_orders";

-- 3. Create the trigger on "parent_orders" instead!
-- Now it will only fire exactly ONE TIME when the unified parent order becomes ready.
CREATE TRIGGER "tr_notify_telegram_on_ready"
AFTER UPDATE ON "parent_orders"
FOR EACH ROW
EXECUTE FUNCTION trigger_telegram_webhook();
