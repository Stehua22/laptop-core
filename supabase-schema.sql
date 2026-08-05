-- ============================================================
-- LaptopCore - Full Supabase Schema + Seed Data
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard > SQL Editor > New Query
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

create table if not exists public.laptops (
  id          bigserial primary key,
  brand       text not null,
  model       text not null,
  specs       text,
  store       text,
  url         text,
  retail_price numeric(10,2),
  release_year int,
  date_added  date default current_date,
  created_at  timestamptz default now(),
  image_url   text,
  screen_size numeric(4,1),
  weight_kg   numeric(4,2),
  good_for    text
);

create table if not exists public.price_history (
  id          bigserial primary key,
  laptop_id   bigint references public.laptops(id) on delete cascade,
  price       numeric(10,2) not null,
  recorded_at date default current_date,
  created_at  timestamptz default now()
);

create table if not exists public.recommendations (
  id       bigserial primary key,
  category text not null unique,
  laptop_ids integer[] not null
);

create table if not exists public.laptop_designs (
  laptop_id         bigint primary key references public.laptops(id) on delete cascade,
  color_hex         text default '#1a1a2e',
  finish            text default 'Matte',
  backlight         text default 'Off',
  open_angle        int  default 110,
  logo_glow         boolean default false,
  updated_at        timestamptz default now()
);

create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text,
  content     text,
  category    text,
  author      text default 'LaptopCore',
  cover_image text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Indexes
create index if not exists price_history_laptop_id_idx on public.price_history(laptop_id);
create index if not exists price_history_recorded_at_idx on public.price_history(recorded_at);

-- ── Row Level Security ────────────────────────────────────────
alter table public.laptops        enable row level security;
alter table public.price_history  enable row level security;
alter table public.recommendations enable row level security;
alter table public.laptop_designs  enable row level security;
alter table public.articles        enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public read laptops"          on public.laptops;
drop policy if exists "Public insert laptops"        on public.laptops;
drop policy if exists "Public update laptops"        on public.laptops;
drop policy if exists "Public delete laptops"        on public.laptops;
drop policy if exists "Public read price_history"    on public.price_history;
drop policy if exists "Public insert price_history"  on public.price_history;
drop policy if exists "Public delete price_history"  on public.price_history;
drop policy if exists "Public read recommendations"  on public.recommendations;
drop policy if exists "Public all recommendations"   on public.recommendations;
drop policy if exists "Public read laptop_designs"   on public.laptop_designs;
drop policy if exists "Public all laptop_designs"    on public.laptop_designs;
drop policy if exists "Public read articles"         on public.articles;
drop policy if exists "Public all articles"          on public.articles;

create policy "Public read laptops"         on public.laptops        for select using (true);
create policy "Public insert laptops"       on public.laptops        for insert with check (true);
create policy "Public update laptops"       on public.laptops        for update using (true);
create policy "Public delete laptops"       on public.laptops        for delete using (true);

create policy "Public read price_history"   on public.price_history  for select using (true);
create policy "Public insert price_history" on public.price_history  for insert with check (true);
create policy "Public delete price_history" on public.price_history  for delete using (true);

create policy "Public read recommendations" on public.recommendations for select using (true);
create policy "Public all recommendations"  on public.recommendations for all using (true);

create policy "Public read laptop_designs"  on public.laptop_designs  for select using (true);
create policy "Public all laptop_designs"   on public.laptop_designs  for all using (true);

create policy "Public read articles"        on public.articles        for select using (true);
create policy "Public all articles"         on public.articles        for all using (true);

-- ── Seed Laptops (50 laptops, 8 brands) ─────────────────────
insert into public.laptops (id, brand, model, specs, store, url, retail_price, release_year, date_added, screen_size, weight_kg, good_for) values

-- Apple (10)
(1,  'Apple', 'MacBook Air M1',              'Apple M1, 8GB RAM, 256GB SSD, 13.3" Retina',               'Apple',     'https://www.apple.com/ca/macbook-air/',                                          999,  2020, '2020-11-01', 13.3, 1.29, 'student,home'),
(2,  'Apple', 'MacBook Air M2',              'Apple M2, 8GB RAM, 256GB SSD, 13.6" Liquid Retina',         'Apple',     'https://www.apple.com/ca/macbook-air-m2/',                                       1299, 2022, '2022-06-01', 13.6, 1.24, 'student,home,programming'),
(3,  'Apple', 'MacBook Air M3',              'Apple M3, 16GB RAM, 512GB SSD, 13.6" Retina',               'Apple',     'https://www.apple.com/ca/macbook-air/',                                          1499, 2024, '2024-03-01', 13.6, 1.24, 'student,home,programming'),
(4,  'Apple', 'MacBook Air M3 15"',          'Apple M3, 8GB RAM, 256GB SSD, 15.3" Liquid Retina',         'Apple',     'https://www.apple.com/ca/macbook-air/',                                          1499, 2024, '2024-03-01', 15.3, 1.51, 'student,home'),
(5,  'Apple', 'MacBook Pro 14" M3',          'Apple M3, 16GB RAM, 512GB SSD, 14.2" ProMotion',            'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                1999, 2023, '2023-11-01', 14.2, 1.55, 'business,programming'),
(6,  'Apple', 'MacBook Pro 14" M3 Pro',      'Apple M3 Pro, 18GB RAM, 512GB SSD, 14.2" ProMotion',        'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                2399, 2023, '2023-11-01', 14.2, 1.61, 'business,programming'),
(7,  'Apple', 'MacBook Pro 16" M3 Pro',      'Apple M3 Pro, 18GB RAM, 512GB SSD, 16.2" ProMotion',        'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                2899, 2023, '2023-11-01', 16.2, 2.14, 'business,programming'),
(8,  'Apple', 'MacBook Pro 16" M3 Max',      'Apple M3 Max, 36GB RAM, 1TB SSD, 16.2" ProMotion',          'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                4299, 2023, '2023-11-01', 16.2, 2.16, 'business,programming'),
(9,  'Apple', 'MacBook Pro 14" M4',          'Apple M4, 16GB RAM, 512GB SSD, 14.2" ProMotion',            'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                2199, 2024, '2024-11-01', 14.2, 1.55, 'business,programming'),
(10, 'Apple', 'MacBook Pro 16" M4 Pro',      'Apple M4 Pro, 24GB RAM, 512GB SSD, 16.2" ProMotion',        'Apple',     'https://www.apple.com/ca/macbook-pro-14-and-16/',                                3199, 2024, '2024-11-01', 16.2, 2.14, 'business,programming'),

-- Lenovo (12)
(11, 'Lenovo', 'ThinkPad X1 Carbon Gen 10',  'Intel i5-1235U, 16GB RAM, 512GB SSD, 14" FHD',             'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-10/overview', 1699, 2022, '2022-01-01', 14.0, 1.12, 'business'),
(12, 'Lenovo', 'ThinkPad X1 Carbon Gen 11',  'Intel i7-1365U, 16GB RAM, 512GB SSD, 14" FHD',             'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-11/overview', 1799, 2023, '2023-01-01', 14.0, 1.12, 'business'),
(13, 'Lenovo', 'ThinkPad X1 Carbon Gen 12',  'Intel Ultra 7 155U, 32GB RAM, 512GB SSD, 14" FHD',         'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/lenovo/thinkpad',                              1699, 2024, '2024-01-01', 14.0, 1.09, 'business'),
(14, 'Lenovo', 'ThinkPad X1 Carbon Gen 13',  'Intel Ultra 7 165U, 32GB RAM, 1TB SSD, 14" FHD',           'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-13/overview', 1799, 2025, '2025-01-01', 14.0, 1.09, 'business'),
(15, 'Lenovo', 'ThinkPad T14 Gen 5',         'Intel i7-1355U, 16GB RAM, 512GB SSD, 14" WUXGA',           'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/thinkpad/thinkpad-t-series/thinkpad-t14-gen-5/overview', 1499, 2024, '2024-01-01', 14.0, 1.38, 'business'),
(16, 'Lenovo', 'IdeaPad Slim 5i Gen 9',      'Intel i5-120U, 16GB RAM, 512GB SSD, 15.6" FHD',            'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/lenovo',                                       799,  2024, '2024-06-01', 15.6, 1.62, 'student,home'),
(17, 'Lenovo', 'IdeaPad Flex 5i Gen 8',      'Intel i5-1335U, 16GB RAM, 512GB SSD, 14" FHD Touch',       'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/ideapad/ideapad-flex-series/overview',     899,  2023, '2023-06-01', 14.0, 1.50, 'student,home'),
(18, 'Lenovo', 'Yoga 9i Gen 9',              'Intel Ultra 7 155H, 32GB RAM, 1TB SSD, 14" 2.8K OLED',     'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/yoga/yoga-9-series/overview',              1799, 2024, '2024-01-01', 14.0, 1.38, 'business,programming'),
(19, 'Lenovo', 'Slim 7i Aura Edition',       'Intel Core Ultra 7 258V, 32GB RAM, 1TB SSD, 14" OLED',     'Best Buy',  'https://www.bestbuy.ca/en-ca/product/lenovo-slim-7i-14/19220077',                 1599, 2025, '2025-01-01', 14.0, 1.23, 'business,student'),
(20, 'Lenovo', 'ThinkPad Z16 Gen 2',         'AMD Ryzen 7 PRO 7840U, 32GB RAM, 1TB SSD, 16" 2.5K OLED',  'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/thinkpad/thinkpadz/overview',               2499, 2023, '2023-01-01', 16.0, 1.95, 'business,programming'),
(21, 'Lenovo', 'Yoga Slim 7x',               'Snapdragon X Elite, 16GB RAM, 512GB SSD, 14.5" OLED',      'Lenovo',    'https://www.lenovo.com/ca/en/p/laptops/yoga/yoga-slim-7/overview',                1399, 2024, '2024-06-01', 14.5, 1.28, 'student,home'),
(22, 'Lenovo', 'Legion 5i Gen 9',            'Intel i7-14650HX, 16GB RAM, 512GB SSD, 15.6" 165Hz',       'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/lenovo/legion',                                1599, 2024, '2024-01-01', 15.6, 2.40, 'gaming'),

-- Dell (7)
(23, 'Dell', 'XPS 13 9340',                  'Intel Ultra 5 125H, 16GB RAM, 512GB SSD, 13.4" FHD+',      'Dell',      'https://www.dell.com/en-ca/shop/laptops/xps-13-laptop',                           1799, 2024, '2024-01-01', 13.4, 1.17, 'student,business'),
(24, 'Dell', 'XPS 15 9530',                  'Intel i7-13700H, 16GB RAM, 512GB SSD, 15.6" OLED',         'Dell',      'https://www.dell.com/en-ca/shop/laptops/xps-15-laptop',                           2499, 2023, '2023-01-01', 15.6, 1.86, 'business,programming'),
(25, 'Dell', 'XPS 16 9640',                  'Intel Ultra 7 155H, 32GB RAM, 1TB SSD, 16.3" OLED',        'Dell',      'https://www.dell.com/en-ca/shop/laptops/xps-16-laptop',                           2999, 2024, '2024-01-01', 16.3, 1.87, 'business,programming'),
(26, 'Dell', 'Inspiron 15 3535',             'AMD Ryzen 5 7530U, 8GB RAM, 512GB SSD, 15.6" FHD',         'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/dell',                                         699,  2023, '2023-06-01', 15.6, 1.83, 'student,home'),
(27, 'Dell', 'Latitude 5550',                'Intel Ultra 5 125U, 16GB RAM, 512GB SSD, 15.6" FHD',       'Dell',      'https://www.dell.com/en-ca/work/shop/laptops/latitude-15-5550',                   1599, 2024, '2024-01-01', 15.6, 1.77, 'business'),
(28, 'Dell', 'Alienware m16 R2',             'Intel Ultra 9 185H, 32GB RAM, 1TB SSD, 16" QHD+ 165Hz',    'Dell',      'https://www.dell.com/en-ca/shop/gaming-laptops/alienware-m16',                    2999, 2024, '2024-01-01', 16.0, 3.07, 'gaming'),
(29, 'Dell', 'Inspiron 14 5440',             'Intel Ultra 5 125U, 16GB RAM, 512GB SSD, 14" FHD',         'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/dell',                                         899,  2024, '2024-01-01', 14.0, 1.58, 'student,home'),

-- HP (6)
(30, 'HP', 'Spectre x360 14',                'Intel Ultra 7 155U, 16GB RAM, 1TB SSD, 14" 2.8K OLED',     'HP',        'https://www.hp.com/ca-en/shop/pdp/hp-spectre-x360-14',                            1899, 2024, '2024-01-01', 14.0, 1.49, 'business,student'),
(31, 'HP', 'Envy x360 15',                   'AMD Ryzen 7 7730U, 16GB RAM, 512GB SSD, 15.6" FHD Touch',  'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/hp/envy',                                      1199, 2023, '2023-01-01', 15.6, 1.97, 'home,student'),
(32, 'HP', 'EliteBook 840 G11',              'Intel Ultra 5 125U, 16GB RAM, 512GB SSD, 14" WUXGA',        'HP',        'https://www.hp.com/ca-en/shop/pdp/hp-elitebook-840-g11',                          1699, 2024, '2024-01-01', 14.0, 1.35, 'business'),
(33, 'HP', 'Pavilion 15',                    'Intel i5-1335U, 8GB RAM, 256GB SSD, 15.6" FHD',            'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/hp/pavilion',                                   699,  2023, '2023-06-01', 15.6, 1.75, 'student,home'),
(34, 'HP', 'OMEN 16',                        'Intel i7-14700HX, 16GB RAM, 512GB SSD, 16.1" QHD 165Hz',   'HP',        'https://www.hp.com/ca-en/shop/pdp/omen-16',                                       1999, 2024, '2024-01-01', 16.1, 2.29, 'gaming'),
(35, 'HP', 'ProBook 450 G11',                'Intel Ultra 5 125U, 8GB RAM, 256GB SSD, 15.6" FHD',        'HP',        'https://www.hp.com/ca-en/shop/pdp/hp-probook-450-g11',                            1199, 2024, '2024-01-01', 15.6, 1.59, 'business,student'),

-- ASUS (6)
(36, 'ASUS', 'ZenBook 14 OLED',              'Intel Ultra 5 125H, 16GB RAM, 512GB SSD, 14" 3K OLED',     'ASUS',      'https://www.asus.com/ca-en/laptops/for-home/zenbook/',                             1299, 2024, '2024-01-01', 14.0, 1.20, 'student,programming'),
(37, 'ASUS', 'ROG Zephyrus G14',             'AMD Ryzen 9 8945HS, 16GB RAM, 1TB SSD, 14" 2.5K 165Hz',   'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/asus/rog',                                     1999, 2024, '2024-01-01', 14.0, 1.65, 'gaming'),
(38, 'ASUS', 'ROG Strix G16',                'Intel i9-14900HX, 16GB RAM, 512GB SSD, 16" QHD+ 240Hz',   'ASUS',      'https://www.asus.com/ca-en/laptops/for-gaming/rog-strix/',                         2299, 2024, '2024-01-01', 16.0, 2.50, 'gaming'),
(39, 'ASUS', 'Vivobook S 15 OLED',           'Intel Ultra 5 125H, 16GB RAM, 512GB SSD, 15.6" 3K OLED',  'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/asus/vivobook',                                 1199, 2024, '2024-01-01', 15.6, 1.65, 'student,home'),
(40, 'ASUS', 'ExpertBook B9 OLED',           'Intel Ultra 7 165U, 32GB RAM, 1TB SSD, 14" 3K OLED',      'ASUS',      'https://www.asus.com/ca-en/laptops/for-work/expertbook/',                          2199, 2024, '2024-01-01', 14.0, 0.99, 'business'),
(41, 'ASUS', 'Zenbook A14',                  'Snapdragon X Plus, 16GB RAM, 512GB SSD, 14" FHD',          'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/asus/zenbook',                                  1399, 2025, '2025-01-01', 14.0, 0.96, 'student,home'),

-- Acer (5)
(42, 'Acer', 'Swift Go 14',                  'Intel Ultra 5 125U, 16GB RAM, 512GB SSD, 14" 2.8K OLED',  'Acer',      'https://www.acer.com/ca-en/laptops/swift/swift-go-sfg14/',                         1099, 2024, '2024-01-01', 14.0, 1.35, 'student,home'),
(43, 'Acer', 'Aspire 5',                     'AMD Ryzen 5 7530U, 8GB RAM, 256GB SSD, 15.6" FHD',        'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/acer/aspire',                                   599,  2023, '2023-01-01', 15.6, 1.85, 'student,home'),
(44, 'Acer', 'Predator Helios 16',           'Intel i9-14900HX, 32GB RAM, 1TB SSD, 16" QHD 250Hz',     'Acer',      'https://www.acer.com/ca-en/laptops/predator/predator-helios-16/',                  2499, 2024, '2024-01-01', 16.0, 2.70, 'gaming'),
(45, 'Acer', 'Chromebook Spin 714',          'Intel i5-1235U, 8GB RAM, 256GB SSD, 14" 2K Touch',        'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/acer/chromebook',                               799,  2023, '2023-01-01', 14.0, 1.44, 'student,home'),
(46, 'Acer', 'Swift Edge 16',                'AMD Ryzen 7 7735U, 32GB RAM, 1TB SSD, 16" 4K OLED',       'Acer',      'https://www.acer.com/ca-en/laptops/swift/swift-edge/',                             1299, 2023, '2023-01-01', 16.0, 1.17, 'business,home'),

-- Microsoft (5)
(47, 'Microsoft', 'Surface Laptop 5',        'Intel i5-1245U, 8GB RAM, 256GB SSD, 13.5" PixelSense',    'Microsoft', 'https://www.microsoft.com/en-ca/p/surface-laptop-5',                               1299, 2022, '2022-10-01', 13.5, 1.27, 'student,home'),
(48, 'Microsoft', 'Surface Laptop 6',        'Intel Ultra 5 135H, 16GB RAM, 256GB SSD, 13.8" OLED',     'Microsoft', 'https://www.microsoft.com/en-ca/d/surface-laptop-6',                               1699, 2024, '2024-05-01', 13.8, 1.34, 'business,student'),
(49, 'Microsoft', 'Surface Pro 10',          'Intel Ultra 5 135U, 16GB RAM, 256GB SSD, 13" 2K Touch',   'Microsoft', 'https://www.microsoft.com/en-ca/d/surface-pro-10',                                 1599, 2024, '2024-05-01', 13.0, 0.90, 'business'),
(50, 'Microsoft', 'Surface Laptop Studio 2', 'Intel i7-13700H, 32GB RAM, 512GB SSD, 14.4" 120Hz Touch', 'Microsoft', 'https://www.microsoft.com/en-ca/d/surface-laptop-studio-2',                        2799, 2023, '2023-10-01', 14.4, 1.89, 'business,programming'),

-- Samsung (4)
(51, 'Samsung', 'Galaxy Book4 Pro 360',      'Intel Ultra 7 155H, 16GB RAM, 512GB SSD, 16" AMOLED',     'Samsung',   'https://www.samsung.com/ca/computers/galaxy-book/galaxy-book4-pro/',               2299, 2024, '2024-01-01', 16.0, 1.66, 'business,home'),
(52, 'Samsung', 'Galaxy Book4 Pro',          'Intel Ultra 5 125H, 16GB RAM, 512GB SSD, 14" AMOLED',     'Samsung',   'https://www.samsung.com/ca/computers/galaxy-book/galaxy-book4-pro/',               1799, 2024, '2024-01-01', 14.0, 1.23, 'business,student'),
(53, 'Samsung', 'Galaxy Book4 Edge',         'Snapdragon X Elite, 16GB RAM, 512GB SSD, 14" AMOLED',     'Best Buy',  'https://www.bestbuy.ca/en-ca/brand/samsung/galaxy-book',                           1699, 2024, '2024-06-01', 14.0, 1.17, 'student,home'),
(54, 'Samsung', 'Galaxy Book3 360',          'Intel i5-1340P, 8GB RAM, 256GB SSD, 13.3" AMOLED Touch',  'Samsung',   'https://www.samsung.com/ca/computers/galaxy-book/galaxy-book3/',                   1199, 2023, '2023-01-01', 13.3, 1.04, 'student,home')

on conflict (id) do nothing;

-- Adjust sequence so new inserts don't conflict with seed IDs
select setval('public.laptops_id_seq', (select max(id) from public.laptops) + 1);

-- ── Seed Price History ────────────────────────────────────────
insert into public.price_history (laptop_id, price, recorded_at) values
-- Apple
(1,  999,  '2020-11-01'), (1,  949,  '2021-06-01'), (1,  929,  '2022-01-01'), (1,  899,  '2023-01-01'),
(2,  1299, '2022-06-01'), (2,  1249, '2023-01-01'), (2,  1199, '2024-01-01'),
(3,  1499, '2024-03-01'), (3,  1449, '2025-01-01'),
(4,  1499, '2024-03-01'),
(5,  1999, '2023-11-01'), (5,  1849, '2024-06-01'),
(6,  2399, '2023-11-01'), (6,  2299, '2024-06-01'),
(7,  2899, '2023-11-01'), (7,  2799, '2024-06-01'),
(8,  4299, '2023-11-01'),
(9,  2199, '2024-11-01'),
(10, 3199, '2024-11-01'),
-- Lenovo
(11, 1699, '2022-01-01'), (11, 1499, '2023-01-01'),
(12, 1799, '2023-01-01'), (12, 1649, '2024-01-01'),
(13, 1699, '2024-01-01'), (13, 1599, '2025-01-01'),
(14, 1799, '2025-01-01'),
(15, 1499, '2024-01-01'),
(16, 799,  '2024-06-01'), (16, 749,  '2025-01-01'),
(17, 899,  '2023-06-01'), (17, 849,  '2024-01-01'),
(18, 1799, '2024-01-01'),
(19, 1599, '2025-01-01'),
(20, 2499, '2023-01-01'), (20, 2299, '2024-01-01'),
(21, 1399, '2024-06-01'),
(22, 1599, '2024-01-01'),
-- Dell
(23, 1799, '2024-01-01'), (23, 1699, '2025-01-01'),
(24, 2499, '2023-01-01'), (24, 2299, '2024-01-01'),
(25, 2999, '2024-01-01'),
(26, 699,  '2023-06-01'), (26, 649,  '2024-01-01'),
(27, 1599, '2024-01-01'),
(28, 2999, '2024-01-01'),
(29, 899,  '2024-01-01'),
-- HP
(30, 1899, '2024-01-01'), (30, 1799, '2025-01-01'),
(31, 1199, '2023-01-01'), (31, 1099, '2024-01-01'),
(32, 1699, '2024-01-01'),
(33, 699,  '2023-06-01'), (33, 649,  '2024-01-01'),
(34, 1999, '2024-01-01'),
(35, 1199, '2024-01-01'),
-- ASUS
(36, 1299, '2024-01-01'),
(37, 1999, '2024-01-01'), (37, 1849, '2025-01-01'),
(38, 2299, '2024-01-01'),
(39, 1199, '2024-01-01'),
(40, 2199, '2024-01-01'),
(41, 1399, '2025-01-01'),
-- Acer
(42, 1099, '2024-01-01'),
(43, 599,  '2023-01-01'), (43, 549,  '2024-01-01'),
(44, 2499, '2024-01-01'),
(45, 799,  '2023-01-01'),
(46, 1299, '2023-01-01'), (46, 1199, '2024-01-01'),
-- Microsoft
(47, 1299, '2022-10-01'), (47, 1199, '2023-06-01'),
(48, 1699, '2024-05-01'),
(49, 1599, '2024-05-01'),
(50, 2799, '2023-10-01'), (50, 2599, '2024-06-01'),
-- Samsung
(51, 2299, '2024-01-01'),
(52, 1799, '2024-01-01'), (52, 1699, '2025-01-01'),
(53, 1699, '2024-06-01'),
(54, 1199, '2023-01-01'), (54, 1099, '2024-01-01')
on conflict do nothing;

-- ── Default Recommendations ───────────────────────────────────
insert into public.recommendations (category, laptop_ids) values
('student',  array[1, 2, 16, 42, 43, 33]),
('home',     array[2, 31, 36, 39, 54, 47]),
('business', array[13, 14, 23, 32, 48, 5])
on conflict (category) do update set laptop_ids = excluded.laptop_ids;
