-- =============================================
-- Migration 044: Fix close_session_and_free_table function
-- Corrects table_id_var type from UUID to INTEGER
-- =============================================

-- Drop and recreate function with correct type
DROP FUNCTION IF EXISTS close_session_and_free_table(UUID);

CREATE OR REPLACE FUNCTION close_session_and_free_table(
  session_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  table_id_var INTEGER;  -- FIXED: Changed from UUID to INTEGER
BEGIN
  -- Get table_id from session
  SELECT table_id INTO table_id_var
  FROM sessions
  WHERE id = session_id_param;

  -- Close the session
  UPDATE sessions
  SET
    status = 'closed',
    closed_at = NOW()
  WHERE id = session_id_param;

  -- Update table status to available if table exists
  IF table_id_var IS NOT NULL THEN
    UPDATE tables
    SET
      current_session_id = NULL
    WHERE id = table_id_var;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION close_session_and_free_table(UUID) TO anon;

COMMENT ON FUNCTION close_session_and_free_table IS
  'Closes a session and frees the table by setting status to available. Fixed: table_id_var is INTEGER.';
