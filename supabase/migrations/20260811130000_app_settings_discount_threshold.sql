-- app_settings: key/value store for application configuration

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings
  for select
  to authenticated
  using (true);

drop policy if exists "app_settings_insert_super_admin" on public.app_settings;
create policy "app_settings_insert_super_admin"
  on public.app_settings
  for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists "app_settings_update_super_admin" on public.app_settings;
create policy "app_settings_update_super_admin"
  on public.app_settings
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select, insert, update on public.app_settings to authenticated;

insert into public.app_settings (key, value)
values ('high_discount_no_promo_threshold_pct', '20'::jsonb)
on conflict (key) do nothing;
