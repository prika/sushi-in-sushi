/**
 * Customer Entity - Representa um cliente do programa de fidelização
 */

import { Location } from '../value-objects/Location';

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  birthDate: string | null;
  preferredLocation: Location | null;
  marketingConsent: boolean;
  points: number;
  totalSpent: number;
  visitCount: number;
  isActive: boolean;
  // Session stats (accumulated across all sessions)
  gamesPlayed: number;
  totalScore: number;
  prizesWon: number;
  prizesRedeemed: number;
  ratingsGiven: number;
  avgRatingGiven: number;
  allergens: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerData {
  email: string;
  name: string;
  phone?: string | null;
  birthDate?: string | null;
  preferredLocation?: Location | null;
  marketingConsent?: boolean;
}

export interface UpdateCustomerData {
  email?: string;
  name?: string;
  phone?: string | null;
  birthDate?: string | null;
  preferredLocation?: Location | null;
  marketingConsent?: boolean;
  points?: number;
  totalSpent?: number;
  visitCount?: number;
  isActive?: boolean;
  gamesPlayed?: number;
  totalScore?: number;
  prizesWon?: number;
  prizesRedeemed?: number;
  ratingsGiven?: number;
  avgRatingGiven?: number;
  allergens?: string[];
}

export interface CustomerFilter {
  location?: Location;
  isActive?: boolean;
  search?: string;
  hasMarketing?: boolean;
}

export interface CustomerWithHistory extends Customer {
  reservations: number;
  lastVisit: Date | null;
}
