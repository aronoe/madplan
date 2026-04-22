-- store_offers: global table of current supermarket offers, linked to ingredients
create table if not exists public.store_offers (
  id           uuid primary key default gen_random_uuid(),
  store        text,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  product_name text not null,
  normal_price numeric(10,2),
  offer_price  numeric(10,2) not null,
  valid_from   date not null,
  valid_to     date not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index for fast active-offer lookups (most common query)
create index if not exists store_offers_active_dates_idx
  on public.store_offers (is_active, valid_from, valid_to);

-- Index for ingredient matching
create index if not exists store_offers_ingredient_idx
  on public.store_offers (ingredient_id)
  where ingredient_id is not null;

-- RLS: any authenticated user can read offers; only service role can insert/update
alter table public.store_offers enable row level security;

create policy "Authenticated users can read offers"
  on public.store_offers for select
  to authenticated
  using (true);

-- ── Sample data ───────────────────────────────────────────────────────────────
-- Replace ingredient_id values with real UUIDs from your ingredients table.
-- Run: SELECT id, name FROM ingredients ORDER BY name;
-- Then replace the placeholder UUIDs below.

-- Example offers (adjust ingredient_ids to match your DB):
-- insert into public.store_offers
--   (store, ingredient_id, product_name, normal_price, offer_price, valid_from, valid_to)
-- values
--   ('Netto',    '<kylling-id>',   'Kyllingefilet 500g',    42.00, 29.95, current_date, current_date + 6),
--   ('Rema',     '<laks-id>',      'Laksesteg 400g',         55.00, 39.00, current_date, current_date + 6),
--   ('Fakta',    '<kartoffel-id>', 'Kartofler 2kg',           18.00, 12.00, current_date, current_date + 6),
--   ('Netto',    '<tomat-id>',     'Cherrytomater 500g',      22.00, 15.00, current_date, current_date + 6),
--   ('Lidl',     '<oksekød-id>',   'Hakkebøf 400g',          38.00, 25.00, current_date, current_date + 6);
