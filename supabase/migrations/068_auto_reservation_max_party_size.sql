-- Migration 068: Add auto_reservation_max_party_size to restaurants
-- Allows per-restaurant configuration of max party size for automatic reservations

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS auto_reservation_max_party_size INTEGER DEFAULT 6;
