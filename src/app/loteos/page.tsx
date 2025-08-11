import { createSupabaseServerClient } from "@/lib/supabase-server";
import { crearLoteo, eliminarLoteo } from "./actions";

type Loteo = {
  id: string;
  nombre: string;
  creado_en: string | null;
};

export default async function LoteosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: loteos } = await supabase
    .from("loteos")
    .select("id, nombre, creado_en")
    .order("creado_en", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Loteos</h1>

      <form action={crearLoteo} className="mb-8 flex gap-3">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre del loteo"
          className="rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600 flex-1"
          required
        />
        <button type="submit" className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-medium">
          Agregar
        </button>
      </form>

      <ul className="space-y-2">
        {(loteos as Loteo[] | null)?.map((l) => (
          <li key={l.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div>
              <p className="text-lg font-medium text-zinc-100">{l.nombre}</p>
            </div>
            <div className="flex gap-2">
              <a href={`/loteos/${l.id}`} className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 px-3 py-1">Ver lotes</a>
              <form action={async () => { "use server"; await eliminarLoteo(l.id); }}>
                <button type="submit" className="rounded-md border border-red-800 text-red-300 hover:bg-red-900/40 px-3 py-1">Eliminar</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


