-- Enable Supabase Realtime for game_answers (leaderboard live updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_answers;
  END IF;
END $$;
