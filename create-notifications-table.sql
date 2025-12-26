-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  order_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Kitchen and admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'kitchen' OR users.role = 'admin')
    )
  );

-- Create function to send notification to seller and admin
CREATE OR REPLACE FUNCTION notify_order_status_change(
  p_order_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get seller ID from the order
  SELECT seller_id INTO v_seller_id
  FROM sales
  WHERE id = p_order_id;

  -- Get admin user ID (first admin found)
  SELECT id INTO v_admin_id
  FROM users
  WHERE role = 'admin'
  LIMIT 1;

  -- Insert notification for seller
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, order_id, created_by)
    VALUES (v_seller_id, p_title, p_message, p_type, p_order_id, auth.uid());
  END IF;

  -- Insert notification for admin (if different from seller)
  IF v_admin_id IS NOT NULL AND v_admin_id != v_seller_id THEN
    INSERT INTO notifications (user_id, title, message, type, order_id, created_by)
    VALUES (v_admin_id, p_title, p_message, p_type, p_order_id, auth.uid());
  END IF;
END;
$$;