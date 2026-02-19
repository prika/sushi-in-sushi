-- Allow admins to update/insert/delete products (SELECT already exists: "Anyone can view products")
-- Uses staff.auth_user_id = auth.uid() and role admin (compatible with Supabase Auth).

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
ON products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.auth_user_id = auth.uid()
    AND r.name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.auth_user_id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Also allow service_role for API/server use
DROP POLICY IF EXISTS "Service role can manage products" ON products;
CREATE POLICY "Service role can manage products"
ON products FOR ALL TO service_role
USING (true) WITH CHECK (true);
