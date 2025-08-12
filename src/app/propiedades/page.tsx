import { createSupabaseServerClient } from "@/lib/supabase-server";
import { crearPropiedad, eliminarPropiedad } from "./actions";

type Propiedad = {
  id: string;
  nombre: string;
  direccion: string;
  descripcion: string | null;
  alquiler_activo: boolean;
  alquilada_por_cliente_id: string | null;
};

export default async function PropiedadesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: propiedades } = await supabase
    .from("propiedades")
    .select("id, nombre, direccion, descripcion, alquiler_activo, alquilada_por_cliente_id")
    .order("creado_en", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Propiedades</h1>

      <form action={crearPropiedad} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="nombre" placeholder="Nombre" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" required />
        <input name="direccion" placeholder="Dirección" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" required />
        <button type="submit" className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-medium">Agregar</button>
      </form>

      <ul className="space-y-2">
        {(propiedades as Propiedad[] | null)?.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div>
              <a href={`/propiedades/${p.id}`} className="text-lg font-medium text-zinc-100 hover:underline underline-offset-2">{p.nombre}</a>
              <p className="text-base text-zinc-400">{p.direccion}</p>
              <p className={`text-sm ${p.alquiler_activo ? 'text-emerald-400' : 'text-zinc-400'}`}>{p.alquiler_activo ? 'Alquilada' : 'Disponible'}</p>
            </div>
            <form action={async () => { "use server"; await eliminarPropiedad(p.id); }}>
              <button type="submit" className="rounded-md border border-red-800 text-red-300 hover:bg-red-900/40 px-3 py-1">Eliminar</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}


