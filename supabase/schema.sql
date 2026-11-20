-- Gestor Integral · Sincronización en la nube (Supabase)
-- Pega este script completo en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Modelo: UNA fila por usuario con el JSON completo del gestor (snapshot).
-- El navegador sube/baja esa fila con la anon key + tu sesión; RLS garantiza
-- que cada usuario solo puede leer y escribir SU fila.

create table if not exists public.gestor_snapshots (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.gestor_snapshots enable row level security;

drop policy if exists "gestor_snapshots_select_own" on public.gestor_snapshots;
drop policy if exists "gestor_snapshots_insert_own" on public.gestor_snapshots;
drop policy if exists "gestor_snapshots_update_own" on public.gestor_snapshots;
drop policy if exists "gestor_snapshots_delete_own" on public.gestor_snapshots;

create policy "gestor_snapshots_select_own"
  on public.gestor_snapshots for select
  to authenticated
  using (auth.uid() = user_id);

create policy "gestor_snapshots_insert_own"
  on public.gestor_snapshots for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "gestor_snapshots_update_own"
  on public.gestor_snapshots for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "gestor_snapshots_delete_own"
  on public.gestor_snapshots for delete
  to authenticated
  using (auth.uid() = user_id);

-- updated_at siempre fresco al hacer upsert
create or replace function public.gestor_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists gestor_snapshots_touch on public.gestor_snapshots;
create trigger gestor_snapshots_touch
  before update on public.gestor_snapshots
  for each row execute function public.gestor_touch_updated_at();
