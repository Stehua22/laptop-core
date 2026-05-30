-- ============================================================
-- Laptop Price Tracker - Supabase Schema
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard > SQL Editor > New Query
-- ============================================================

-- Laptops table
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
  created_at  timestamptz default now()
);

-- Price history table (one row per price check)
create table if not exists public.price_history (
  id         bigserial primary key,
  laptop_id  bigint references public.laptops(id) on delete cascade,
  price      numeric(10,2) not null,
  recorded_at date default current_date,
  created_at  timestamptz default now()
);

-- Index for fast lookups
create index if not exists price_history_laptop_id_idx on public.price_history(laptop_id);
create index if not exists price_history_recorded_at_idx on public.price_history(recorded_at);

-- ── Row Level Security ──────────────────────────────────────
-- Public read, public write (no auth required — single shared list)
alter table public.laptops enable row level security;
alter table public.price_history enable row level security;

create policy "Public read laptops"        on public.laptops        for select using (true);
create policy "Public insert laptops"      on public.laptops        for insert with check (true);
create policy "Public update laptops"      on public.laptops        for update using (true);
create policy "Public delete laptops"      on public.laptops        for delete using (true);

create policy "Public read price_history"  on public.price_history  for select using (true);
create policy "Public insert price_history" on public.price_history for insert with check (true);
create policy "Public delete price_history" on public.price_history for delete using (true);

-- ── Seed Data ───────────────────────────────────────────────
-- Insert sample laptops
insert into public.laptops (id, brand, model, specs, store, url, retail_price, release_year, date_added) values
(1,  'Dell',      'XPS 13 7390',             'Intel i7, 16GB RAM, 512GB SSD, 13.3" FHD',            'Dell',      'https://www.dell.com/en-us/shop/dell-laptops/xps-13-7390-laptop',              1199, 2019, '2019-01-01'),
(2,  'Apple',     'MacBook Pro 16"',          'Intel i9, 16GB RAM, 1TB SSD, 16" Retina',             'Apple',     'https://www.apple.com/shop/buy-mac/macbook-pro/16-inch',                        2399, 2019, '2019-01-01'),
(3,  'HP',        'Spectre x360 13',          'Intel i7, 16GB RAM, 512GB SSD, 13.3" 4K Touch',       'HP',        'https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-13',                          1249, 2019, '2019-01-01'),
(4,  'Lenovo',    'ThinkPad X1 Carbon Gen8',  'Intel i5, 16GB RAM, 512GB SSD, 14" FHD',              'Lenovo',    'https://www.bestbuy.ca/en-ca/product/refurbished-excellent-lenovo-thinkpad-x1-carbon-gen-8-14-laptop-intel-i5-10310u-16-gb-ram-512-gb-ssd-windows-1１-pro/１９６１２７２４', 389.96, 2020, '2020-0１-０１'),
(5,  'Apple',     'MacBook Air M１',           'Apple M１, 8GB RAM, 256GB SSD, １３.３" Retina',          'Apple',     'https://www.apple.com/macbook-air/',                                             ９９９, ２０２０, '２０２０-０１-０１'),
(6,  'ASUS',      'ROG Zephyrus G１４',         'AMD Ryzen ９, １６GB RAM, １TB SSD, １４" １２０Hz',           'ASUS',      'https://www.asus.com/Laptops/For-Gaming/ROG-Zephyrus/ROG-Zephyrus-G１４/',        １４４９, ２０２０, '２０２０-０１-０１'),
(7,  'Dell',      'XPS 15 9510',              'Intel i7, 16GB RAM, 512GB SSD, 15.6" OLED',           'Dell',      'https://www.dell.com/en-us/shop/dell-laptops/xps-15-9510-laptop',               1799, 2021, '2021-01-01'),
(8,  'Microsoft', 'Surface Laptop 4',         'Intel i7, 16GB RAM, 512GB SSD, 13.5" PixelSense',     'Microsoft', 'https://www.microsoft.com/en-us/p/surface-laptop-4/946627fb12t1',               1399, 2021, '2021-01-01'),
(9,  'HP',        'Spectre x360 14',          'Intel i7, 16GB RAM, 512GB SSD, 13.5" OLED Touch',     'HP',        'https://www.hp.com/us-en/shop/pdp/hp-spectre-x360-14',                          1499, 2021, '2021-01-01'),
(10, 'Lenovo',    'Yoga 9i Gen 6',            'Intel i7, 16GB RAM, 512GB SSD, 14" 2K Touch',         'Lenovo',    'https://www.lenovo.com/us/en/laptops/yoga/yoga-9-series/Yoga-9i-14-Gen-6/p/88YGC901504', 1599, 2021, '2021-01-01'),
(13, 'Apple',     'MacBook Air M2',           'Apple M2, 8GB RAM, 256GB SSD, 13.6" Retina',          'Apple',     'https://www.apple.com/macbook-air-m2/',                                         1199, 2022, '2022-01-01'),
(16, 'Apple',     'MacBook Pro 14" M3',       'Apple M3, 16GB RAM, 512GB SSD, 14.2" ProMotion',      'Apple',     'https://www.apple.com/macbook-pro-14-and-16/',                                  1999, 2023, '2023-01-01'),
(18, 'Lenovo',    'ThinkPad Z16',             'Intel i9, 32GB RAM, 1TB SSD, 16" 3K OLED',            'Lenovo',    'https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadz/thinkpad-z16-gen-1/overview', 2499, 2023, '2023-01-01'),
(20, 'Samsung',   'Galaxy Book3 Pro 360',     'Intel i7, 16GB RAM, 512GB SSD, 15.6" AMOLED',         'Samsung',   'https://www.samsung.com/us/computing/windows-laptops/galaxy-book3-pro-360/',   1399, 2024, '2024-01-01'),
(21, 'Lenovo',    'ThinkPad X1 Carbon Gen12', 'Intel Ultra 7 155U, 32GB RAM, 512GB SSD, 14" FHD',    'Lenovo',    'https://www.bestbuy.ca/en-ca/product//17955179', 1699, 2024, '2024-01-01'),
(25, 'Apple',     'MacBook Air M3',           'Apple M3, 16GB RAM, 512GB SSD, 13.6" Retina',         'Apple',     'https://www.apple.com/macbook-air/',                                            1299, 2025, '2025-01-01'),
(26, 'Lenovo',    'ThinkPad X1 Carbon Gen13', 'Intel i7, 16GB RAM, 512GB SSD, 14" FHD',              'Lenovo',    'https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-13/overview', 1799, 2025, '2025-01-01'),
(41, 'Lenovo',    'ThinkPad T14 Gen 5',       'Intel i7, 16GB RAM, 512GB SSD, 14" WUXGA',            'Lenovo',    'https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpad-t-series/thinkpad-t14-gen-5/overview', 1699, 2025, '2025-01-01'),
(42, 'Lenovo',    'Slim 7i Aura Edition',     'Intel Core Ultra 7 258V, 32GB RAM, 1TB SSD, 14" OLED','Lenovo',    'https://www.bestbuy.ca/en-ca/product/lenovo-slim-7i-14/19220077',               1599, 2025, '2025-01-01'),

on conflict (id) do nothing;

-- Adjust sequence so new inserts don't conflict with seed IDs
select setval('public.laptops_id_seq', (select max(id) from public.laptops) + 1);

-- Insert price history for laptops
insert into public.price_history (laptop_id, price, recorded_at) values
(1, 1199, '2019-01-01'), (1, 1099, '2020-06-01'), (1, 999, '2021-03-01'),
(2, 2399, '2019-01-01'), (2, 2299, '2020-06-01'), (2, 2199, '2023-01-01'),
(3, 1249, '2019-01-01'), (3, 1149, '2021-01-01'),
(4, 1599, '2020-01-01'), (4, 389,  '2021-06-01'),
(5, 999,  '2020-01-01'), (5, 949,  '2022-01-01'),
(6, 1449, '2020-01-01'), (6, 1399, '2022-01-01'),
(7, 1799, '2021-01-01'), (7, 1699, '2023-01-01'),
(8, 1399, '2021-01-01'),
(9, 1499, '2021-01-01'), (9, 1449, '2023-01-01'),
(10, 1599, '2021-01-01'),
(13, 1199, '2022-01-01'),
(16, 1999, '2023-01-01'),
(18, 2499, '2023-01-01'),
(20, 1399, '2024-01-01'), (20, 1299, '2025-01-01'),
(21, 1699, '2024-01-01'),
(25, 1299, '2025-01-01'),
(26, 1799, '2025-01-01'),
(41, 1699, '2025-01-01'),
(42, 1599, '2024-01-01'),
(49, 899,  '2023-01-01'),
(50, 1699, '2023-01-01');
