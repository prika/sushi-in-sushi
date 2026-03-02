-- 061_set_product_ingredients_rpc.sql
-- Atomic replace of product ingredients (delete + insert in a single transaction)

CREATE OR REPLACE FUNCTION set_product_ingredients(
  p_product_id UUID,
  p_ingredients JSONB DEFAULT '[]'::JSONB
) RETURNS VOID AS $$
BEGIN
  DELETE FROM product_ingredients WHERE product_id = p_product_id;

  IF jsonb_array_length(p_ingredients) > 0 THEN
    INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
    SELECT p_product_id,
           (item->>'ingredientId')::UUID,
           (item->>'quantity')::NUMERIC
    FROM jsonb_array_elements(p_ingredients) AS item;
  END IF;
END;
$$ LANGUAGE plpgsql;
