Aplicación de gestión inmobiliaria (Next.js 15 + Supabase).

## Getting Started

Configura variables de entorno creando un archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL="tu_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_key"
```

SQL para crear la tabla `clientes` en Supabase:

```
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  telefono text not null,
  creado_en timestamp with time zone default now()
);
```

Tablas para `loteos` y `lotes`:

```
create table if not exists public.loteos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamp with time zone default now()
);

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  loteo_id uuid not null references public.loteos(id) on delete cascade,
  numero integer not null,
  superficie_m2 numeric(12,2) not null,
  creado_en timestamp with time zone default now(),
  unique(loteo_id, numero)
);

-- Compra de lotes: relación directa al cliente comprador
alter table public.lotes
  add column if not exists comprado_por_cliente_id uuid references public.clientes(id),
  add column if not exists fecha_compra timestamptz;
```

Contratos y plan de pago:

```
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  precio_total numeric(12,2) not null,
  anticipo numeric(12,2) not null default 0,
  monto_financiado numeric(12,2) not null,
  cuotas_total integer not null,
  frecuencia text not null default 'mensual',
  primera_cuota_fecha date not null,
  tasa_interes numeric(5,2) not null default 0,
  estado text not null default 'activo',
  creado_en timestamptz default now(),
  unique(lote_id)
);

create table if not exists public.contratos_cuotas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  numero integer not null,
  vencimiento date not null,
  monto numeric(12,2) not null,
  pagado boolean not null default false,
  pagado_en timestamptz,
  creado_en timestamptz default now(),
  unique(contrato_id, numero)
);

create index if not exists contratos_lote_idx on public.contratos(lote_id);
create index if not exists contratos_cliente_idx on public.contratos(cliente_id);
create index if not exists cuotas_contrato_idx on public.contratos_cuotas(contrato_id);

alter table public.contratos enable row level security;
alter table public.contratos_cuotas enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contratos') then
    create policy contratos_select on public.contratos for select using (true);
    create policy contratos_insert on public.contratos for insert with check (true);
    create policy contratos_update on public.contratos for update using (true) with check (true);
    create policy contratos_delete on public.contratos for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contratos_cuotas') then
    create policy cuotas_select on public.contratos_cuotas for select using (true);
    create policy cuotas_insert on public.contratos_cuotas for insert with check (true);
    create policy cuotas_update on public.contratos_cuotas for update using (true) with check (true);
    create policy cuotas_delete on public.contratos_cuotas for delete using (true);
  end if;
end$$;

grant select, insert, update, delete on public.contratos to anon, authenticated;
grant select, insert, update, delete on public.contratos_cuotas to anon, authenticated;
```

Recibos numerados y logo en comprobante:

```
create table if not exists public.recibos (
  id bigserial primary key,
  cuota_id uuid not null references public.contratos_cuotas(id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique(cuota_id)
);

alter table public.recibos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='recibos') then
    create policy recibos_select on public.recibos for select using (true);
    create policy recibos_insert on public.recibos for insert with check (true);
    create policy recibos_update on public.recibos for update using (true) with check (true);
    create policy recibos_delete on public.recibos for delete using (true);
  end if;
end$$;

grant select, insert, update, delete on public.recibos to anon, authenticated;
```

Propiedades, contratos de alquiler y pagos:

```
create table if not exists public.propiedades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text not null,
  descripcion text,
  creado_en timestamptz not null default now(),
  alquilada_por_cliente_id uuid references public.clientes(id),
  alquiler_activo boolean not null default false
);

create table if not exists public.contratos_alquiler (
  id uuid primary key default gen_random_uuid(),
  propiedad_id uuid not null references public.propiedades(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  precio_mensual numeric(12,2) not null,
  deposito numeric(12,2) not null default 0,
  fecha_inicio date not null,
  fecha_fin date,
  estado text not null default 'activo',
  creado_en timestamptz not null default now()
);

create table if not exists public.contratos_alquiler_pagos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_alquiler(id) on delete cascade,
  periodo date not null,
  monto numeric(12,2) not null,
  pagado boolean not null default false,
  pagado_en timestamptz,
  unique(contrato_id, periodo)
);

create index if not exists propiedades_cliente_idx on public.propiedades(alquilada_por_cliente_id);
create index if not exists ca_cliente_idx on public.contratos_alquiler(cliente_id);
create index if not exists cap_contrato_idx on public.contratos_alquiler_pagos(contrato_id);

alter table public.propiedades enable row level security;
alter table public.contratos_alquiler enable row level security;
alter table public.contratos_alquiler_pagos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='propiedades') then
    create policy propiedades_select on public.propiedades for select using (true);
    create policy propiedades_insert on public.propiedades for insert with check (true);
    create policy propiedades_update on public.propiedades for update using (true) with check (true);
    create policy propiedades_delete on public.propiedades for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contratos_alquiler') then
    create policy ca_select on public.contratos_alquiler for select using (true);
    create policy ca_insert on public.contratos_alquiler for insert with check (true);
    create policy ca_update on public.contratos_alquiler for update using (true) with check (true);
    create policy ca_delete on public.contratos_alquiler for delete using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contratos_alquiler_pagos') then
    create policy cap_select on public.contratos_alquiler_pagos for select using (true);
    create policy cap_insert on public.contratos_alquiler_pagos for insert with check (true);
    create policy cap_update on public.contratos_alquiler_pagos for update using (true) with check (true);
    create policy cap_delete on public.contratos_alquiler_pagos for delete using (true);
  end if;
end$$;

grant select, insert, update, delete on public.propiedades to anon, authenticated;
grant select, insert, update, delete on public.contratos_alquiler to anon, authenticated;
grant select, insert, update, delete on public.contratos_alquiler_pagos to anon, authenticated;
```

Luego, inicia el servidor de desarrollo:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
