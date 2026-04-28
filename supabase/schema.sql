create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  balance numeric default 0,
  containers_12_on_loan integer default 0,
  containers_20_on_loan integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  size_liters integer,
  price numeric default 0,
  stock integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id),
  movement_type text not null,
  movement_date date not null,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  payment_method text,
  balance_after numeric default 0,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists public.movement_items (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid references public.movements(id) on delete cascade,
  product_id uuid references public.products(id),
  quantity integer not null,
  unit_price numeric default 0,
  line_total numeric default 0,
  container_type text,
  containers_delivered integer default 0,
  containers_returned integer default 0
);

alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;
alter table public.movement_items enable row level security;

drop policy if exists "authenticated clients access" on public.clients;
drop policy if exists "authenticated products access" on public.products;
drop policy if exists "authenticated movements access" on public.movements;
drop policy if exists "authenticated movement_items access" on public.movement_items;

create policy "authenticated clients access"
  on public.clients for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated products access"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated movements access"
  on public.movements for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated movement_items access"
  on public.movement_items for all
  to authenticated
  using (true)
  with check (true);
