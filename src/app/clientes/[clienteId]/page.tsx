import { createSupabaseServerClient } from "@/lib/supabase-server";

type Contrato = {
  id: string;
  lote_id: string;
  precio_total: number;
  monto_financiado: number;
  cuotas_total: number;
  estado: string;
};

type CuotaResumen = {
  contrato_id: string;
  numero: number;
  monto: number;
  pagado: boolean;
  vencimiento: string;
};

export default async function ClienteDetallePage({ params }: { params: Promise<{ clienteId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { clienteId } = await params;

  const [{ data: cliente }, { data: contratos }] = await Promise.all([
    supabase.from("clientes").select("id, nombre_completo, telefono").eq("id", clienteId).single(),
    supabase
      .from("contratos")
      .select("id, lote_id, precio_total, monto_financiado, cuotas_total, estado")
      .eq("cliente_id", clienteId)
      .eq("estado", "activo")
  ]);

  const contratosList: Contrato[] = (contratos as Contrato[] | null) ?? [];
  const contratosIds = contratosList.map((c) => c.id);

  let cuotasList: CuotaResumen[] = [];
  if (contratosIds.length > 0) {
    const { data: cuotasData } = await supabase
      .from("contratos_cuotas")
      .select("contrato_id, numero, monto, pagado, vencimiento")
      .in("contrato_id", contratosIds)
      .order("numero", { ascending: true });
    cuotasList = (cuotasData as CuotaResumen[] | null) ?? [];
  }

  const contratoIdToCuotas = new Map<string, CuotaResumen[]>();
  cuotasList.forEach((q) => {
    const arr = contratoIdToCuotas.get(q.contrato_id) ?? [];
    arr.push(q);
    contratoIdToCuotas.set(q.contrato_id, arr);
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-2">{cliente?.nombre_completo}</h1>
      <p className="text-zinc-400 mb-6">Teléfono: {cliente?.telefono}</p>

      <h2 className="text-lg font-semibold mb-2">Contratos activos</h2>
      <ul className="space-y-2">
        {contratosList.map((ct) => {
          const qs = contratoIdToCuotas.get(ct.id) ?? [];
          const pendiente = qs.filter((x) => !x.pagado).reduce((acc, x) => acc + Number(x.monto || 0), 0);
          const enMora = qs.some((x) => !x.pagado && new Date(x.vencimiento) < new Date());
          return (
            <li key={ct.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-zinc-200">Contrato #{ct.id.slice(0, 8)}…</p>
              <p className="text-zinc-300">Cuotas: {ct.cuotas_total}</p>
              <p className="text-zinc-300">Financiado: ${Number(ct.monto_financiado).toLocaleString()}</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-md border ${enMora ? "border-yellow-800 text-yellow-300" : "border-emerald-800 text-emerald-300"}`}>
                  {enMora ? "En mora" : "Al día"}
                </span>
                <span className="text-zinc-400">Pendiente: ${pendiente.toLocaleString()}</span>
                <a href={`/contratos/${ct.id}`} className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800/60">Ver contrato</a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


