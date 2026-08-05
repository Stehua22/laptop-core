-- Run this in Supabase SQL editor
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- 'ebay' | 'bestbuy' | 'facebook'
  external_id text not null,            -- listing id on that source
  title text not null,
  brand text,                           -- lenovo, dell, hp, etc (detected)
  price numeric not null,
  currency text default 'CAD',
  condition text,                       -- refurbished, used, open-box, etc
  url text not null,
  image_url text,
  location text,                        -- mainly for facebook
  deal_score numeric,                   -- 0-100, higher = better deal
  market_price numeric,                 -- estimated "normal" price for comparison
  seen_at timestamptz default now(),
  first_seen_at timestamptz default now(),
  is_active boolean default true,
  unique (source, external_id)
);

create index if not exists deals_source_idx on deals (source);
create index if not exists deals_score_idx on deals (deal_score desc);
create index if not exists deals_seen_idx on deals (seen_at desc);

-- keep first_seen_at fixed and just bump seen_at on rescan
create or replace function touch_deal()
returns trigger as $$
begin
  new.first_seen_at = old.first_seen_at;
  return new;
end;
$$ language plpgsql;

drop trigger if exists deals_touch on deals;
create trigger deals_touch
  before update on deals
  for each row execute function touch_deal();
