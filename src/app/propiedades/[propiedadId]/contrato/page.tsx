import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function ContratoDePropiedadPage({ params }: { params: Promise<{ propiedadId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { propiedadId } = await params;

  const { data: contrato } = await supabase
    .from("contratos_alquiler")
    .select("id, precio_mensual, deposito, fecha_inicio, fecha_fin, estado, cliente_id, propiedad_id")
    .eq("propiedad_id", propiedadId)
    .eq("estado", "activo")
    .maybeSingle();

  type Pago = { id: string; periodo: string; monto: number; pagado: boolean; pagado_en: string | null };
  let pagos: Pago[] = [];
  if (contrato) {
    const resp = await supabase
      .from("contratos_alquiler_pagos")
      .select("id, periodo, monto, pagado, pagado_en")
      .eq("contrato_id", contrato.id)
      .order("periodo", { ascending: true });
    pagos = (resp.data as Pago[] | null) ?? [];
  }

  const indiceActualizacion = 1.0; // temporal, solo visual

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">Contrato de alquiler</h1>
      {contrato ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-zinc-300">Precio mensual: ${Number(contrato.precio_mensual).toLocaleString()}</p>
          <p className="text-zinc-300">Depósito: ${Number(contrato.deposito).toLocaleString()}</p>
          <p className="text-zinc-300">Inicio: {new Date(contrato.fecha_inicio as unknown as string).toLocaleDateString()}</p>
          {contrato.fecha_fin ? (
            <p className="text-zinc-300">Fin: {new Date(contrato.fecha_fin as unknown as string).toLocaleDateString()}</p>
          ) : null}
          <p className="text-zinc-300">Estado: {contrato.estado}</p>
          <p className="text-zinc-300">Índice de actualización: {indiceActualizacion.toFixed(2)}</p>
        </div>
      ) : (
        <p className="text-zinc-400">No hay contrato activo para esta propiedad.</p>
      )}

      <h2 className="text-lg font-semibold mt-6 mb-2">Cuotas</h2>
      <ul className="space-y-2">
        {pagos.map((pago) => (
          <li key={pago.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div>
              <p className="text-zinc-200">Periodo {new Date(pago.periodo).toLocaleDateString()}</p>
              <p className="text-zinc-400">Monto: ${Number(pago.monto).toLocaleString()}</p>
            </div>
            <span className={`text-sm ${pago.pagado ? "text-emerald-400" : "text-zinc-400"}`}>{pago.pagado ? "Pagado" : "Pendiente"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


