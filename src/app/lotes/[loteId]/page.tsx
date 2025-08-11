import { createSupabaseServerClient } from "@/lib/supabase-server";
import PagarCuotaModal from "./PagarCuotaModal";
import { pagarPrimeraCuota } from "./actions";

export default async function LoteDetallePage({ params }: { params: Promise<{ loteId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { loteId } = await params;

  const { data: lote } = await supabase
    .from("lotes")
    .select("id, numero, superficie_m2, creado_en, comprado_por_cliente_id, fecha_compra, loteo_id")
    .eq("id", loteId)
    .single();

  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, precio_total, anticipo, monto_financiado, cuotas_total, tasa_interes, primera_cuota_fecha, estado, cliente_id")
    .eq("lote_id", loteId)
    .single();

  let cliente: { id: string; nombre_completo: string; telefono: string } | null = null;
  if (contrato) {
    const resp = await supabase.from("clientes").select("id, nombre_completo, telefono").eq("id", contrato.cliente_id).single();
    cliente = resp.data as { id: string; nombre_completo: string; telefono: string } | null;
  }

  const cuotaResumen = contrato
    ? (
        await supabase
          .from("contratos_cuotas")
          .select("id, numero, monto, pagado, pagado_en, vencimiento")
          .eq("contrato_id", contrato.id)
          .order("numero", { ascending: true })
      ).data as { id: string; numero: number; monto: number; pagado: boolean; pagado_en: string | null; vencimiento: string }[] | null
    : [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Detalle del lote</h1>

      {lote ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 mb-6">
          <p className="text-zinc-200">Lote #{lote.numero} - {lote.superficie_m2} m²</p>
          <p className="text-zinc-400 text-sm">ID: {lote.id}</p>
          {lote.fecha_compra ? (
            <p className="text-emerald-400 text-sm mt-1">Vendido el {new Date(lote.fecha_compra).toLocaleDateString()}</p>
          ) : (
            <p className="text-zinc-400 text-sm mt-1">Disponible</p>
          )}
        </div>
      ) : null}

      {cliente && contrato ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Comprador</h2>
          <p className="text-zinc-200">{cliente.nombre_completo}</p>
          <p className="text-zinc-400 text-sm">Tel: {cliente.telefono}</p>
        </div>
      ) : null}

      {contrato ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-lg font-semibold mb-2">Contrato</h2>
          <p className="text-zinc-300">Precio: ${Number(contrato.precio_total).toLocaleString()}</p>
          <p className="text-zinc-300">Anticipo: ${Number(contrato.anticipo).toLocaleString()}</p>
          <p className="text-zinc-300">Financiado: ${Number(contrato.monto_financiado).toLocaleString()}</p>
          <p className="text-zinc-300">Cuotas: {contrato.cuotas_total}</p>
          <p className="text-zinc-300">Tasa anual: {Number(contrato.tasa_interes)}%</p>
          <p className="text-zinc-300">Primera cuota: {new Date(contrato.primera_cuota_fecha as unknown as string).toLocaleDateString()}</p>

          <a href={`/contratos/${contrato.id}`} className="inline-block mt-3 rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800/60">Ver contrato</a>

          {/* Botón/modal para pagar primera cuota pendiente */}
          {Array.isArray(cuotaResumen) ? (
            (() => {
              const primeraPendiente = (cuotaResumen as { id: string; numero: number; monto: number; pagado: boolean }[]).find((q) => !q.pagado);
              return primeraPendiente ? (
                <div className="mt-4">
                  <PagarCuotaModal
                    cuotaId={primeraPendiente.id}
                    numero={primeraPendiente.numero}
                    monto={Number(primeraPendiente.monto)}
                    onSubmit={async (fd) => { "use server"; await pagarPrimeraCuota(loteId, fd); }}
                  />
                </div>
              ) : (
                <p className="mt-3 text-emerald-400">Todas las cuotas están pagadas.</p>
              );
            })()
          ) : null}

          <h3 className="text-base font-semibold mt-6 mb-2">Historial de cuotas</h3>
          <ul className="divide-y divide-zinc-800">
            {(cuotaResumen as { id: string; numero: number; monto: number; pagado: boolean; vencimiento: string }[]).map((q) => (
              <li key={q.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-zinc-200">Cuota #{q.numero} - vence {new Date(q.vencimiento).toLocaleDateString()}</p>
                  <p className="text-zinc-400 text-sm">Monto: ${Number(q.monto).toLocaleString()}</p>
                </div>
                {q.pagado ? (
                  <a
                    href={`/api/comprobantes/${q.id}`}
                    target="_blank"
                    className="rounded-md border border-zinc-700 px-3 py-1 text-emerald-400 hover:bg-zinc-800/60"
                  >
                    Ver comprobante
                  </a>
                ) : (
                  <span className="text-zinc-400 text-sm">Pendiente</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-zinc-400">Este lote no tiene contrato asociado.</p>
      )}
    </div>
  );
}


