-- 086_add_missing_fk_indexes.sql
-- Add missing indexes on foreign key columns.
-- Needed for efficient CASCADE deletes and JOINs.

CREATE INDEX IF NOT EXISTS idx_device_profiles_linked_customer_id
  ON public.device_profiles (linked_customer_id);

CREATE INDEX IF NOT EXISTS idx_game_answers_question_id
  ON public.game_answers (question_id);

CREATE INDEX IF NOT EXISTS idx_game_answers_session_customer_id
  ON public.game_answers (session_customer_id);

CREATE INDEX IF NOT EXISTS idx_game_prizes_game_session_id
  ON public.game_prizes (game_session_id);

CREATE INDEX IF NOT EXISTS idx_game_prizes_session_customer_id
  ON public.game_prizes (session_customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_issued_by
  ON public.invoices (issued_by);

CREATE INDEX IF NOT EXISTS idx_invoices_location_id
  ON public.invoices (location_id);

CREATE INDEX IF NOT EXISTS idx_invoices_payment_method_id
  ON public.invoices (payment_method_id);

CREATE INDEX IF NOT EXISTS idx_invoices_voided_by
  ON public.invoices (voided_by);

CREATE INDEX IF NOT EXISTS idx_product_ratings_session_customer_id
  ON public.product_ratings (session_customer_id);

CREATE INDEX IF NOT EXISTS idx_reservation_settings_updated_by
  ON public.reservation_settings (updated_by);

CREATE INDEX IF NOT EXISTS idx_reservation_tables_assigned_by
  ON public.reservation_tables (assigned_by);

CREATE INDEX IF NOT EXISTS idx_reservations_confirmed_by
  ON public.reservations (confirmed_by);

CREATE INDEX IF NOT EXISTS idx_reservations_session_id
  ON public.reservations (session_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_closures_created_by
  ON public.restaurant_closures (created_by);

CREATE INDEX IF NOT EXISTS idx_restaurants_games_prize_product_id
  ON public.restaurants (games_prize_product_id);

CREATE INDEX IF NOT EXISTS idx_staff_registration_requests_reviewed_by
  ON public.staff_registration_requests (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_staff_registration_requests_role_id
  ON public.staff_registration_requests (role_id);

CREATE INDEX IF NOT EXISTS idx_staff_time_off_approved_by
  ON public.staff_time_off (approved_by);

CREATE INDEX IF NOT EXISTS idx_table_status_history_changed_by
  ON public.table_status_history (changed_by);

CREATE INDEX IF NOT EXISTS idx_vendus_sync_log_initiated_by
  ON public.vendus_sync_log (initiated_by);

CREATE INDEX IF NOT EXISTS idx_waiter_calls_acknowledged_by
  ON public.waiter_calls (acknowledged_by);
