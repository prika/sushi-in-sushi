/**
 * Loyalty Tier Value Object
 * Computes customer loyalty tier from accumulated points.
 *
 * Tier thresholds:
 * - bronze: 0–99 points
 * - silver: 100–499 points
 * - gold: 500–999 points
 * - platinum: 1000+ points
 */

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

/**
 * Computes the loyalty tier from customer points.
 *
 * @param points - Accumulated loyalty points (e.g. 1 point per 1€ spent)
 * @returns The tier string for the given point range
 */
export function calculateTier(points: number): LoyaltyTier {
  if (points >= 1000) return "platinum";
  if (points >= 500) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
}
