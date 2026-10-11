-- Ejecutar una sola vez en Supabase > SQL Editor > New query
create table if not exists public.registros (
  coleccion      text        not null,
  id             text        not null,
  data           jsonb       not null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (coleccion, id)
);

create index if not exists registros_coleccion_idx on public.registros (coleccion);

alter table public.registros enable row level security;

-- ADVERTENCIA: acceso abierto al rol anon (cualquiera con la clave puede
-- leer/escribir/borrar). Para producción, agregue Supabase Auth y cambie
-- "anon" por "authenticated".
create policy "registros_select" on public.registros for select to anon using (true);
create policy "registros_insert" on public.registros for insert to anon with check (true);
create policy "registros_update" on public.registros for update to anon using (true) with check (true);
create policy "registros_delete" on public.registros for delete to anon using (true);
