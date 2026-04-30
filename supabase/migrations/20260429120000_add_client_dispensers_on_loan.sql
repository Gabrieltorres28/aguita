alter table public.clients
  add column if not exists dispenser_cold_on_loan integer not null default 0,
  add column if not exists dispenser_hot_on_loan integer not null default 0;
