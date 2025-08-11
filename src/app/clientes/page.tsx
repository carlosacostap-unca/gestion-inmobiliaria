import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createCliente } from "./actions";
import Link from "next/link";

type Cliente = {
  id: string;
  nombre_completo: string;
  telefono: string;
  creado_en: string | null;
};

export default async function ClientesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, nombre_completo, telefono, creado_en")
    .order("creado_en", { ascending: false });

  type Contrato = { id: string; cliente_id: string; monto_financiado: number; estado: string };
  type Cuota = { contrato_id: string; monto: number; pagado: boolean; vencimiento: string };

  const clientesList = (clientes as Cliente[] | null) ?? [];
  const clienteIds = clientesList.map((c) => c.id);

  let contratos: Contrato[] = [];
  let cuotas: Cuota[] = [];
  if (clienteIds.length > 0) {
    const { data: contratosData } = await supabase
      .from("contratos")
      .select("id, cliente_id, monto_financiado, estado")
      .in("cliente_id", clienteIds)
      .eq("estado", "activo");
    contratos = (contratosData as Contrato[] | null) ?? [];
    const contratoIds = contratos.map((c) => c.id);
    if (contratoIds.length > 0) {
      const { data: cuotasData } = await supabase
        .from("contratos_cuotas")
        .select("contrato_id, monto, pagado, vencimiento")
        .in("contrato_id", contratoIds);
      cuotas = (cuotasData as Cuota[] | null) ?? [];
    }
  }

  const contratoIdToCuotas = new Map<string, Cuota[]>();
  for (const q of cuotas) {
    const arr = contratoIdToCuotas.get(q.contrato_id) ?? [];
    arr.push(q);
    contratoIdToCuotas.set(q.contrato_id, arr);
  }

  const clienteIdToResumen = new Map<string, { activos: number; estadoCuenta: "al_dia" | "en_mora"; pendienteTotal: number }>();
  for (const c of contratos) {
    const qs = contratoIdToCuotas.get(c.id) ?? [];
    const pendiente = qs.filter((x) => !x.pagado).reduce((acc, x) => acc + Number(x.monto || 0), 0);
    const hoy = new Date();
    const enMora = qs.some((x) => !x.pagado && new Date(x.vencimiento) < hoy);
    const anterior = clienteIdToResumen.get(c.cliente_id) ?? { activos: 0, estadoCuenta: "al_dia" as const, pendienteTotal: 0 };
    clienteIdToResumen.set(c.cliente_id, {
      activos: anterior.activos + 1,
      estadoCuenta: anterior.estadoCuenta === "en_mora" || enMora ? "en_mora" : "al_dia",
      pendienteTotal: anterior.pendienteTotal + pendiente,
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold mb-4">Clientes</h1>

      <form action={createCliente} className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="text"
          name="nombre_completo"
          placeholder="Nombre y Apellido"
          className="rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          required
        />
        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono"
          className="rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-500 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          required
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-medium"
        >
          Agregar
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-base mb-3">{error.message}</p>
      )}

      <ul className="space-y-2">
        {clientesList.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3"
          >
            <div>
              <Link href={`/clientes/${c.id}`} className="text-lg font-medium text-zinc-100 hover:underline underline-offset-2">
                {c.nombre_completo}
              </Link>
              <p className="text-base text-zinc-400">{c.telefono}</p>
              {(() => {
                const resumen = clienteIdToResumen.get(c.id);
                if (!resumen) return null;
                return (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-zinc-300">Contratos activos: {resumen.activos}</span>
                    <span className={`px-2 py-0.5 rounded-md border ${resumen.estadoCuenta === "al_dia" ? "border-emerald-800 text-emerald-300" : "border-yellow-800 text-yellow-300"}`}>
                      {resumen.estadoCuenta === "al_dia" ? "Al día" : "En mora"}
                    </span>
                    <span className="text-zinc-400">Pendiente: ${resumen.pendienteTotal.toLocaleString()}</span>
                  </div>
                );
              })()}
            </div>
            <div />
          </li>
        ))}
      </ul>
    </div>
  );
}


