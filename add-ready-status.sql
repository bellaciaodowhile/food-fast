-- Add 'ready' status to the sales table
-- This represents orders that are prepared by kitchen but not yet delivered

-- First, let's see the current constraint (if any)
-- ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;

-- Add the new status option
-- Note: In PostgreSQL, we need to add the new value to the enum or recreate the constraint
-- Since we might be using a simple text field with check constraint, let's update it

-- If using enum type, we would do:
-- ALTER TYPE order_status ADD VALUE 'ready';

-- If using check constraint, we update it:
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check 
  CHECK (status IN ('pending', 'ready', 'completed', 'cancelled'));

-- Add comment to document the flow
COMMENT ON COLUMN sales.status IS 'Order status: pending (created) → ready (kitchen finished) → completed (delivered to customer) | cancelled';

-- Update any existing orders that might be in an invalid state (optional)
-- UPDATE sales SET status = 'pending' WHERE status NOT IN ('pending', 'ready', 'completed', 'cancelled');