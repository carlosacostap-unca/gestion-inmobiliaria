import { createSupabaseServerClient } from "@/lib/supabase-server";
import { crearLote, eliminarLote, venderLote, anularVentaLote } from "./actions";
import VentaModal from "./VentaModal";

type Lote = {
  id: string;
  numero: number;
  superficie_m2: number;
  creado_en: string | null;
  comprado_por_cliente_id?: string | null;
  fecha_compra?: string | null;
};

export default async function LoteoDetallePage({ params }: { params: Promise<{ loteoId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { loteoId } = await params;

  const [{ data: loteo }, { data: lotes }, { data: clientes }] = await Promise.all([
    supabase.from("loteos").select("id, nombre").eq("id", loteoId).single(),
    supabase
      .from("lotes")
      .select("id, numero, superficie_m2, creado_en, comprado_por_cliente_id, fecha_compra")
      .eq("loteo_id", loteoId)
      .order("numero", { ascending: true }),
    supabase.from("clientes").select("id, nombre_completo")
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Loteos / {loteo?.nombre}</h1>

      <form
        action={async (formData) => {
          "use server";
          await crearLote(loteoId, formData);
        }}
        className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <input
          type="number"
          name="numero"
          placeholder="Número de lote"
          className="rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          required
        />
        <input
          type="number"
          name="superficie_m2"
          placeholder="Superficie (m²)"
          step="0.01"
          className="rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          required
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-medium"
        >
          Agregar lote
        </button>
      </form>

      <ul className="space-y-2">
        {(lotes as Lote[] | null)?.map((l) => (
          <li key={l.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-zinc-100">
                  {l.comprado_por_cliente_id ? (
                    <a href={`/lotes/${l.id}`} className="underline underline-offset-2 hover:text-emerald-400">Lote {l.numero}</a>
                  ) : (
                    <>Lote {l.numero}</>
                  )}
                </p>
                <p className="text-base text-zinc-400">{l.superficie_m2} m²</p>
                {l.comprado_por_cliente_id ? (
                  <p className="text-sm text-emerald-400 mt-1">Vendido</p>
                ) : (
                  <p className="text-sm text-zinc-400 mt-1">Disponible</p>
                )}
              </div>
              <form action={async () => { "use server"; await eliminarLote(loteoId, l.id); }}>
                <button type="submit" className="rounded-md border border-red-800 text-red-300 hover:bg-red-900/40 px-3 py-1">Eliminar</button>
              </form>
            </div>

            {!l.comprado_por_cliente_id ? (
              <div className="mt-3">
                <VentaModal onSubmit={async (formData) => { "use server"; await venderLote(loteoId, l.id, formData); }} />
              </div>
            ) : (
              <form action={async () => { "use server"; await anularVentaLote(loteoId, l.id); }} className="mt-3">
                <button type="submit" className="rounded-md border border-yellow-700 text-yellow-300 hover:bg-yellow-900/40 px-3 py-1">Anular venta</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}


