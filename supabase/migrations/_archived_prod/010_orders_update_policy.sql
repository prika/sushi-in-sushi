-- =============================================
-- FIX: ADD UPDATE POLICY FOR ORDERS
-- Without this policy, order status updates are blocked by RLS
-- =============================================

-- Allow anyone to update orders (for kitchen and waiter panels)
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
CREATE POLICY "Anyone can update orders" ON orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- Also add DELETE policy for order cancellation
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;
CREATE POLICY "Anyone can delete orders" ON orders
    FOR DELETE USING (true);
