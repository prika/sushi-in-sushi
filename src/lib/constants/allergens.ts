/**
 * EU 14 mandatory allergens
 * Shared constant used across mesa page and admin interface
 */

export interface EuAllergen {
  id: string;
  label: string;
  emoji: string;
}

export const EU_ALLERGENS: EuAllergen[] = [
  { id: "gluten", label: "Glúten", emoji: "🌾" },
  { id: "crustaceans", label: "Crustáceos", emoji: "🦐" },
  { id: "eggs", label: "Ovos", emoji: "🥚" },
  { id: "fish", label: "Peixe", emoji: "🐟" },
  { id: "peanuts", label: "Amendoins", emoji: "🥜" },
  { id: "soybeans", label: "Soja", emoji: "🫘" },
  { id: "milk", label: "Leite", emoji: "🥛" },
  { id: "nuts", label: "Frutos de casca rija", emoji: "🌰" },
  { id: "celery", label: "Aipo", emoji: "🥬" },
  { id: "mustard", label: "Mostarda", emoji: "🟡" },
  { id: "sesame", label: "Sésamo", emoji: "⚪" },
  { id: "sulphites", label: "Sulfitos", emoji: "🍷" },
  { id: "lupin", label: "Tremoço", emoji: "🌱" },
  { id: "molluscs", label: "Moluscos", emoji: "🐚" },
];

/**
 * Additional allergens beyond EU-14
 * Common in Japanese cuisine and other regulatory frameworks
 */
export const EXTRA_ALLERGENS: EuAllergen[] = [
  { id: "wheat", label: "Trigo", emoji: "🌾" },
  { id: "shellfish", label: "Marisco", emoji: "🦞" },
  { id: "buckwheat", label: "Soba (trigo sarraceno)", emoji: "🍜" },
  { id: "gelatin", label: "Gelatina", emoji: "🟠" },
  { id: "banana", label: "Banana", emoji: "🍌" },
  { id: "kiwi", label: "Kiwi", emoji: "🥝" },
  { id: "peach", label: "Pêssego", emoji: "🍑" },
  { id: "apple", label: "Maçã", emoji: "🍎" },
  { id: "raspberry", label: "Framboesa", emoji: "🫐" },
  { id: "strawberry", label: "Morango", emoji: "🍓" },
  { id: "passionfruit", label: "Maracujá", emoji: "💛" },
];

/** All allergens combined (EU mandatory + extras) */
export const ALL_ALLERGENS: EuAllergen[] = [...EU_ALLERGENS, ...EXTRA_ALLERGENS];

/** Quick lookup: allergen id -> emoji */
export const ALLERGEN_EMOJI_MAP: Record<string, string> = Object.fromEntries(
  ALL_ALLERGENS.map((a) => [a.id, a.emoji]),
);
