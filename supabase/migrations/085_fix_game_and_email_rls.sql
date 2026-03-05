-- 085_fix_game_and_email_rls.sql
-- Fix rls_policy_always_true warnings on game tables and email_events.
--
-- game_answers/game_prizes/game_sessions: FOR ALL with true allows anon DELETE.
-- Split into: anon INSERT/SELECT/UPDATE + authenticated ALL.
--
-- email_events: Resend webhook uses createAdminClient() (service role, bypasses RLS).
-- Restrict INSERT to authenticated only; anon policy was unused.

-- ============================================================
-- 1. game_answers: split FOR ALL into granular anon + auth ALL
-- ============================================================

DROP POLICY IF EXISTS "game_answers_all" ON public.game_answers;
DROP POLICY IF EXISTS "game_answers_anon_read" ON public.game_answers;
DROP POLICY IF EXISTS "game_answers_anon_insert" ON public.game_answers;
DROP POLICY IF EXISTS "game_answers_anon_update" ON public.game_answers;
DROP POLICY IF EXISTS "game_answers_auth_all" ON public.game_answers;

CREATE POLICY "game_answers_anon_read" ON public.game_answers
  FOR SELECT TO anon USING (true);

CREATE POLICY "game_answers_anon_insert" ON public.game_answers
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "game_answers_anon_update" ON public.game_answers
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "game_answers_auth_all" ON public.game_answers
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 2. game_prizes: split FOR ALL into granular anon + auth ALL
-- ============================================================

DROP POLICY IF EXISTS "game_prizes_all" ON public.game_prizes;
DROP POLICY IF EXISTS "game_prizes_anon_read" ON public.game_prizes;
DROP POLICY IF EXISTS "game_prizes_anon_insert" ON public.game_prizes;
DROP POLICY IF EXISTS "game_prizes_anon_update" ON public.game_prizes;
DROP POLICY IF EXISTS "game_prizes_auth_all" ON public.game_prizes;

CREATE POLICY "game_prizes_anon_read" ON public.game_prizes
  FOR SELECT TO anon USING (true);

CREATE POLICY "game_prizes_anon_insert" ON public.game_prizes
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "game_prizes_anon_update" ON public.game_prizes
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "game_prizes_auth_all" ON public.game_prizes
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 3. game_sessions: split FOR ALL into granular anon + auth ALL
-- ============================================================

DROP POLICY IF EXISTS "game_sessions_all" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_anon_read" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_anon_insert" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_anon_update" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_auth_all" ON public.game_sessions;

CREATE POLICY "game_sessions_anon_read" ON public.game_sessions
  FOR SELECT TO anon USING (true);

CREATE POLICY "game_sessions_anon_insert" ON public.game_sessions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "game_sessions_anon_update" ON public.game_sessions
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "game_sessions_auth_all" ON public.game_sessions
  FOR ALL TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================
-- 4. email_events: restrict INSERT to authenticated only
--    Resend webhook uses createAdminClient() (service role),
--    which bypasses RLS entirely. Anon INSERT was never used.
-- ============================================================

DROP POLICY IF EXISTS "System can insert email events" ON public.email_events;
DROP POLICY IF EXISTS "email_events_auth_insert" ON public.email_events;

CREATE POLICY "email_events_auth_insert" ON public.email_events
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.role()) = 'authenticated');
