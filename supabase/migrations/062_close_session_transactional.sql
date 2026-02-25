-- =============================================
-- Migration 062: Enhanced transactional close session function
-- Replaces separate API calls with a single atomic DB function
-- that closes session, frees table, and cancels orders in one transaction
-- =============================================

-- Add close_reason column to sessions if it doesn't exist
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS close_reason TEXT;

CREATE OR REPLACE FUNCTION close_session_transactional(
  p_session_id UUID,
  p_cancel_orders BOOLEAN DEFAULT TRUE,
  p_close_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_id UUID;
  v_session_status TEXT;
  v_cancelled_count INTEGER := 0;
BEGIN
  -- Get session info and lock the row
  SELECT table_id, status INTO v_table_id, v_session_status
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sessão não encontrada'
    );
  END IF;

  IF v_session_status = 'closed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sessão já está encerrada'
    );
  END IF;

  -- Close the session
  UPDATE sessions
  SET
    status = 'closed',
    closed_at = NOW(),
    close_reason = p_close_reason
  WHERE id = p_session_id;

  -- Free the table and reset status to available
  IF v_table_id IS NOT NULL THEN
    UPDATE tables
    SET
      current_session_id = NULL,
      status = 'available'
    WHERE id = v_table_id;
  END IF;

  -- Cancel non-delivered orders if requested
  IF p_cancel_orders THEN
    WITH cancelled AS (
      UPDATE orders
      SET status = 'cancelled'
      WHERE session_id = p_session_id
        AND status IN ('pending', 'preparing', 'ready')
      RETURNING id
    )
    SELECT count(*) INTO v_cancelled_count FROM cancelled;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'table_id', v_table_id,
    'cancelled_orders', v_cancelled_count,
    'close_reason', p_close_reason
  );
END;
$$;

-- No GRANT to anon/authenticated: only callable via service role (createAdminClient)
REVOKE ALL ON FUNCTION close_session_transactional(UUID, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION close_session_transactional(UUID, BOOLEAN, TEXT) FROM anon;
REVOKE ALL ON FUNCTION close_session_transactional(UUID, BOOLEAN, TEXT) FROM authenticated;

COMMENT ON FUNCTION close_session_transactional IS
  'Atomically closes a session, frees its table, and optionally cancels pending orders. Only callable via service role.';
