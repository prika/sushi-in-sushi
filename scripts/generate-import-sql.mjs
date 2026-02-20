#!/usr/bin/env node
/**
 * Reads the Vendus CSV export and generates a SQL migration to:
 * 1. Create local product categories
 * 2. Insert products MERGED by name — duplicates across Delivery/Take Away
 *    become a single product with per-mode pricing (service_prices JSONB)
 *
 * Usage: node scripts/generate-import-sql.mjs
 * Output: supabase/migrations/051_import_vendus_products.sql
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── CSV parsing ───────────────────────────────────────────────────────────
const csvPath = join(
  ROOT,
  "exportacao_produtos_2026-02-19 21_43_48.csv",
);
const raw = readFileSync(csvPath, "utf-8");

/** Simple CSV parser that handles quoted fields with commas */
function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  const rows = [];
  for (const line of lines) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

const allRows = parseCSV(raw);
const header = allRows[0];
const dataRows = allRows.slice(1);

// Column indexes
const COL = {
  name: header.indexOf("Nome"),
  category: header.indexOf("Categoria"),
  reference: header.indexOf("Referência"),
  price: header.indexOf("PVP"),
  tax: header.indexOf("IVA - Taxa"),
  image: header.indexOf("Imagem"),
};

// ─── Category classification ───────────────────────────────────────────────
const CATEGORIES = [
  {
    slug: "uramaki",
    name: "Uramaki",
    icon: "🍣",
    keywords: ["uramaki", "california", "califórnia"],
    patterns: [/^ura\s/, /\bura\b/],
  },
  { slug: "hossomaki", name: "Hossomaki", icon: "🍙", keywords: ["hossomaki", "hosomaki"] },
  {
    slug: "nigiri",
    name: "Nigiri",
    icon: "🍣",
    keywords: ["nigiri", "niguiri"],
  },
  {
    slug: "sashimi",
    name: "Sashimi",
    icon: "🥩",
    keywords: ["sashimi", "carpaccio", "ceviche", "tartar"],
  },
  { slug: "gunkan", name: "Gunkan", icon: "🍣", keywords: ["gunkan"] },
  { slug: "temaki", name: "Temaki", icon: "🌯", keywords: ["temaki"] },
  {
    slug: "hot",
    name: "Hot",
    icon: "🔥",
    keywords: ["hot de", "balls hot", "big hot"],
    patterns: [/^hot$/i, /^hot\s/],
  },
  { slug: "poke", name: "Poke", icon: "🥗", keywords: ["poke"] },
  { slug: "gyoza", name: "Gyoza", icon: "🥟", keywords: ["gyoza"] },
  {
    slug: "entradas",
    name: "Entradas",
    icon: "🍤",
    keywords: [
      "aros de cebola", "aros cebola", "aros de lula", "rolos primavera",
      "panado", "mozarela", "mussarela", "pinças", "camarão panado",
      "camarão joe", "camarão ao alho", "croquete", "rissol",
      "edamame", "spring roll", "entrada", "sunomono", "salada",
      "mini rolos",
    ],
  },
  {
    slug: "menus",
    name: "Menus / Combos",
    icon: "📦",
    keywords: [
      "menu", "combo", "combinado", "especial", "caixa", "box",
      "mix ", "festival", "sushi set", "conjunto", "selection",
      "yanagi", "2x1",
      "hashi", "mirin", "kombu", "nori", "shari", "sudarê", "sésamo",
      "gohan", "haru", "maki", "sashi ", "cozumel",
      "salmon classic", "salmon fila", "salmon fusion",
      "salmon lovers", "salmon tuna",
      "do japa", "do mar", "shoyo", "fish",
      "peças premium", "combinados",
    ],
  },
  {
    slug: "bebidas",
    name: "Bebidas",
    icon: "🥤",
    keywords: [
      "coca cola", "coca-cola", "compal", "sumol", "guaraná", "água",
      "lipton", "red bull", "7up", "fanta", "sprite", "ice tea",
      "sumo", "refrigerante", "somersby", "cerveja", "super bock",
      "sagres", "heineken", "café", "chá verde", "chá",
      "gin ", "mojito", "cocktail", "apple cider", "fino ",
    ],
  },
  {
    slug: "vinhos-sake",
    name: "Vinhos & Sake",
    icon: "🍷",
    keywords: [
      "vinho", "sake", "saké", "saque", "sangria", "espumante",
      "champagne", "moscatel", "porto", "mateus",
    ],
  },
  {
    slug: "pratos-quentes",
    name: "Pratos Quentes",
    icon: "🍜",
    keywords: [
      "yakisoba", "massa ", "massa maré", "massa oriente",
      "shimeji", "sopa", "yakitori",
    ],
  },
  {
    slug: "condimentos",
    name: "Condimentos",
    icon: "🧂",
    keywords: [
      "molho", "wasabi", "gengibre", "brasear", "soja", "teriyaki",
      "sweet chili", "agridoce", "agri'doce", "picante", "shoyu",
      "topping",
    ],
  },
  {
    slug: "sobremesas",
    name: "Sobremesas",
    icon: "🍮",
    keywords: [
      "sobremesa", "gelado", "ice cream", "mochi", "cheesecake",
      "chessecake", "chocolate", "brownie", "crepe", "doce", "mousse",
    ],
  },
];

function classifyProduct(name) {
  const lower = name.toLowerCase();
  const stripped = lower.replace(/^\d+\)\s*/, "");

  if (/^taxa\b/i.test(stripped)) return "outros";

  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (stripped.includes(kw) || lower.includes(kw)) {
        return cat.slug;
      }
    }
    if (cat.patterns) {
      for (const rx of cat.patterns) {
        if (rx.test(stripped) || rx.test(lower)) {
          return cat.slug;
        }
      }
    }
  }

  if (/\(\d+\s*p[çc]s?\)/i.test(stripped)) return "menus";
  if (/special/i.test(stripped)) return "menus";
  if (/^\w+\s*\(\d+/i.test(stripped)) return "menus";
  if (/^veg$/i.test(stripped)) return "menus";

  return "outros";
}

// ─── Parse & group products ───────────────────────────────────────────────
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/\./g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : Math.round(val * 100) / 100;
}

function escapeSQL(str) {
  if (!str) return "";
  return str.replace(/'/g, "''").trim();
}

/** Maps Vendus category → service_mode */
function categoryToServiceMode(cat) {
  const lower = (cat || "").toLowerCase();
  if (lower.includes("delivery")) return "delivery";
  if (lower.includes("take away") || lower.includes("takeaway")) return "takeaway";
  return "dine_in";
}

// Group products by original name — merge duplicates across service modes
const productMap = new Map();

for (const row of dataRows) {
  if (row.length < 5) continue;
  const name = row[COL.name];
  if (!name) continue;

  const vendusCategory = row[COL.category] || "";
  const serviceMode = categoryToServiceMode(vendusCategory);
  const reference = row[COL.reference] || "";
  const price = parsePrice(row[COL.price]);
  const imageUrl = (row[COL.image] || "").trim();

  const key = name.trim().toLowerCase();

  if (!productMap.has(key)) {
    productMap.set(key, {
      name: name.trim(),
      localCategory: classifyProduct(name),
      serviceModes: new Set(),
      servicePrices: {},
      references: [],
      imageUrl: "",
    });
  }

  const entry = productMap.get(key);
  entry.serviceModes.add(serviceMode);
  entry.servicePrices[serviceMode] = price;
  if (reference && !entry.references.includes(reference)) {
    entry.references.push(reference);
  }
  if (!entry.imageUrl && imageUrl) {
    entry.imageUrl = imageUrl;
  }
}

// Convert Map to array — add dine_in with takeaway price
const products = [];
for (const [, entry] of productMap) {
  // Sala price = Take Away price
  if (entry.servicePrices.takeaway !== undefined && entry.servicePrices.dine_in === undefined) {
    entry.servicePrices.dine_in = entry.servicePrices.takeaway;
    entry.serviceModes.add("dine_in");
  }
  const prices = Object.values(entry.servicePrices);
  const basePrice = Math.min(...prices);
  products.push({
    name: entry.name,
    price: basePrice,
    servicePrices: entry.servicePrices,
    serviceModes: [...entry.serviceModes],
    reference: entry.references[0] || "",
    imageUrl: entry.imageUrl,
    localCategory: entry.localCategory,
  });
}

// ─── Category stats ────────────────────────────────────────────────────────
const stats = {};
for (const p of products) {
  stats[p.localCategory] = (stats[p.localCategory] || 0) + 1;
}
console.log("Category distribution:");
for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

const multiMode = products.filter((p) => p.serviceModes.length > 1).length;
console.log(`\nTotal unique products: ${products.length}`);
console.log(`Products with multiple service modes: ${multiMode}`);

// ─── Generate SQL ──────────────────────────────────────────────────────────
const allCategories = [
  ...CATEGORIES,
  { slug: "outros", name: "Outros", icon: "📋", keywords: [] },
];

let sql = `-- =============================================
-- IMPORT VENDUS PRODUCTS
-- Migration: 051_import_vendus_products.sql
-- =============================================
-- Auto-generated from Vendus CSV export
-- Products are MERGED by name — duplicates across Delivery/Take Away
-- become a single product with per-mode pricing (service_prices JSONB).
-- Unique products: ${products.length} (merged from CSV rows)

BEGIN;

-- =============================================
-- 1. CREATE LOCAL CATEGORIES
-- =============================================
`;

for (let i = 0; i < allCategories.length; i++) {
  const c = allCategories[i];
  sql += `INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('${escapeSQL(c.name)}', '${c.slug}', ${(i + 1) * 10}, '${c.icon || ""}')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;\n\n`;
}

sql += `-- =============================================
-- 2. INSERT PRODUCTS (${products.length} unique items)
-- =============================================
-- Each product: clean name, base price, service_prices JSONB, service_modes array

`;

for (const p of products) {
  const imgVal = p.imageUrl ? `'${escapeSQL(p.imageUrl)}'` : "NULL";
  const refVal = p.reference ? `'${escapeSQL(p.reference)}'` : "NULL";
  const servicePricesJson = JSON.stringify(p.servicePrices);
  const serviceModesArr = `{${p.serviceModes.join(",")}}`;

  sql += `INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '${escapeSQL(p.name)}',
  ${p.price},
  '${servicePricesJson}'::jsonb,
  (SELECT id FROM categories WHERE slug = '${p.localCategory}'),
  ${imgVal},
  true,
  ${refVal},
  'pending',
  '${serviceModesArr}'
)
ON CONFLICT DO NOTHING;\n\n`;
}

sql += `COMMIT;\n`;

// ─── Write output ──────────────────────────────────────────────────────────
const outPath = join(ROOT, "supabase", "migrations", "051_import_vendus_products.sql");
writeFileSync(outPath, sql, "utf-8");
console.log(`\nGenerated: ${outPath}`);
console.log(`Total SQL statements: ${allCategories.length} categories + ${products.length} products`);
