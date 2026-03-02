-- Migration 074: Add allergens to session_customers
-- Allows customers to declare their allergen sensitivities during identification

ALTER TABLE session_customers
ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
