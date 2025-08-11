import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ContratoPage({ params }: { params: Promise<{ contratoId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { contratoId } = await params;

  const [{ data: contrato }, { data: cuotas }] = await Promise.all([
    supabase
      .from("contratos")
      .select("id, precio_total, anticipo, monto_financiado, cuotas_total, frecuencia, primera_cuota_fecha, tasa_interes, estado, lote_id, cliente_id")
      .eq("id", contratoId)
      .single(),
    supabase
      .from("contratos_cuotas")
      .select("id, numero, vencimiento, monto, pagado, pagado_en")
      .eq("contrato_id", contratoId)
      .order("numero", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Contrato</h1>
      {contrato ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-base text-zinc-300">Precio total: ${Number(contrato.precio_total).toLocaleString()}</p>
          <p className="text-base text-zinc-300">Anticipo: ${Number(contrato.anticipo).toLocaleString()}</p>
          <p className="text-base text-zinc-300">Financiado: ${Number(contrato.monto_financiado).toLocaleString()}</p>
          <p className="text-base text-zinc-300">Cuotas: {contrato.cuotas_total} ({contrato.frecuencia})</p>
          <p className="text-base text-zinc-300">Primera cuota: {new Date(contrato.primera_cuota_fecha as unknown as string).toLocaleDateString()}</p>
          <p className="text-base text-zinc-300">Tasa: {Number(contrato.tasa_interes)}%</p>
          <p className="text-base text-zinc-300">Estado: {contrato.estado}</p>
        </div>
      ) : null}

      <h2 className="text-lg font-semibold mt-6 mb-2">Cuotas</h2>
      <ul className="space-y-2">
        {(cuotas as { id: string; numero: number; vencimiento: string; monto: number; pagado: boolean }[] | null)?.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div>
              <p className="text-zinc-200">#{q.numero} - vence {new Date(q.vencimiento).toLocaleDateString()}</p>
              <p className="text-zinc-400">Monto: ${Number(q.monto).toLocaleString()}</p>
            </div>
            <span className={`text-sm ${q.pagado ? "text-emerald-400" : "text-zinc-400"}`}>{q.pagado ? "Pagado" : "Pendiente"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


