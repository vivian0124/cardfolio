-- CardFolio 初始 schema
-- 在 Supabase Dashboard → SQL Editor 貼上執行，或用 supabase CLI db push

-- ============ 卡牌目錄（爬蟲維護，所有人可讀） ============

create table games (
  id   text primary key,          -- 'ptcg' | 'opcg'
  name text not null
);

insert into games (id, name) values
  ('ptcg', 'Pokémon TCG'),
  ('opcg', 'One Piece Card Game');

create table card_sets (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null references games(id),
  code         text not null,                       -- 例：SV4a、OP-05
  name         text not null,
  language     text not null check (language in ('ja', 'en', 'zh-TW')),
  release_date date,
  total_cards  int,
  created_at   timestamptz not null default now(),
  unique (game_id, code, language)
);

create table cards (
  id         uuid primary key default gen_random_uuid(),
  set_id     uuid not null references card_sets(id) on delete cascade,
  card_no    text not null,                          -- 例：025/165
  name       text not null,
  rarity     text,
  image_url  text,
  created_at timestamptz not null default now(),
  unique (set_id, card_no)
);

create index cards_name_idx on cards (name);

-- ============ 使用者資料（RLS 隔離） ============

-- 持有項目：單卡關聯 cards；密封品（補充包/禮盒）用 custom_name
create table inventory_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_type   text not null check (item_type in ('card', 'sealed')),
  card_id     uuid references cards(id),
  custom_name text,
  condition   text,                                  -- 品相：全新/微瑕…
  grading     text,                                  -- 鑑定：PSA 10、BGS 9.5…
  status      text not null default 'holding' check (status in ('holding', 'sold')),
  note        text,
  created_at  timestamptz not null default now(),
  check (card_id is not null or custom_name is not null)
);

-- 買入批次（lot）：逐筆記錄，損益精確到單筆
create table purchase_lots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id       uuid not null references inventory_items(id) on delete cascade,
  quantity      int not null check (quantity > 0),
  price         numeric(12, 2) not null,             -- 原幣總價
  currency      text not null default 'TWD',
  exchange_rate numeric(12, 6) not null default 1,   -- 對主幣別匯率（買入當時）
  fees          numeric(12, 2) not null default 0,   -- 運費+手續費（原幣）
  channel       text,                                -- 通路：露天/蝦皮/日本代購/卡店…
  purchased_at  date not null,
  note          text,
  created_at    timestamptz not null default now()
);

create index purchase_lots_user_idx on purchase_lots (user_id, purchased_at);

-- 賣出：關聯 lot，支援部分賣出（quantity 可小於 lot 數量）
create table sales (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lot_id        uuid not null references purchase_lots(id) on delete cascade,
  quantity      int not null check (quantity > 0),
  price         numeric(12, 2) not null,             -- 原幣總價
  currency      text not null default 'TWD',
  exchange_rate numeric(12, 6) not null default 1,
  fees          numeric(12, 2) not null default 0,   -- 平台費/運費（原幣）
  buyer_note    text,                                -- 買家/訂單備註
  sold_at       date not null,
  created_at    timestamptz not null default now()
);

create index sales_user_idx on sales (user_id, sold_at);

-- 願望清單
create table wishlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id    uuid not null references cards(id) on delete cascade,
  priority   int not null default 0,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

-- ============ Row Level Security ============

-- 目錄表：所有登入者可讀，寫入僅限 service role（爬蟲用，繞過 RLS）
alter table games enable row level security;
alter table card_sets enable row level security;
alter table cards enable row level security;

create policy "catalog readable" on games for select to authenticated using (true);
create policy "catalog readable" on card_sets for select to authenticated using (true);
create policy "catalog readable" on cards for select to authenticated using (true);

-- 使用者表：只能操作自己的資料
alter table inventory_items enable row level security;
alter table purchase_lots enable row level security;
alter table sales enable row level security;
alter table wishlist enable row level security;

create policy "own rows" on inventory_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on purchase_lots for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on sales for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
