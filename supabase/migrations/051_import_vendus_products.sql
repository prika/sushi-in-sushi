-- =============================================
-- IMPORT VENDUS PRODUCTS
-- Migration: 051_import_vendus_products.sql
-- =============================================
-- Auto-generated from Vendus CSV export
-- Products are MERGED by name — duplicates across Delivery/Take Away
-- become a single product with per-mode pricing (service_prices JSONB).
-- Unique products: 449 (merged from CSV rows)

BEGIN;

-- =============================================
-- 1. CREATE LOCAL CATEGORIES
-- =============================================
INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Uramaki', 'uramaki', 10, '🍣')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Hossomaki', 'hossomaki', 20, '🍙')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Nigiri', 'nigiri', 30, '🍣')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Sashimi', 'sashimi', 40, '🥩')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Gunkan', 'gunkan', 50, '🍣')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Temaki', 'temaki', 60, '🌯')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Hot', 'hot', 70, '🔥')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Poke', 'poke', 80, '🥗')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Gyoza', 'gyoza', 90, '🥟')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Entradas', 'entradas', 100, '🍤')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Menus / Combos', 'menus', 110, '📦')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Bebidas', 'bebidas', 120, '🥤')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Vinhos & Sake', 'vinhos-sake', 130, '🍷')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Pratos Quentes', 'pratos-quentes', 140, '🍜')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Condimentos', 'condimentos', 150, '🧂')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Sobremesas', 'sobremesas', 160, '🍮')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

INSERT INTO categories (name, slug, sort_order, icon)
VALUES ('Outros', 'outros', 170, '📋')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

-- =============================================
-- 2. INSERT PRODUCTS (449 unique items)
-- =============================================
-- Each product: clean name, base price, service_prices JSONB, service_modes array

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de Salmão (24 pçs) + (C)',
  12.5,
  '{"takeaway":12.5,"delivery":16,"dine_in":12.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/5fe88e8de54d9c6df6c312b4282856b1.png',
  true,
  'VHOT2-24040230',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho teriyaki',
  1,
  '{"takeaway":1,"delivery":1.2,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/53b9309fa9439bf98867b69f07321caf.jpg',
  true,
  'VMOL3-24040246',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho de soja',
  0.5,
  '{"takeaway":0.5,"delivery":1.2,"dine_in":0.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/d9d6addef7bdef79420ce4b1144449dd.jpg',
  true,
  'VMOL4-24040235',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Wasabi',
  1,
  '{"takeaway":1,"delivery":1.2,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/c8687cccd4101cbe3dfe99d455eea26a.jpg',
  true,
  'VWAS5-24040273',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Compal Laranja',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/166451879a1fc075d033fc1d3211d92b.jpg',
  true,
  'VCOM6-24040268',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sumol Laranja',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/3064b4c735b1996f384de3e29242e1d2.jpg',
  true,
  'VSUM8-24040228',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Coca Cola',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/f4dc152f23a9e2d5da5d3c6236d0cacb.png',
  true,
  'VCOC9-2404028',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Coca Cola Zero',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/f7e76187c0313cd61023058bdac850a5.png',
  true,
  'VCOC10-24040271',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Água 50ml',
  1.5,
  '{"takeaway":1.5,"dine_in":1.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/e01d451c3c9f5a08de1f72bac31d169c.png',
  true,
  'VAGU11-24040259',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Água das Pedras de Limão',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  NULL,
  true,
  'VAGU12-24040224',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Água das Pedras',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/465d6a91c5e5aa659707aac18cf93333.png',
  true,
  'VAGU13-2404028',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Mateus Rosa 75cl',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/7228861e47473ae3d2ad1ccd1777f1fb.jpg',
  true,
  'VVIN14-24040296',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Somersby Apple 33cl',
  3,
  '{"takeaway":3,"delivery":3.5,"dine_in":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/1c560fb835a058d7323b8a40d95a9c29.png',
  true,
  'VSOM15-2404029',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Verde Gazela 75cl',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/255b1e91229057042920faacc23a141b.jpg',
  true,
  'VVIN16-24040214',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Guaraná Antartica 33cl',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/6c7d3b5e59aecaa38a6f4d2a1607b824.jpg',
  true,
  'VGUA17-24040273',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho Agri''doce',
  1,
  '{"takeaway":1,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/9a776f79420251100972b16a516d8e2f.jpg',
  true,
  'VMOL18-24040235',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Brasear',
  1,
  '{"takeaway":1,"delivery":1.2,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/ed0a914a0e0f7248407fab629f8f221d.jpg',
  true,
  'VBRA19-24040299',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Aros de cebola (6UN)',
  2,
  '{"takeaway":2,"dine_in":2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/355f297712bbcfcd7ddbb2a3470644a2.jpg',
  true,
  'VARO20-24040283',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Rolos primavera vegetal (6UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/f8da36c3f05a72f679ad1bbb203b906a.jpg',
  true,
  'VROL21-24040258',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Panado Queijo Camembert (5UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/b31e7b38dec270f3aa3dda2b006f34f2.jpeg',
  true,
  'VPAN22-24040268',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Balls hot de Salmão Filadélfia (4 UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/1608c849c89f9a53d0e390a8890895b5.jpeg',
  true,
  'VBAL23-24040253',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Panado Chili com Queijo (5UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/517617e08f1c7189361923763ecb6c5e.jpeg',
  true,
  'VPAN24-2404028',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mozarela sticks (5UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/10b6218b1fa1aa31e430dccab63e81ae.jpeg',
  true,
  'VMOZ25-24040257',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Pinças de caranguejo (5UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/47270e3d631cd30b3292d71f48f7927b.jpg',
  true,
  'VPIN26-24040295',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Balls hot camarão Filadélfia (4UN)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/f11e2c82aecb71ff1c05e5a13cb630be.jpeg',
  true,
  'VBAL27-24040222',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Camarão panado (5UN)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/6849dcbbcc08f46ac773ea3820e1952a.jpeg',
  true,
  'VCAM28-24040240',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hossomaki de salmão (8 pçs)',
  4.5,
  '{"takeaway":4.5,"delivery":6,"dine_in":4.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  'https://www.vendus.pt/foto/686caf047b2523a3d0e80c486763eb26.png',
  true,
  'VHOS29-24040243',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Tomate seco e rúcula (8 Pçs)',
  6.5,
  '{"takeaway":6.5,"delivery":8,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/b6068ae1bb59271520c735dc787069f8.jpg',
  true,
  'VURA30-24040280',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Filadélfia de salmão (8 pçs)',
  7.5,
  '{"takeaway":7.5,"delivery":8,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/7fcc27e14fbc0f8f81b4ee720e1c0056.png',
  true,
  'VURA31-24040212',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão Grelhado Filadélfia (8 pçs)',
  6.5,
  '{"takeaway":6.5,"delivery":7,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/eda3aeb442fad998cdb69b03ed547afd.png',
  true,
  'VURA32-24040219',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Califórnia de Salmão (8 pçs)',
  7.5,
  '{"takeaway":7.5,"delivery":8,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/5ab1491d4d9af59ae0e3e5d0d7712762.png',
  true,
  'VURA33-24040260',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki camarão Filadélfia (8 pçs)',
  7.5,
  '{"takeaway":7.5,"delivery":8,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/65e6fc3237c3f50b71674e1bd6d194a6.png',
  true,
  'VURA34-24040255',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão Spicy (8pçs)',
  7.5,
  '{"takeaway":7.5,"delivery":8,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/b637f014d416dc3eb5da43b713071c5a.jpg',
  true,
  'VURA35-2404027',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão (8 pçs)',
  7.5,
  '{"takeaway":7.5,"delivery":8,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/3f338978a78daa229ad1d6acf2836bfb.jpg',
  true,
  'VURA36-24040284',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Filadélfia de Salmão e Camarão (8 pçs)',
  7.5,
  '{"takeaway":7.5,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/cfc19da439bd3e68f51ae3f9f5bc8f21.jpeg',
  true,
  'VURA37-24040267',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão Braseado (8 pçs)',
  7.5,
  '{"takeaway":7.5,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/ee4c8483f5770d747a41c1942e2f7fbb.jpeg',
  true,
  'VURA38-24040225',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão Supremo ( 8 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/8665df46eee2d6ed3f1841e8003eaa17.jpeg',
  true,
  'VURA39-24040254',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Filadélfia de camarão panado supremo (8 pçs)',
  9,
  '{"takeaway":9,"delivery":9.5,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/4a5ba7e98cb0613028d3a0cb5e88167c.jpeg',
  true,
  'VURA40-24040252',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki misto premium (8 pçs)',
  10,
  '{"takeaway":10,"dine_in":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/69fc1d85af42bbed80e35ce1e7ce82c5.jpg',
  true,
  'VURA41-24040298',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi trufado',
  12,
  '{"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/c590267a1fc14025fcca0ceb677ed559.jpeg',
  true,
  'VSAS42-24040235',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri trufado (5 pçs)',
  7,
  '{"takeaway":7,"delivery":8.5,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/51bec75670edfad47cf6d1dd94725e32.jpeg',
  true,
  'VNIG43-24040271',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri de Salmão (10 pçs)',
  10,
  '{"takeaway":10,"delivery":13,"dine_in":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/cdc5cd3e60a88a2a62a0cc262008b581.jpeg',
  true,
  'VNIG44-24040264',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia Carrot (8 pçs)',
  6,
  '{"takeaway":6,"delivery":7,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/21854124e2672ec3975e9e0503ff0a30.png',
  true,
  'VHOT45-24040244',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Veg. (8 pçs)',
  6,
  '{"takeaway":6,"delivery":7,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/bea88c320505dcd5fb7a2501e39cf6ce.png',
  true,
  'VHOT46-24040241',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia Carrot (16 pçs)',
  8,
  '{"takeaway":8,"delivery":10,"dine_in":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/a3ce422833a1e67af839cb903b15e084.png',
  true,
  'VHOT47-24040262',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hossomaki Vegano (24 pçs)',
  9.5,
  '{"takeaway":9.5,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  'https://www.vendus.pt/foto/a49b9dd50c440d35e6d2503c71f90c7d.jpg',
  true,
  'VHOS48-24040212',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Vegetariano (20 pçs)',
  9.5,
  '{"takeaway":9.5,"delivery":12.75,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/25312f71a726da981d6576cf2434ce9b.png',
  true,
  'VCOM49-24040217',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Vegano (20 pçs)',
  9.5,
  '{"takeaway":9.5,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/282450f3148d8de2dd4f0c6881352032.png',
  true,
  'VCOM50-24040256',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Vegetariano do chef (28 pçs)',
  13,
  '{"takeaway":13,"delivery":18.25,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/43f8b162840c202eb805c917c9ef3996.jpeg',
  true,
  'VCOM51-24040234',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia de Salmão (8 pçs)',
  7,
  '{"takeaway":7,"delivery":11,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/28fe3ff0b502a1c267cc0e70b75db31b.png',
  true,
  'VHOT52-24040294',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia de Camarão (8 pçs)',
  7,
  '{"takeaway":7,"delivery":10,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/223ed3075c30c27ccbc7ec7016817d5e.png',
  true,
  'VHOT53-24040240',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia de Salmão (16 Pçs)',
  9,
  '{"takeaway":9,"delivery":14,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/c8ebe27ca04299a18562c99d3e9f832f.jpeg',
  true,
  'VHOT54-24040211',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de Salmão e Camarão (16 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/5bd3e45b2bcb44b3d46e593fa80531a6.jpeg',
  true,
  'VHOT55-24040261',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi de Salmão',
  11,
  '{"takeaway":11,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/5c7ee0ce3a2e9ba08a0f04bc4b92c78f.jpeg',
  true,
  'VSAS56-24040232',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot especial (16 pçs)',
  11,
  '{"takeaway":11,"delivery":14,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/5dff21940da59cd2b9374aadd5935800.jpeg',
  true,
  'VHOT57-24040224',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Hot (24 pçs)',
  12.5,
  '{"takeaway":12.5,"delivery":16,"dine_in":12.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f5ddc4bf601571229dd115aed0f79125.jpeg',
  true,
  'VCOM58-24040239',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki Salmão e Delícias do mar (1 un)',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/ebd5a925592d093a75659206eb898cca.jpeg',
  true,
  'VTEM59-24040240',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão Tropical (1un.)',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/f5d3fbcbec09aa0d3de26468a272e33f.jpeg',
  true,
  'VTEM60-24040232',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki Vegano (1 un)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/a71d5253ee82f0e193bd2b61b21c4dd4.jpeg',
  true,
  'VTEM61-24040255',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão Clássico (1 un.)',
  6.5,
  '{"takeaway":6.5,"delivery":7,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/a943d9808e326c4f6cf23b09e70a104b.jpeg',
  true,
  'VTEM62-24040210',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão Grelhado Filadélfia (1 un.)',
  6.5,
  '{"takeaway":6.5,"delivery":7,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/a03a49ffadc234788ae773095f972895.jpeg',
  true,
  'VTEM63-24040280',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão e Camarão Filadélfia (1 un.)',
  6.5,
  '{"takeaway":6.5,"delivery":7,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/cbe5bda48756ecfaa7f95f52ed5e8f69.jpeg',
  true,
  'VTEM64-24040259',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão e Filadélfia (1 un.)',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/28f37241f8c04892951a629f606bb760.jpeg',
  true,
  'VTEM65-24040232',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Camarão Panado Filadélfia (1 un.)',
  6.5,
  '{"takeaway":6.5,"delivery":7.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/20b401596e725b8498e58ecc8443bc6d.jpeg',
  true,
  'VTEM66-24040276',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de banana com nutella',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/150bae34a1d91854695e0f50a24658e5.jpeg',
  true,
  'VHOT67-24040260',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de banana com  doce de leite e coco',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/a45d309af74254c7056bae4ba82723a5.jpeg',
  true,
  'VHOT68-2404024',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de banana misto - (8 pçs)',
  5,
  '{"takeaway":5,"delivery":6.5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/b5c34332bd3de7ba6071f7773d6e8d6a.jpg',
  true,
  'VHOT69-2404028',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de Camarão (16 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/0baa4cd5cd2af6d32f23b9365afc7a91.jpeg',
  true,
  'VHOT70-2404028',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Camarão Filadélfia  (1 un)',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/465359aeed9fea85cf7ff29c5aa97574.jpeg',
  true,
  'VTEM71-24040268',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sumo de laranja Natural',
  3.5,
  '{"takeaway":3.5,"delivery":4,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/94f7a7295268e50b500e2b562e59f126.jpg',
  true,
  'VSUM72-24040269',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gengibre',
  1,
  '{"takeaway":1,"delivery":1.2,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/f15ee14c059ed507b457be2ef378386f.jpg',
  true,
  'VGEN73-24040232',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Camarão Joe (5uni.)',
  8.5,
  '{"takeaway":8.5,"dine_in":8.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/f91b67cb4125b8eff633db1566bfee80.jpeg',
  true,
  'VCAM74-24040287',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Balls Hot Nutella (2 uni)',
  4,
  '{"takeaway":4,"delivery":5.5,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/1aa2f7a8f89764da098b43ecb699b44d.jpeg',
  true,
  'VBAL75-24040288',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Premium (9pçs)',
  10.5,
  '{"takeaway":10.5,"delivery":13,"dine_in":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/28e0f5feb4584e6eda264e7c7ffde2dd.jpeg',
  true,
  'VHOT76-24040282',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Grelhadohot (16pçs) + bebida grátis',
  9,
  '{"takeaway":9,"delivery":13,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/892bdc40e0ff099e036f72993c6c09de.jpeg',
  true,
  'VGRE77-24040288',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Salmão Philadelphia',
  11,
  '{"takeaway":11,"delivery":13.5,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/a35183993f61b042498584f1fa541e7c.jpeg',
  true,
  'VBIG78-24040254',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Salmão Braseado',
  12,
  '{"takeaway":12,"delivery":14.5,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/c836c718a4a09b3f951d965396a7ae0f.jpeg',
  true,
  'VBIG79-24040226',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Delicias do Mar',
  11,
  '{"takeaway":11,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/1f170cd4f5d84464211be7ca04e8de7b.jpeg',
  true,
  'VBIG80-24040254',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Camarao Panado',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/25c941c0b19e6f1b6da02c150f53f466.jpeg',
  true,
  'VBIG81-2404028',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big hot de Salmao e Camarao',
  11,
  '{"takeaway":11,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/f338125059c97623b0e803355f57a0d8.jpeg',
  true,
  'VBIG82-24040284',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Salmão e Camarão',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/b31d86c7173fa7d1d20903445b290aaa.jpeg',
  true,
  'VNIG83-24040246',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Taxa Saco',
  0.25,
  '{"takeaway":0.3,"delivery":0.25,"dine_in":0.3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'outros'),
  NULL,
  true,
  'VTAX84-24040221',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Salmão',
  12,
  '{"takeaway":12,"delivery":13.25,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/47f99cd9dfc1f40c191d63e9f0ec29e9.jpeg',
  true,
  'VPOK85-24040215',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Salmão Filadélfia',
  12,
  '{"takeaway":12,"delivery":13.25,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/c835b486c3205d3524a8fec5517a00cc.jpeg',
  true,
  'VPOK86-24040218',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Salmão e Delícias do Mar Filadélfia',
  12,
  '{"takeaway":12,"delivery":13.25,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/e8532679dfa805d903ab843d50e33d08.jpeg',
  true,
  'VPOK87-24040258',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke Vegan',
  11,
  '{"takeaway":11,"delivery":13.25,"dine_in":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/bf28750f4ec3deffc01d6ab673108c93.jpeg',
  true,
  'VPOK88-24040241',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Salmão e Camarão',
  12,
  '{"takeaway":12,"delivery":13.25,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/56c8a454084ebcbc31120db22e91ecd8.jpeg',
  true,
  'VPOK89-24040242',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Camarão',
  12,
  '{"takeaway":12,"delivery":13.25,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/56792492d2eaad3b7ad04a53a76b61ba.jpeg',
  true,
  'VPOK90-24040276',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Califórnia de Camarão (8 pçs)',
  7.5,
  '{"takeaway":7.5,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/1e8f53a0a5ab94f137ea76ffd2d8895c.jpeg',
  true,
  'VURA91-24040258',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Special Salmon (8 pçs)',
  11.5,
  '{"takeaway":11.5,"dine_in":11.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/466912313fdd3e594aba5c4510b227b6.jpeg',
  true,
  'VSPE92-24040232',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Shimeji',
  5.5,
  '{"takeaway":5.5,"delivery":7.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/5169e7547c1e0b9a9fe4c2dbeeea9c7b.jpg',
  true,
  'VSHI93-24040247',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ceviche de salmão',
  9,
  '{"takeaway":9,"delivery":9.5,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/9df137305f0695724716da27e7cc412f.png',
  true,
  'VCEV94-24040296',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Tartar de salmão',
  9,
  '{"takeaway":9,"delivery":10.5,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/d8b706ef44a9836c3f02ed5ee5e40533.jpeg',
  true,
  'VTAR95-24040266',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Carpaccio de salmão (10 pçs)',
  10,
  '{"takeaway":10,"dine_in":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/f4ca5dc840415911e32faa43a479abe6.jpeg',
  true,
  'VCAR96-24040221',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri de salmão (5 pçs)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/9c2145b033ef00607119909320169061.jpeg',
  true,
  'VNIG97-24040252',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan crispy (8 pçs)',
  9,
  '{"takeaway":9,"delivery":12.5,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/e53889e33465062e1538d2b93120d6ff.png',
  true,
  'VGUN98-24040217',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan mix (20 pçs)',
  21,
  '{"takeaway":21,"dine_in":21}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/c29ef4a67028b231e55c184c7c828ad7.jpeg',
  true,
  'VGUN99-24040243',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Crispy Filadélfia (8 pçs)',
  7,
  '{"takeaway":7,"delivery":11,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/3effd5162c43db90a6b42a6334c71ab1.png',
  true,
  'VHOT100-24040278',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Topping Shimeji (8 pçs)',
  1.25,
  '{"takeaway":1.25,"dine_in":1.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  NULL,
  true,
  'VTOP101-24040212',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Topping Crispy de alho francês (8 pçs)',
  1.25,
  '{"takeaway":1.25,"dine_in":1.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VTOP102-24040217',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Topping Crispy de couve (8 pçs)',
  1.25,
  '{"takeaway":1.25,"dine_in":1.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VTOP103-24040226',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Topping Cebola Roxa Caramelizada (8 pçs)',
  1.25,
  '{"takeaway":1.25,"dine_in":1.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VTOP104-24040278',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Topping de creme queijo (8 pçs)',
  2,
  '{"takeaway":2,"dine_in":2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VTOP105-2404023',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho de ostra',
  1.25,
  '{"takeaway":1.25,"dine_in":1.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VMOL106-24040233',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho de frutos do mar',
  1,
  '{"takeaway":1,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VMOL107-24040254',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan de salmão (8 pçs)',
  8,
  '{"takeaway":8,"dine_in":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/9a88d73b496947043bd6f3b609b1da48.jpeg',
  true,
  'VGUN108-24040231',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan c/ camarão (8 pçs)',
  9.5,
  '{"takeaway":9.5,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/5138492bd529c6c4d3e59960b9dc9c20.jpg',
  true,
  'VGUN109-2404021',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan de Pepino (8 pçs)',
  9.5,
  '{"takeaway":9.5,"delivery":12.75,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/fd2e2ae8054633e029d9cb6fc5bd23a4.jpeg',
  true,
  'VGUN110-24040247',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan Lovers (8 pçs)',
  9.5,
  '{"takeaway":9.5,"delivery":12.75,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/a7e93fff69469f55eba1ab5049d40abb.jpeg',
  true,
  'VGUN111-24040213',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan do chef (8 pçs)',
  10,
  '{"takeaway":10,"dine_in":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/a88c706e485f1ec44540de1dcf7e8a2e.jpeg',
  true,
  'VGUN112-24040242',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Aros de Lula (6 pçs)',
  3.5,
  '{"takeaway":3.5,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/6c9471acf2b493ec2fcb5865eb5ac8de.jpg',
  true,
  'VARO113-2404021',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ice tea pêssego',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/17e1f46fe138de57685e810a2a0244f3.jpeg',
  true,
  'VICE114-24040260',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mini rolos de frango (6 pçs)',
  4,
  '{"takeaway":4,"delivery":5.5,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/545a66d3a12a0d9befedc4862c90611b.jpg',
  true,
  'VMIN115-24040275',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Atum',
  12,
  '{"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  NULL,
  true,
  'VPOK117-24040246',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mousse de Limão com bolacha',
  3.5,
  '{"takeaway":3.5,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sobremesas'),
  NULL,
  true,
  'VMOU118-24040223',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sprite',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/33c806137fe0eb45202c4f61212c6bf6.jpg',
  true,
  'VSPR119-2404023',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Fanta',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/003a55591225ba244e16a6a1850a9244.jpg',
  true,
  'VFAN120-24040282',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Super Bock (fino)',
  2.2,
  '{"takeaway":2.2,"dine_in":2.2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/02fb2e21b62f349adfe5aea362d54c67.jpg',
  true,
  'VSUP121-24040218',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Fino panache/tango',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  NULL,
  true,
  'VFIN122-24040275',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Super Bock (Principe)',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  NULL,
  true,
  'VSUP123-24040230',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Super Bock Stout',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/91bb5d6b224c52f8d03deb783a6f9509.jpg',
  true,
  'VSUP124-24040218',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Heineken',
  3,
  '{"takeaway":3,"dine_in":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/2f1318db6a5533a8411c3f95ed45b7ba.jpg',
  true,
  'VHEI125-24040295',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Corona cerveja',
  3.5,
  '{"takeaway":3.5,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/e390ffd4ce030816afcff0bdc921f63a.jpg',
  true,
  'VCOR126-24040278',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Somersby blackberry',
  3,
  '{"takeaway":3,"dine_in":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/bd19522c39506e99c3007f2d52e0b98e.jpg',
  true,
  'VSOM127-24040235',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Monte velho (tinto)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/ce4cf7e45fa32efcca1c9dc0316abf8b.jpg',
  true,
  'VVIN128-24040273',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Planalto Branco',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/6c3084f8368b54dcd2c3fede4e2b0a6b.jpg',
  true,
  'VVIN129-2404029',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Espumante Aliança',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/33aabbed01d633ff3b1b7d80d9180735.jpg',
  true,
  'VESP130-24040272',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Cozumel',
  5.5,
  '{"takeaway":5.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/80c1c452ebe92b4a0e628d3d893c322b.jpg',
  true,
  'VCOZ131-24040237',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Cocktail frutos vermelhos',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/94d6e9f78a37c1fde029999bd04b5925.jpg',
  true,
  'VCOC132-24040280',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gin tonica limão',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/aa12d068f81cd052c97ce608c844ba3a.jpg',
  true,
  'VGIN133-24040285',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Apple cider',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/620c2984bdb698816f53a6d7d0b1ab19.jpg',
  true,
  'VAPP134-24040276',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Café',
  1,
  '{"takeaway":1,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/b9f73fdcb723e1feba2b026ca01f382b.JPG',
  true,
  'VCAF135-24040220',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 1 (16 pçs)',
  13,
  '{"takeaway":13,"delivery":15,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/faa1f5911db53bf58af7d46ae178dbd0.jpg',
  true,
  'VCOM136-24040235',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 2 (16 pçs)',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/b0aa5035efe5039d45c81521ea04ed96.jpeg',
  true,
  'VCOM137-24040229',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 3 (16 pçs)',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/192ee47c4c2312e7edb6c7fa7f61b164.png',
  true,
  'VCOM138-24040277',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 4 (16 pçs)',
  13,
  '{"takeaway":13,"delivery":16,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/5bf89ae2f619e8696e3ddfc1c300468c.jpeg',
  true,
  'VCOM139-24040285',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Molho Agri-doce',
  1.2,
  '{"delivery":1.2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  NULL,
  true,
  'VMOL141-24040271',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 6 (14 pçs)',
  13,
  '{"takeaway":13,"delivery":15,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/577e32902a84496e735f145cba60f3ce.jpeg',
  true,
  'VCOM145-2404036',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 5 (14 pçs)',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/92917861e8b21230897f08d8a05284c6.png',
  true,
  'VCOM146-2404031',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 7 (16 pçs)',
  13,
  '{"takeaway":13,"delivery":16,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/8929e21b80fd41ccd468b4c60f9d21d3.jpeg',
  true,
  'VCOM147-24040397',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 8 (24 pçs)',
  16,
  '{"takeaway":16,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/2a8c20b1f900781af663e9b6d4a86557.jpg',
  true,
  'VCOM148-24040345',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 9 (24 pçs)',
  16,
  '{"takeaway":16,"delivery":21,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/51caa9107c51fd92fe7b6dfc17caf512.jpeg',
  true,
  'VCOM149-24040317',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 10 (24 pçs)',
  16,
  '{"takeaway":16,"delivery":21,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a055bcff69f051806f1973f74bab4af5.jpeg',
  true,
  'VCOM150-24040314',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 11 (24 pçs)',
  18,
  '{"takeaway":18,"delivery":22.5,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/4491491b37f65141c848e8c14e6bafdd.jpeg',
  true,
  'VCOM151-24040313',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 12 (24 pçs)',
  18,
  '{"takeaway":18,"delivery":22.5,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/163d628888544a491ae4a352e411dbbd.jpeg',
  true,
  'VCOM152-24040399',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 13 (24pçs)',
  18,
  '{"takeaway":18,"delivery":21,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/029ffffa6b10a1740f5b9e2eecd7ecc4.jpeg',
  true,
  'VCOM153-24040343',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 14 (24 pçs)',
  18,
  '{"takeaway":18,"delivery":22.5,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/5d475bbed9125e26cbce3d8b08124646.jpeg',
  true,
  'VCOM154-24040347',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 15 (24 pçs)',
  18,
  '{"takeaway":18,"delivery":22.5,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9d92d3ff964f0388642ac4d4b6cd5b52.jpeg',
  true,
  'VCOM155-24040350',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 16 (58 pçs)',
  37,
  '{"takeaway":37,"delivery":47,"dine_in":37}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/bdd167bf0a22928e34b99175142a03f1.png',
  true,
  'VCOM156-24040322',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 17 (58 pçs)',
  37,
  '{"takeaway":37,"delivery":47,"dine_in":37}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9cb95298539d94fb009a079b1c206e78.jpeg',
  true,
  'VCOM157-24040330',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 18 (58 pçs)',
  43,
  '{"takeaway":43,"delivery":52,"dine_in":43}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/c30e60a0b3149e6ffbc1b96034743f13.jpeg',
  true,
  'VCOM158-2404035',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 19 (58 pçs)',
  44,
  '{"takeaway":44,"delivery":54,"dine_in":44}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/6c72177bf2367eca37a44fc6b02710a3.jpeg',
  true,
  'VCOM159-24040349',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Tartar do chef',
  12,
  '{"takeaway":12,"delivery":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  NULL,
  true,
  'VTAR160-24040391',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Lovers (8 peças)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/b9470bbbb28fbe861d8597959c259e9c.jpeg',
  true,
  'VHOT161-24040330',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Grill Filadélfia (8 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/461f32cd2f3c6e96582554b9b811da56.jpeg',
  true,
  'VHOT162-24040364',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke de Salmao e Atum',
  12,
  '{"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  NULL,
  true,
  'VPOK163-24040389',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki Supremo Filadelfia',
  7,
  '{"takeaway":7,"delivery":8.5,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/1279b025bdcc9731f61a6d63c7839e3e.jpeg',
  true,
  'VTEM164-24040324',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Hot de salmão (16 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/1baf6cbe59f50e29efb0bab5f38ca34e.png',
  true,
  'VMEN165-24040393',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Combinado 2 (16 pçs)',
  11.5,
  '{"takeaway":11.5,"dine_in":11.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/588637bfb4d1d1c223b82852a07c52bd.jpeg',
  true,
  'VMEN166-24040356',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Poke de Salmão Filadélfia',
  10.5,
  '{"takeaway":10.5,"delivery":13.25,"dine_in":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/f3b8b00af97a2efd4ecbc1a827d380fd.png',
  true,
  'VMEN167-24040360',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Big Hot Salmão Filadélfia',
  10.5,
  '{"takeaway":10.5,"dine_in":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/8746cd0647b3e891053f283965cc22ef.jpeg',
  true,
  'VMEN168-24040398',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Caneca Super Bock',
  3.5,
  '{"takeaway":3.5,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/9519b9085607294604b765059a3d37b5.jpg',
  true,
  'VCAN169-24040355',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Festival',
  21,
  '{"takeaway":21,"dine_in":21}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VFES170-24040397',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Coca-Cola',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/24106833a51bce9c44f952fb9e991372.png',
  true,
  'VCOC174-24040396',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Coca-Cola Zero',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/3d974ffdcf57b65a6f26069cd909d95c.png',
  true,
  'VCOC175-24040324',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Água',
  1.5,
  '{"delivery":1.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/c3dff2c7439f36d8eeec6b9ec7d916ce.png',
  true,
  'VAGU177-24040383',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Super Bock',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/43979235da34712f0d3ff216c05a3bcf.png',
  true,
  'VSUP178-24040365',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Água das Pedras Limão',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/3644931f35545de9c6fc902d7344faf3.png',
  true,
  'VAGU180-24040326',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão Filadélfia (1 un.)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/1794652f42e705e4d2c4446e56844fd3.jpeg',
  true,
  'VTEM184-24040323',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão e Delicias do Mar Filadélfia (1 un.)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/c9d8bbf2ac90f3782d6d6f5233ef6056.jpeg',
  true,
  'VTEM185-2404030',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Salmão Tropical (1 un.)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/7317e489218e97ffab070641bbf0f27b.jpeg',
  true,
  'VTEM186-24040344',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki Vegan (1 un.)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/c0bbdbd1d9d057917bba25564d24b2ec.jpeg',
  true,
  'VTEM187-24040337',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de Camarão Filadélfia (1 un.)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/87c44c6c05798d890dd1c373c40c0cfe.jpeg',
  true,
  'VTEM190-24040325',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Vegan (20 pçs)',
  12.75,
  '{"delivery":12.75}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/4182034585e2355c901f82ff90e4c5f6.png',
  true,
  'VCOM192-24040321',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho 75cl',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VVIN194-24040364',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Pinças de caranguejo panados (5 un)',
  5.5,
  '{"delivery":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/913fa02d9bcf480159e41032361c0582.jpg',
  true,
  'VPIN195-2404037',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mini rolos primavera vegetais (6 uni)',
  5.5,
  '{"delivery":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/d5091a0e38cfeeec144848d9dcf138f5.jpg',
  true,
  'VMIN196-24040353',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Panado Chili com queijo (5 uni)',
  6,
  '{"delivery":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/47bbe784ce1268c0dc18279f6f78df0f.jpeg',
  true,
  'VPAN197-24040336',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Verde Gazela 750ml',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/e996ad39c85bbaf6e08a541865a8df69.jpg',
  true,
  'VVIN199-24040394',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi de Salmão (10pçs)',
  12.5,
  '{"delivery":12.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/160f1354160b0a114eb90613d6e44caf.jpeg',
  true,
  'VSAS210-24040390',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Salmão e Camarão (8 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/b2d9bb3ec1c15e1f372fb3ef11bf54b9.jpeg',
  true,
  'VURA213-24040314',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia Camarão e Salmão (16pçs)',
  14,
  '{"delivery":14}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/08ab731caaf82d550ca2c8b37988f661.jpeg',
  true,
  'VHOT215-24040346',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Filadélfia de Camarão  (16pçs)',
  13,
  '{"delivery":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/cab45e76ca2bdf018ea5580bfbe95d70.jpeg',
  true,
  'VHOT216-24040327',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Palitos de mussarela (5 un.)',
  5,
  '{"delivery":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/500c42a0d07bd1562578ae9d451f7a93.jpeg',
  true,
  'VPAL221-24040382',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de salmão baseado (8pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/8cb38e4be4ffe16554feca7b1c770fc4.jpeg',
  true,
  'VURA222-24040389',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Salmão Supremo (8 pçs)',
  9.5,
  '{"delivery":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/cd5739735776e5cb5c5f031df49a2b9f.jpeg',
  true,
  'VURA223-24040396',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi de Salmão Trufado (10 pçs)',
  12,
  '{"delivery":13.5,"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/fb890ee151084b1d6e29f267b9349d54.jpeg',
  true,
  'VSAS225-24040348',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki Premium (8 pçs)',
  10.5,
  '{"delivery":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/11065cb7038c4aa8ba54c710c06c761b.jpg',
  true,
  'VURA227-24040317',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Camarão Joe (5 uni.)',
  9,
  '{"delivery":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/dee6121b9a7a92fccdfdd1d416bce286.jpeg',
  true,
  'VCAM231-24040312',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Salmão e Camarão',
  14.5,
  '{"delivery":14.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/569918bf9177a161d79fc9ec8f91860e.jpeg',
  true,
  'VBIG237-24040353',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Camarão Panado e Salmão Cru',
  15.5,
  '{"delivery":15.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/f90e28aeb602c1932d6c67ee04aa5150.jpeg',
  true,
  'VBIG238-24040352',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big Hot de Delícias do Mar',
  13.5,
  '{"delivery":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/334bd3ec6d6cfa0003f7078ed5f744b1.jpeg',
  true,
  'VBIG239-24040373',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 - hossomaki de salmão',
  5,
  '{"delivery":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  'https://www.vendus.pt/foto/a7239a7f0569ddbff105eb82705a1dba.png',
  true,
  'V2X1247-2404032',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'gunkan de salmão (8pçs)',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/acb032e1a3f8a0b69b9500e2133bc8b5.jpeg',
  true,
  'VGUN249-24040338',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan mix',
  26,
  '{"delivery":26}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/c9f052f970be460ff5e8155de77b4f53.jpeg',
  true,
  'VGUN252-24040351',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan com Camarão (8 PÇS)',
  12.75,
  '{"delivery":12.75}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/b0e5c99805f162b5d7fce98a87e5270d.jpg',
  true,
  'VGUN262-24040390',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan do chefe (8 pçs)',
  13.5,
  '{"delivery":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/f0f974cdf60ab8c35f76821d0ec2407c.jpeg',
  true,
  'VGUN263-24040320',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de Camarão Califórnia - (8 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/d89201c64ea52027744fc9960b8a65d2.jpeg',
  true,
  'VURA264-24040371',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Carpaccio de salmão',
  10.5,
  '{"delivery":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/64fb0a1e317e2c759556a9da2db0ef93.jpeg',
  true,
  'VCAR268-24040325',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri de salmão e camarão (5 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/8e49081f8612f35c417b85f55a807791.jpeg',
  true,
  'VNIG271-24040336',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de banana com nutella (8 pçs)',
  6,
  '{"delivery":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/7ca39a4968c27b5ebb13a5b299442b41.jpeg',
  true,
  'VHOT272-24040344',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot de banana com doce de leite (8 pçs)',
  6,
  '{"delivery":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/4ade108c5a715b8674d1843749303e0a.jpeg',
  true,
  'VHOT273-24040374',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Camarão Empanado (5 uni)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/512f20b3b4deecfa3e622e2bea74e54d.jpg',
  true,
  'VCAM275-24040389',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Balls Hot de Salmão Filadélfia (4 uni)',
  5,
  '{"delivery":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/24a5f53e77ed4a827ad2088cc189d8a8.jpeg',
  true,
  'VBAL276-24040326',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Balls Hot de Camarão Filadélfia (4 uni)',
  6,
  '{"delivery":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/7c36d041f059aca7bcc750111928bfc1.jpeg',
  true,
  'VBAL277-24040324',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Aros de Lula (6 uni)',
  4.5,
  '{"delivery":4.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  NULL,
  true,
  'VARO278-2404034',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki primavera filadélfia (8 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  NULL,
  true,
  'VURA281-24040344',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki de atum (8pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/0be5d09a16a0316041fa509d7c955cfd.png',
  true,
  'VURA285-24040431',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki avocado de atum spicy (8pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/d347e0d2ecd8760e3abd16789d5e52df.jpeg',
  true,
  'VURA286-24040425',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de atum (1un)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/6d7a30ce77d91c104900ea3c33b2aac8.jpeg',
  true,
  'VTEM287-24040453',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de atum Spicy (1un)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/c517e4bce0a101fd815f8893f69ade80.jpeg',
  true,
  'VTEM288-24040490',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri de salmão e atum (5pçs)',
  9,
  '{"delivery":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/bde923e2432cf468c4054fbb3f11b391.jpeg',
  true,
  'VNIG289-24040455',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi misto (5pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/85d94f38ffb784458986b0c8ffd7e3aa.jpeg',
  true,
  'VSAS290-24040492',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 - Compre 4 pçs de hossomaki  de atum e ganhe mais 4 pçs (8 pçs)',
  5,
  '{"delivery":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  'https://www.vendus.pt/foto/d8c12805ed7b5d25e1d4909561a10b24.png',
  true,
  'V2X1291-2404043',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 - hot de atum (16 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/29d4eb10bf828ebb58c29ee143137ea0.jpeg',
  true,
  'V2X1292-24040468',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 2 (16pçs)',
  16,
  '{"delivery":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/78adc64c30b48e6b04b582fba04478ed.jpeg',
  true,
  'VCOM295-24040451',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 3 (16pçs)',
  16,
  '{"delivery":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/4daf39d502fd422dd3a9b44e94d7bd86.png',
  true,
  'VCOM296-24040428',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 5 (14pçs)',
  16,
  '{"delivery":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/b77e6a56c8a4ca47b433e869515d7700.png',
  true,
  'VCOM298-24040479',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 8 (24pçs)',
  21,
  '{"delivery":21}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/27f0bc20a5192f1641fadf4860c6effe.jpg',
  true,
  'VCOM300-24040442',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot grill Filadelfia (8 pçs)',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/e98fe8643235cc1cd2a32abb6b7b3ce0.jpeg',
  true,
  'VHOT311-24040492',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke Salmão e atum',
  13.25,
  '{"delivery":13.25}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  NULL,
  true,
  'VPOK313-24040442',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Hot de Salmão (16pçs)',
  12,
  '{"delivery":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/0613166cd7a8885a4890169ec5b8cdf1.jpeg',
  true,
  'VMEN316-24040456',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Big Hot de Salmão Filadélfia',
  14,
  '{"delivery":14}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/bd80e7b29f1adf71f9b277d2cb863e26.jpeg',
  true,
  'VMEN318-24040411',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu Almoço - Combinado 2 (16pçs)',
  15,
  '{"delivery":15}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a59b99b8f799cbeca1711e0021a714ff.jpeg',
  true,
  'VMEN319-24040483',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 grelhado (16pçs)',
  10,
  '{"delivery":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9bfd52c8a9039662d8c1a63c8a361d2e.png',
  true,
  'V2X1320-24040445',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 de hot (16 pçs)',
  10,
  '{"delivery":10}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f9971e8143febc17e89329f55c0482a5.jpeg',
  true,
  'V2X1321-24040442',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Taxa de Entrega',
  5.2,
  '{"delivery":5.2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'outros'),
  NULL,
  true,
  'VTAX322-2404040',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Special Salmon (8pçs)',
  14,
  '{"delivery":14}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/ec7e68c7f6bf4ba66fbea8fdc0d9de40.jpeg',
  true,
  'VSPE323-24040414',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri salmão (5pçs)',
  7.5,
  '{"delivery":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/935997aaf6c529424ac7b2e8db568c1c.jpeg',
  true,
  'VNIG324-2404045',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki grelhado supremo (8 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  NULL,
  true,
  'VURA325-24040864',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'grelhahot supremo (16 pçs)',
  14,
  '{"delivery":14}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VGRE326-24040871',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Aros Cebola',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/63efc30972b48af7fd9a3a1198a98272.jpg',
  true,
  'VARO327-2404135',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Lovers',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/47292af7cf68fe061fa7be9c77520846.jpeg',
  true,
  'VHOT328-24041353',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hossomaki Vegano',
  12.75,
  '{"delivery":12.75}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  'https://www.vendus.pt/foto/063a57feab01a5fb2ad5290d386bc9db.jpg',
  true,
  'VHOS329-2404132',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 20 (16 pçs)',
  11.5,
  '{"delivery":15,"takeaway":11.5,"dine_in":11.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a39c52a307beb51a0dd60cd62f32b012.jpeg',
  true,
  'VCOM330-24041527',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 21 (16 pçs)',
  12.5,
  '{"delivery":17,"takeaway":12.5,"dine_in":12.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f14be9b04dbc62aa53eeda3bac4949c3.jpeg',
  true,
  'VCOM331-24041522',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 22 (28 pçs)',
  19,
  '{"delivery":19}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM332-24041519',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 23 (24 pçs)',
  14.5,
  '{"delivery":21,"takeaway":14.5,"dine_in":14.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/b6530bdfefac9504727580a24046bf84.jpeg',
  true,
  'VCOM333-24041580',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 24 (60 pçs)',
  34,
  '{"delivery":50,"takeaway":34,"dine_in":34}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f48315a94d9703600ed903e8419a0961.jpeg',
  true,
  'VCOM334-24041577',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 - temaki de salmão grelhado',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  NULL,
  true,
  'V2X1335-24041585',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 22 (24 pçs)',
  13.5,
  '{"takeaway":13.5,"dine_in":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/6b176772c2b8ccd7c416d96ab5e4c195.jpeg',
  true,
  'VCOM339-24042275',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 22 (24pçs)',
  22,
  '{"delivery":22}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/b5dd8a9464622a1a0f6496866cb4c069.jpeg',
  true,
  'VCOM342-24042274',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki de camarao filadelfia',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/b3a72eca73feffe5a8a01c01a7e2f735.jpeg',
  true,
  'VTEM343-24042410',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 25 (28 pçs)',
  19,
  '{"delivery":19}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM344-24042944',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 25 (24 pçs)',
  13.5,
  '{"delivery":19,"takeaway":13.5,"dine_in":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM345-24052221',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hossomaki de Robalo (8 pçs)',
  5,
  '{"delivery":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hossomaki'),
  NULL,
  true,
  'VHOS347-24061583',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 26 (24pçs)',
  22,
  '{"delivery":22}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM348-24072426',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Entradas',
  0,
  '{"takeaway":0,"delivery":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/86720edb13b1f04ce571384fa5faea50.png',
  true,
  'VENT349-24082185',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1',
  0,
  '{"delivery":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9b9deb2c8cb6f0e58b5776b39c468e42.png',
  true,
  'V2X1350-24082168',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Menu almoço',
  0,
  '{"takeaway":0,"delivery":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/dd247f42b11a1afceab0808aa696a283.png',
  true,
  'VMEN351-24082123',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Peças premium',
  0,
  '{"takeaway":0,"delivery":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9eb1096c71db7d440718f1011c862c09.png',
  true,
  'VPEC352-24082132',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinados',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/3f16a9d45dbf23be46e5c16416e97502.png',
  true,
  'VCOM356-24082260',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/fa3721559cf7b6ca018850bb26107d5d.png',
  true,
  'VSAS358-24082227',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/7a3e6b3bc03ff638c3c0a803cb294e82.png',
  true,
  'VNIG360-24082218',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/fa05b6c9d2a8ebeb31bf70e43b70784a.png',
  true,
  'VHOT362-2408221',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  'https://www.vendus.pt/foto/447c9a9afcd48d2bec5316dd88e6eac7.png',
  true,
  'VPOK364-24082266',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gunkan',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/013bb18fc05b4fbecde0ea11bcde45dc.png',
  true,
  'VGUN366-24082264',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki Hot',
  9,
  '{"delivery":11,"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/87ad59b5118d0c3778fa67b573d02f69.jpeg',
  true,
  'VTEM368-2408284',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi misto',
  12,
  '{"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  NULL,
  true,
  'VSAS370-24082850',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri misto (6 pç)',
  7.5,
  '{"takeaway":7.5,"dine_in":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  NULL,
  true,
  'VNIG371-24082840',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Super bock Garrsfa',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  NULL,
  true,
  'VSUP372-24082884',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Monte da alma da vinha',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VVIN373-24082894',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho tojeira',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VVIN374-24082899',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Monte da Vaqueira',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VVIN375-2408283',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Copo vinho branco Quintela',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VCOP376-2408286',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mini rolos Vegetais (6 un)',
  5.5,
  '{"delivery":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/aa137c6836b78679b57d664c1c6a6797.jpg',
  true,
  'VMIN377-24083064',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mini rolos Vegetais',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/9a9cc376dd124e6765d57a3ccb904706.jpg',
  true,
  'VMIN378-24083059',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Temaki',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/9ba1e7b1bb5d3dfa58c888c33ad5ddff.png',
  true,
  'VTEM379-24083061',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Big hot',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/6a4d77456d6b4d0a3a8451242e5edc0d.png',
  true,
  'VBIG381-24083054',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Veg',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/8d350cab992d140b310ee33aa7dabb62.png',
  true,
  'VVEG383-2408302',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sobremesa',
  0,
  '{"delivery":0,"takeaway":0,"dine_in":0}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sobremesas'),
  'https://www.vendus.pt/foto/3c26bf5ecaf2e8c56ef63be566b58385.png',
  true,
  'VSOB385-24083067',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Taxa de embalagem',
  0.5,
  '{"takeaway":0.5,"dine_in":0.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'outros'),
  NULL,
  true,
  'VTAX387-24091145',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Festival almoço',
  17,
  '{"takeaway":17,"dine_in":17}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VFES388-24091124',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sunomono',
  3.5,
  '{"delivery":4,"takeaway":3.5,"dine_in":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/6d1c1348ba6551a7abd91bee084cdc88.jpg',
  true,
  'VSUN389-24091649',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Saque',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VSAQ390-24101789',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'chessecake',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sobremesas'),
  NULL,
  true,
  'VCHE391-24101760',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 temaki de atum',
  9,
  '{"delivery":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/a5a859588125985bde385b8e30ee1dcd.jpeg',
  true,
  'V2X1392-24110151',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Chá Verde',
  1.2,
  '{"takeaway":1.2,"dine_in":1.2}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/216740f448198feacaf620b46d8a9fa5.jpg',
  true,
  'VCHA393-2411154',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sopa Missô',
  4.5,
  '{"takeaway":4.5,"delivery":5,"dine_in":4.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/598f75be2ce5b4a3472620cff509d9d0.jpg',
  true,
  'VSOP394-24111570',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri mix (10 pçs)',
  12,
  '{"delivery":13,"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  NULL,
  true,
  'VNIG395-24111784',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi de Salmão (2 pçs)',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/7be258d4f35a627ff88c22283a143a03.jpeg',
  true,
  'VSAS397-24111896',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi trufado (2 pçs)',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/acd629fc31cfc96857fc4de25a737481.jpeg',
  true,
  'VSAS398-24111840',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi Atum (2 pçs)',
  2.5,
  '{"takeaway":2.5,"delivery":3,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/b20707e2613f690ac089be929d678cd7.jpeg',
  true,
  'VSAS399-24111876',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi mix (10 pçs)',
  12,
  '{"takeaway":12,"delivery":13,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  NULL,
  true,
  'VSAS400-24111811',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi Salmão (2 pçs)',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/3d25e27e76a18765c163902d6f53da11.jpeg',
  true,
  'VSAS401-2411181',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi salmão trufado (2 pçs)',
  3,
  '{"delivery":3}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/027de0ec7d572ef26253780429713f48.jpeg',
  true,
  'VSAS402-2411184',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi peixe branco (2 pçs)',
  2.5,
  '{"delivery":3,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/ac29d12d280efaa9d6b1f9afb5443a22.jpeg',
  true,
  'VSAS405-2411187',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashimi salmão braseado (2 pçs)',
  2.5,
  '{"delivery":3,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'sashimi'),
  'https://www.vendus.pt/foto/5e135ef72231e006c1792de30c678edb.jpeg',
  true,
  'VSAS406-24111868',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'NIguiri Salmão (2 pçs)',
  2.5,
  '{"delivery":2.8,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/37d71de9dbbdea5166487f438f1970ca.jpeg',
  true,
  'VNIG409-2411181',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Atum (2 pçs)',
  2.5,
  '{"delivery":2.8,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/9b8e3df0029ca020003b5e5eecca7c87.jpeg',
  true,
  'VNIG410-24111843',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Peixe Branco lemon (2 pçs)',
  2.5,
  '{"delivery":2.8,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/a51323ad7be17b0f29dca6f9217bbacc.jpeg',
  true,
  'VNIG411-24111891',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Camarão lemon (2 pçs)',
  2.5,
  '{"delivery":2.8,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/f44028f0eb0fd3cb719f877a76a6445a.jpeg',
  true,
  'VNIG412-2411183',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Salmão braseado (2 pçs)',
  2.5,
  '{"delivery":2.8,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/7ef36a53a1810b11eb5232f4f00e070c.jpeg',
  true,
  'VNIG413-24111888',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Niguiri Salmão trufado (2 pçs)',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'nigiri'),
  'https://www.vendus.pt/foto/be1733fa32a8ea69d8cabbb2e4be2140.jpeg',
  true,
  'VNIG417-24111823',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura salm fila supre (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/6b37009cb0e5d2a73d68d8c30365c8fe.jpeg',
  true,
  'VURA421-24111950',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura salm fila camar supr (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/11029d7c2845c5a6e280051d3f8f27b6.jpeg',
  true,
  'VURA422-24111958',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura salm fila supre bras crisp (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/1c4097bb5f7bf7bcbd3206ad89ff1a08.jpeg',
  true,
  'VURA423-24111965',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura grelh supre brase crispy (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/00c189382fadcce2f6af214c3b758d83.jpeg',
  true,
  'VURA424-24111978',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura Salm supremo (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/e6219c68fe9bcf5ec29a8b37d2f1d7f2.jpeg',
  true,
  'VURA425-24111911',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura salm avoca c ovas (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/8a6e1739c7193343838fe7be0323d784.jpeg',
  true,
  'VURA426-2411195',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3) Ura salm fila avoc c ovas (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/0aacdb41f59aa0921a7f4bf0537da6cb.jpeg',
  true,
  'VURA427-24111953',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura camar fila pana supr (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/72184161568b809a871140a9d86f8c49.jpeg',
  true,
  'VURA428-24111974',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '14) Ura salm supre c peix bran (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/0394e4aa97b22c662e62daefc445124f.jpeg',
  true,
  'VURA429-24111982',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura camar fila sup de salm (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/fca43c51b944f25e54c937743194db7c.jpeg',
  true,
  'VURA430-24111990',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Ura camar c peix bran (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/0413b9a87639a56d4685e45a35ad8f1a.jpeg',
  true,
  'VURA431-24111978',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '6) Ura atum sup c ovas (2pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/ebc96dbe8bc9f85398e692a75539df12.jpeg',
  true,
  'VURA432-24111974',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Ura atum avoc spicy (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/7c75a5850e54ad317a25e3c14a0c8e98.jpeg',
  true,
  'VURA433-24111983',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'yakisoba',
  9.5,
  '{"takeaway":9.5,"delivery":11.5,"dine_in":9.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/92db261124f1f9cd6c76bdc82b972409.jpeg',
  true,
  'VYAK434-2411212',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado 25 (60 pçs)',
  32,
  '{"delivery":47,"takeaway":32,"dine_in":32}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/bfb9afc3e008a17f2724c94e7464f4fd.jpeg',
  true,
  'VCOM436-2411212',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '9) Ura salmão com manga',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/e580a830b55ac696fe3232dae519a9e1.jpeg',
  true,
  'VURA438-24112268',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '1) Ura salm fila supre (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/0ae4745d42c33c55f8880e1ab512acaa.jpeg',
  true,
  'V1-U439-24112239',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '5) Ura salm fila camar supr (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/3218b2e8fda7a7621d5a8c01d7a2cab9.jpeg',
  true,
  'V5-U440-24112262',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '4) Ura salm fila supre bras crisp (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/c8738db855b95e15523e6a9338804dfa.jpeg',
  true,
  'VURA441-24112214',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '13) Ura grelh supre brase crispy (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/6d006e6864254198400681aedcd45ed4.jpeg',
  true,
  'V13-442-24112280',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2) Ura Salm supremo (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/a20351c7633089ffff1c99ffc7ade5f7.jpeg',
  true,
  'V2-U443-24112216',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '11) Ura salm avoca c ovas (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/879730839fb0e25f7687b85e5596c098.jpeg',
  true,
  'V11-444-24112216',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '12) Ura camar fila pana supr (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/7f847a5deeeeb328238d54b24919ed9a.jpeg',
  true,
  'V12-445-24112265',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '8) Ura camar fila sup de salm (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/bd0069818ebc6a8d0306e26ddb7236bd.jpeg',
  true,
  'V8-U446-24112277',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Ura atum avoc spicy (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/fa129691541a331b21a9974600546a37.jpeg',
  true,
  'V7-U447-24112288',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '14) Ura salmão com manga',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/3e1cc9b6b1d7678aaf5f8de5aefa0855.jpeg',
  true,
  'V9-U456-24112264',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '8) Ura salm avoca c ovas (2 pçs)',
  2.5,
  '{"takeaway":2.5,"delivery":3.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/371e7bd00774861a57d6bf69f3cc846c.jpeg',
  true,
  'V11-458-24112275',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'uramaki tomate seco e rucula',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  NULL,
  true,
  'VURA462-24112288',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2) Ura salm fila camar supr (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/24dd66bc1d102b5071ea9ae322012b26.jpeg',
  true,
  'V2-U465-24112742',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3) Ura salm fila supre bras crisp (2 pçs)',
  3.5,
  '{"delivery":3.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/f5de0144ca9f4fe79ef35a35e1591f9f.jpeg',
  true,
  'VURA467-24112736',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3)Ura salm fila supre bras crisp (2 pçs)',
  2.5,
  '{"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/942a0d1de4140cc161dc09121d1c9ee8.jpeg',
  true,
  'V3-U468-2411271',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '4) Ura grelh supre brase crispy (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/aa7f228d6ff4ce37a885d6838b72e145.jpeg',
  true,
  'V4-U469-24112798',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '5) Ura salm fila avoc c ovas (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/7db4ea452aabc51202ecd5a223927590.jpeg',
  true,
  'V5-U471-2411278',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '6) Ura Salm supremo (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/6140f9d15fa12f3e07feac35821b3cb5.jpeg',
  true,
  'V6-U473-24112740',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Ura atum avoc spicy (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/5af7f020f8e38a183f724ad1d7b728e2.jpeg',
  true,
  'V8-U475-24112748',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '11) Ura camar fila sup de salm (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/f7fe0ac720e291f3c6fd48e44d24ad57.jpeg',
  true,
  'V11-477-24112737',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Ura salm supre c peix bran (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/7f04c62f83c387e195e9b88228be6cc0.jpeg',
  true,
  'V7-U481-24112725',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '9) Ura atum sup c ovas (2pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/abc099895ca8e2257c96bb7efe626085.jpeg',
  true,
  'V9-U483-24112728',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '12) Ura camar c peix bran (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/5cc9d9797569c6099fb478131dc707e8.jpeg',
  true,
  'V12-485-24112740',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '13) Ura camar fila pana supr (2 pçs)',
  2.5,
  '{"delivery":3.5,"takeaway":2.5,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/c0951c8f40ce712101bb3a8454fc2f89.jpeg',
  true,
  'V13-487-24112741',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Camarão ao alho',
  6,
  '{"delivery":7.5,"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/a258d7b3c8df32d1fe8a6225d5f567df.jpeg',
  true,
  'VCAM490-24113013',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Gohan (32 pçs)',
  25.5,
  '{"delivery":25.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/0df68cde9d3801a56223e02d488ab958.jpg',
  true,
  'VCOM492-24122289',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinadpo Gohan (32 pçs)',
  19,
  '{"takeaway":19,"dine_in":19}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a459b4611673ef74a9851990fccd8a67.jpg',
  true,
  'VCOM493-2501040',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '1) Ura salm fila supre (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/e6e67dd541644c333f87a30bd012cb81.jpeg',
  true,
  'V1-U494-25010648',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '8) Ura salm avoca c ovas (4 pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/8a9d5e0006eec082d1c9e12055cadb54.jpeg',
  true,
  'V8-U496-25010641',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '11) Ura camar fila sup de salm (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/fb9da768eb91068e153af8e2e42af326.jpeg',
  true,
  'V11-497-25010621',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '12) Ura camar c peix bran (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/3761cab6abcfc252f848f9eef42c865c.jpeg',
  true,
  'V12-498-25010633',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '13) Ura camar fila pana supr (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/ced405e9027d52de4983e4c150330046.jpeg',
  true,
  'V13-500-2501063',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '14) Ura salmão com manga (4 pçs)',
  5,
  '{"takeaway":5,"delivery":7,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/55beac311f1a007e7a1ddb3879eda3bd.jpeg',
  true,
  'V14-502-25010613',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2) Ura salm fila camar supr (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/c2e5d60e89e02022d2a804b374690296.jpeg',
  true,
  'V2-U503-25010675',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3)Ura salm fila supre bras crisp (4 pçs)',
  5,
  '{"takeaway":5,"delivery":7,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/93ce8397fb1cac0963a6ca654122eaab.jpeg',
  true,
  'V3-U505-25010650',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '4) Ura grelh supre brase crispy (4 pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/2f0151e2ca299dbeb01f95a08b5445f8.jpeg',
  true,
  'V4-U507-2501066',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '5) Ura salm fila avoc c ovas (4 pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/6b3338e50d8776020d1cd0f711a84d4c.jpeg',
  true,
  'V5-U509-25010697',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '6) Ura Salm supremo (4 pçs)',
  5,
  '{"takeaway":5,"delivery":7,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/640710c70561b2c8a46e4af8ceb1c457.jpeg',
  true,
  'V6-U510-25010669',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Ura atum avoc spicy (4 pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/2315b88e2f488f568bd3669c3c909709.jpeg',
  true,
  'V10-512-25010621',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '9) Ura atum sup c ovas (4pçs)',
  5,
  '{"delivery":7,"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/ccd865b34ed9cfe64f03b1b0de820d10.jpeg',
  true,
  'V9-U514-25010658',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Ura atum avoc spicy (4 pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/b4a39045061ffba66546f2947b9b8adc.jpeg',
  true,
  'V7-U516-25010638',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '1) Gunkan Salmão Fila (4 pçs)',
  5,
  '{"takeaway":5,"delivery":6.5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/d91437ba31770c33cf31577e47c6fc58.jpeg',
  true,
  'VGUN518-25010683',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '6) Gunkan de salmão fila bras. (4 pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/77745e25483b7f75cbaef778a4adac43.jpeg',
  true,
  'VGUN519-25010658',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2) Gunkan Crispy (4 pçs)',
  5.5,
  '{"takeaway":5.5,"delivery":7,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/4eba8b78eb41028008296d1dcf4a03ee.jpeg',
  true,
  'VGUN520-25010629',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Gunkan Crispy Bras. (4 pçs)',
  5.5,
  '{"takeaway":5.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/51b529efe0f2854fdb13e2517d820dfc.jpeg',
  true,
  'VGUN521-25010677',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Gunkan de Salmão Clássico (4 pçs)',
  5.5,
  '{"takeaway":5.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/12a42933b8edfc941e3bd172f59cafd3.jpeg',
  true,
  'VGUN522-25010623',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '9) Gunkan de Salmão Bras. (4 pçs)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/8d6f43a3412ef00b32e67c058b6d46d7.jpeg',
  true,
  'VGUN523-25010636',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '4) Gunkan Salmão e Camarão (4 pçs)',
  5.5,
  '{"takeaway":5.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/ba6da81a18222605fde16ae6b3676307.jpeg',
  true,
  'VGUN524-2501062',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3) Gunkan com Cebola Caram. (4 pçs)',
  5.5,
  '{"takeaway":5.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/604853f5ce178315c235228ace030052.jpeg',
  true,
  'VGUN525-2501063',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '5) Gunkan Lovers (4 pçs)',
  6,
  '{"takeaway":6,"delivery":7.5,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/b16cda3709761c507e0bf95c08334fed.jpeg',
  true,
  'VGUN526-25010625',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '8) Gunkan Grill (4 pçs)',
  5.5,
  '{"takeaway":5.5,"delivery":7.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/4f89484b05376bf2ac67f910da3c28f6.jpeg',
  true,
  'VGUN527-25010687',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '12) Gunkan de pepino (4 pçs)',
  2.5,
  '{"takeaway":2.5,"delivery":7,"dine_in":2.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/59d3be69840e561fd6e09fdc4d02a043.jpeg',
  true,
  'VGUN528-25010624',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '11) Gunkan Tropical (4 pçs)',
  5.5,
  '{"takeaway":5.5,"delivery":7,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/05ea1ffcf4bc1b3089d59ebc421ebf09.jpeg',
  true,
  'VGUN529-25010652',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '13) Gunkan Salmão e Atum (4 pçs)',
  5.5,
  '{"takeaway":5.5,"delivery":7.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/2c8daf523de39fd566f599c83b684fdc.jpeg',
  true,
  'VGUN530-25010648',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '14) Gunkan Salmão e Atum com ovas (4 pçs)',
  6,
  '{"takeaway":6,"delivery":7.5,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/47ce64e0e40ee6ecc95d748d1a5d1a1e.jpeg',
  true,
  'VGUN531-25010660',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '15) Gunkan de Salmão e peixe branco (4 pçs)',
  5.5,
  '{"takeaway":5.5,"delivery":7.5,"dine_in":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/da362753c378637449ae2c1f4f9376ea.jpeg',
  true,
  'VGUN532-25010647',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '16) Gunkan do chef (4 pçs)',
  6.5,
  '{"takeaway":6.5,"delivery":8.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/bb15e0217c2c9ebf05600ae225161380.jpeg',
  true,
  'VGUN533-25010687',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Nori(16 pçs)',
  16.5,
  '{"delivery":16.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM534-25010772',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '3) Gunkan c cebola carameli (4 çs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/55761ab890da29db99b3ea53d61cfe94.jpeg',
  true,
  'V3-G537-2501094',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '4) Gunkan Salmão e Cama (4 pçs)',
  7.5,
  '{"delivery":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/c838b6152de28517349f21c297cd6dde.jpeg',
  true,
  'V4-G538-25010973',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '6) Gunkan Salmão Fila Brase (4 pçs)',
  7.5,
  '{"delivery":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/5fc19aeab07c781b6115dfe8e6f0c63a.jpeg',
  true,
  'V6-G540-25010991',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Gunkan crispy brase (4 pçs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/97ec949370ee8342fc901e3ccf9bc3ed.jpeg',
  true,
  'V7-G541-25010937',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '9) Gunkan Salmão Braseado (4 pçs)',
  7.5,
  '{"delivery":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/0c56fc0161b0a96639c219a37e6940c5.jpeg',
  true,
  'V9-G543-25010917',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Gunkan Salmão Clássico (4 pçs)',
  7.5,
  '{"delivery":7.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/881e712bb0e8b8498f7baab0512b5138.jpeg',
  true,
  'V10-544-25010914',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combinado Sudarê (24pçs)',
  23.5,
  '{"delivery":23.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VCOM551-25010925',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Uramaki mix',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  NULL,
  true,
  'VURA552-25010913',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Kombu (16 pçs)',
  12.5,
  '{"delivery":17,"takeaway":12.5,"dine_in":12.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/5b4f8297d07506c4fce3cccc1225cb7a.jpeg',
  true,
  'VKOM553-25011266',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mirin (16 pçs)',
  13.5,
  '{"takeaway":13.5,"dine_in":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/18f04689c9a0f625a6eb6c676306633b.jpeg',
  true,
  'VMIR555-25011298',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mirin (24 pçs',
  22,
  '{"delivery":22}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a0e63d8b5e51522293a10144f8e845c9.jpeg',
  true,
  'VMIR556-2501120',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sésamo (24 pçs)',
  14.5,
  '{"delivery":25,"takeaway":14.5,"dine_in":14.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/e3a63573e1cdc3a0090e5c3370c7bfb8.jpeg',
  true,
  'VSES557-2501121',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Shoyo (60 pçs)',
  34,
  '{"delivery":55,"takeaway":34,"dine_in":34}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/c83113dbe910ffb7c67717324c60e125.jpeg',
  true,
  'VSHO559-25011218',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Soja (60 pçs)',
  32,
  '{"delivery":51,"takeaway":32,"dine_in":32}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'condimentos'),
  'https://www.vendus.pt/foto/4eead6100762a58dcba2ad32d3babb41.jpeg',
  true,
  'VSOJ561-25011253',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Shari (16 Pçs)',
  13,
  '{"delivery":17,"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/55db9bf440e4304ef9ee30e65ec9cb52.jpeg',
  true,
  'VSAL563-25011264',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hashi(16 pçs)',
  17,
  '{"delivery":17}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/3a095f526603a348957df4daea0f46d3.png',
  true,
  'VSAL565-25011241',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hashi (16 pçs)',
  13,
  '{"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/ff0ec29feeff036f757c2c1ee721a0e0.png',
  true,
  'VSAL566-25011260',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Fish (16 pçs)',
  13.5,
  '{"delivery":17.5,"takeaway":13.5,"dine_in":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9243bc550020818a2a27e93d0a1cd8fd.jpeg',
  true,
  'VO-M567-25011293',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Su (16 pçs)',
  13,
  '{"delivery":17,"takeaway":13,"dine_in":13}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/7f2e09cf8dde69d328478e80efd303e8.png',
  true,
  'VSU-569-25011278',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'California (24 pçs)',
  16,
  '{"takeaway":16,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/fe6ed199114ebc267fc155ac25690f6e.jpg',
  true,
  'VCAL571-2501126',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Califórnia (24 pçs)',
  22,
  '{"delivery":22}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/81eaf254603726330e47204e78c2d423.jpg',
  true,
  'VCAL572-25011245',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Maki (24 pçs)',
  16,
  '{"delivery":23,"takeaway":16,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/a0d4eaa6fa9f9ec992068a894667512a.jpeg',
  true,
  'VMAK573-25011262',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sashi (24 pçs)',
  18,
  '{"delivery":23,"takeaway":18,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/435ade6fde508c5b310feed55f0abb75.jpeg',
  true,
  'VSAS575-25011252',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salmon Fila (24 pçs)',
  18,
  '{"takeaway":18,"delivery":23,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/c1aa94aa1d86ef8217c7366b93af5f76.jpeg',
  true,
  'VSAL577-25011256',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salmon Classic (24 pçs)',
  18,
  '{"delivery":23,"takeaway":18,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/9a9bc5f27fde55f7c374685c7d2b4656.jpeg',
  true,
  'VSAL579-25011237',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Do Japa (24 pçs)',
  18,
  '{"delivery":23,"takeaway":18,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/d8113122eb813c997ddaaab1ccaaabff.jpeg',
  true,
  'VDO-581-25011386',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salmon Tuna (58 pçs)',
  37,
  '{"delivery":49,"takeaway":37,"dine_in":37}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/ef9be5a5f0d592cef9b9d7cec3821e32.jpeg',
  true,
  'VSAL583-2501134',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salmon Fusion (58 pçs)',
  37,
  '{"delivery":49,"takeaway":37,"dine_in":37}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/e6b7032259970cc4ebfecceab1ad1f5d.png',
  true,
  'VSAL585-25011317',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salmon Lovers (58 pçs)',
  43,
  '{"delivery":55.5,"takeaway":43,"dine_in":43}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/2dbc4205274c4193379440a2a32cb8b7.jpeg',
  true,
  'VSAL587-25011387',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Do Mar (60 pçs)',
  44,
  '{"delivery":58,"takeaway":44,"dine_in":44}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/3cc15e38308f813840dfa37d361be035.jpeg',
  true,
  'VDO-589-25011332',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '5) Ura de salm fila avo (4 pçs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/d2ea9ef2eb1e8b31472bbc58b1a1c845.jpeg',
  true,
  'V5-U591-25011478',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '8) Ura de salm Cali c ov (4 pçs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/8d44270576a0c35dcbc4cbcfa943c792.jpeg',
  true,
  'V8-U592-25011460',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '10) Ura de atum avo spi (4 pçs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/2c179a863363d6e10ca6d40022e3a068.jpeg',
  true,
  'V10-593-2501142',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Ura sal  c pei bran lem (4 pçs)',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/96125fc4658c643ffaad47a23ede5290.jpeg',
  true,
  'V7-U594-25011493',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2X1 Temaki de delicias e camarão',
  9,
  '{"delivery":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  NULL,
  true,
  'V2X1595-25011778',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 Combinado frio (8 pçs)',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/c9939c0599760551e7e4b19c5d5edf5c.jpeg',
  true,
  'V2X1596-25011739',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Nori (16 pçs)',
  12,
  '{"takeaway":12,"delivery":16.5,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/74b85959d5a4c8f4c449a1e58284ddec.jpeg',
  true,
  'VCOM597-25011793',
  'synced',
  '{takeaway,delivery,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sudarê (24pçs)',
  14.5,
  '{"takeaway":14.5,"dine_in":14.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f40d1b78efb8428ea033270e8c6be1aa.jpeg',
  true,
  'VCOM599-25011765',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sudarê (24 pçs)',
  23.5,
  '{"delivery":23.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/cc8bb6aef6c21f0145a1fb75d4b960b5.jpeg',
  true,
  'VSUD600-25011762',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gohan (32 pçs)',
  19,
  '{"delivery":26.5,"takeaway":19,"dine_in":19}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/ed12fafc42389da0d6d196b220b41774.jpg',
  true,
  'VGOH601-25011711',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mirin (24 pçs)',
  13.5,
  '{"takeaway":13.5,"dine_in":13.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/d3b0edb8d0f737fa48de374b702c8dab.jpeg',
  true,
  'VMIR603-25011755',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Minirolos de queijo (6pçs)',
  5.5,
  '{"delivery":5.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/01ee94087949ab82353c1e0a328f027a.jpg',
  true,
  'VMIN604-25011880',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Minirolos de queijo (6 pçs)',
  4,
  '{"takeaway":4,"dine_in":4}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/f71eb52915726b958cfb738262f9ab5b.jpg',
  true,
  'VMIN605-25011851',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 Combinado frio',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/48287078a4ae4ac6a86fbe239baf207b.jpeg',
  true,
  'V2X1606-25012340',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mini Yakitori (2 un)',
  4.5,
  '{"takeaway":4.5,"dine_in":4.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/29d5a28491d5ced1bdfbce169886f3db.jpg',
  true,
  'VMIN608-2501279',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salada Tropical',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/3a1462fe1690e7e9a876431a83e89ac2.jpg',
  true,
  'VSAL609-25012731',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Salada Salmon Fresh',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'entradas'),
  'https://www.vendus.pt/foto/3cc9327870690d71ffa6e18e59ea9aef.jpg',
  true,
  'VSAL610-25012782',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '15) Special Salmon (4 pçs)',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/fd420850de0ba7a810b07e9d8c3295ca.jpg',
  true,
  'V15-611-25012762',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '16) Uramaki Mix (4 pçs)',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/ccd4d2c3ad34a835fc29b6e7d8678f55.jpg',
  true,
  'V16-612-25012775',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '17) Gunkan do chef (4 pçs)',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/a8b3c85b2eca74f35f4942dbedc25e7d.jpg',
  true,
  'V17-613-25012763',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '16) Gunkan Hot Shrimp (4 pçs)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/4d2cbb05274f18e31622158f188e00c2.jpg',
  true,
  'V16-614-25012764',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Shrimp Filadélfia (8 pçs)',
  9,
  '{"takeaway":9,"dine_in":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/0cdde00c773be4bdff7c5b62ca231554.jpg',
  true,
  'VHOT615-2501279',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Especial (8 pçs)',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/3fddb7f5b8ff8c3f1d14687401c7751e.jpg',
  true,
  'VHOT616-25012725',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Hot Veg Crispy (8 pçs)',
  7,
  '{"takeaway":7,"dine_in":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'hot'),
  'https://www.vendus.pt/foto/1535c5777266cd87139ce9c8b5305e8c.jpg',
  true,
  'VHOT617-25012799',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Poke do Chef',
  16,
  '{"takeaway":16,"dine_in":16}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'poke'),
  NULL,
  true,
  'VPOK618-25012769',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Mojito',
  6.5,
  '{"takeaway":6.5,"dine_in":6.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'bebidas'),
  'https://www.vendus.pt/foto/d94562a8ae08977b936c787ea1c77783.jpg',
  true,
  'VMOJ619-25020340',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Combo Valentines day',
  45,
  '{"delivery":60,"takeaway":45,"dine_in":45}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/b702b1c71751b43c4cf3b86cda7b0877.jpeg',
  true,
  'VCOM620-25021141',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'menu valentines day 35 pessoa',
  35,
  '{"takeaway":35,"dine_in":35}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  NULL,
  true,
  'VMEN622-25021424',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 temaki de grelhado',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/6f146fc0a49e762bb2493e50ac121be8.jpeg',
  true,
  'V2X1623-25021886',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 Uramaki grelhado',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/62e6ce36e4e7a85623034d39c0146e00.png',
  true,
  'V2X1624-25021888',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '7) Ura salm peixe bran lemon (4pçs)',
  5,
  '{"takeaway":5,"dine_in":5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  'https://www.vendus.pt/foto/3a9e714b9b8f18c393f59cd1862e3753.jpeg',
  true,
  'V7-U625-25022083',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 Uramaki + Hot (8 pçs',
  9,
  '{"delivery":9}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'uramaki'),
  NULL,
  true,
  'V2X1626-25022432',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Taxa de desperdício',
  1,
  '{"takeaway":1,"dine_in":1}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'outros'),
  NULL,
  true,
  'VTAX627-25022510',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Yanagi (40 pçs)',
  24,
  '{"delivery":37.5,"takeaway":24,"dine_in":24}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/dd37141a73f4b7fade5d977d7ca437c6.jpeg',
  true,
  'VYAN628-2502253',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sangria vinho branco',
  18,
  '{"takeaway":18,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/0f4606f4b757d20c1ba336093e4496e4.jpg',
  true,
  'VSAN629-25030180',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sangria Vinho Tinto',
  18,
  '{"takeaway":18,"dine_in":18}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/b8cdfb61497a44028508db0f6e29af99.jpg',
  true,
  'VSAN630-2503018',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'sangria de frutos vermelhos',
  21,
  '{"takeaway":21,"dine_in":21}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/a76dbab1ff72a7dfa92c6363513bf72b.jpg',
  true,
  'VSAN631-25030169',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sangria tropical',
  21,
  '{"takeaway":21,"dine_in":21}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  'https://www.vendus.pt/foto/718f8eea768fa55d73255962b31a4650.jpg',
  true,
  'VSAN632-25030117',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2X1 temaki Atum mayo',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/32e975724dc1d1e1187e59ac811e85c6.jpeg',
  true,
  'V2X1641-25042365',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '2x1 Temaki de mayo spyce',
  7,
  '{"delivery":7}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/b0a8c9d9d8d983a0499d31e6af1b926d.jpeg',
  true,
  'V2X1642-2504234',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Sake (12pçs + 1 Temaki)',
  20.5,
  '{"delivery":20.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'temaki'),
  'https://www.vendus.pt/foto/e346dcd20adc49ef7eba9f5d9b9cd939.jpeg',
  true,
  'VSAK646-25071930',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Massa maré alta',
  12,
  '{"delivery":15.5,"takeaway":12,"dine_in":12}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/8598dae4e00a5f1592239c2d74b9ebb7.jpeg',
  true,
  'VMAS647-2507226',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Massa Oriente',
  10.5,
  '{"delivery":16,"takeaway":10.5,"dine_in":10.5}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'pratos-quentes'),
  'https://www.vendus.pt/foto/4b11548b47ca38c34c4111fc44af7f50.jpeg',
  true,
  'VMAS649-2507234',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Vinho Mateus Rose',
  11,
  '{"delivery":11}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'vinhos-sake'),
  NULL,
  true,
  'VMAT651-25103058',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Haru (24 pçs)',
  19,
  '{"delivery":29,"takeaway":19,"dine_in":19}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/8bd7b52eb76f15ec08a0137f406ad8be.jpeg',
  true,
  'VHAR652-26010945',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '18) Gunkan de salmão e morango (4 pçs)',
  6,
  '{"delivery":7.5,"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/2d820a9205c0a6c48d3be25107c0e7bd.jpeg',
  true,
  'V18-654-26011036',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '19) Gunkan de salmão e framboesa (4 pçs)',
  6,
  '{"delivery":7.5,"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/adb6eb432fd754921596ce1e28a861e5.jpeg',
  true,
  'V19-656-26011036',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Yanagi',
  34,
  '{"delivery":34}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'menus'),
  'https://www.vendus.pt/foto/6beee6ce27623afedd1f500162863548.jpeg',
  true,
  'VYAN658-26011241',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'Gyoza de frango (4 pçs)',
  8,
  '{"delivery":8}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gyoza'),
  'https://www.vendus.pt/foto/e872fc63d9d362c367c04189b66f5c39.jpeg',
  true,
  'VGYO659-26011548',
  'synced',
  '{delivery}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  '20) Gunkan de Salmão fila com molho de maracujá (4 pçs)',
  6,
  '{"delivery":7.5,"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gunkan'),
  'https://www.vendus.pt/foto/ecf7a5af9d865cc5b0eb327a0978da56.jpeg',
  true,
  'V20-660-26011512',
  'synced',
  '{delivery,takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, service_prices, category_id, image_url, is_available, vendus_reference, vendus_sync_status, service_modes)
VALUES (
  'gyoza de frango (4pçs)',
  6,
  '{"takeaway":6,"dine_in":6}'::jsonb,
  (SELECT id FROM categories WHERE slug = 'gyoza'),
  'https://www.vendus.pt/foto/dbfd9d3e462b8b88a4e114ff2ab8be03.jpeg',
  true,
  'VGYO662-2601150',
  'synced',
  '{takeaway,dine_in}'
)
ON CONFLICT DO NOTHING;

COMMIT;
