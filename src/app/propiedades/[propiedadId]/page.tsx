import { createSupabaseServerClient } from "@/lib/supabase-server";
import AlquilarModal from "./AlquilarModal";
import { alquilarPropiedad, pagarPrimerPago } from "./actions";
import CobrarRentaModal from "./CobrarRentaModal";

export default async function PropiedadDetallePage({ params }: { params: Promise<{ propiedadId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { propiedadId } = await params;

  const { data: propiedad } = await supabase
    .from("propiedades")
    .select("id, nombre, direccion, descripcion, alquiler_activo")
    .eq("id", propiedadId)
    .single();

  const { data: contrato } = await supabase
    .from("contratos_alquiler")
    .select("id, precio_mensual, deposito, fecha_inicio, fecha_fin, estado, cliente_id")
    .eq("propiedad_id", propiedadId)
    .eq("estado", "activo")
    .maybeSingle();

  const { data: cliente } = contrato
    ? await supabase.from("clientes").select("id, nombre_completo, telefono").eq("id", contrato.cliente_id).single()
    : { data: null } as any;

  const pagos = contrato
    ? (
        await supabase
          .from("contratos_alquiler_pagos")
          .select("id, periodo, monto, pagado, pagado_en")
          .eq("contrato_id", contrato.id)
          .order("periodo", { ascending: true })
      ).data
    : [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">{propiedad?.nombre}</h1>
      <p className="text-zinc-400">{propiedad?.direccion}</p>
      {propiedad?.descripcion ? <p className="text-zinc-400 mt-1">{propiedad.descripcion}</p> : null}

      {!contrato ? (
        <div className="mt-6">
          <AlquilarModal onSubmit={async (fd) => { "use server"; await alquilarPropiedad(propiedadId, fd); }} />
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-lg font-semibold mb-2">Alquiler activo</h2>
          <p className="text-zinc-300">Inquilino: {cliente?.nombre_completo} — Tel: {cliente?.telefono}</p>
          <p className="text-zinc-300">Precio mensual: ${Number(contrato.precio_mensual).toLocaleString()}</p>
          <p className="text-zinc-300">Inicio: {new Date(contrato.fecha_inicio as unknown as string).toLocaleDateString()}</p>
          {contrato.fecha_fin ? <p className="text-zinc-300">Fin: {new Date(contrato.fecha_fin as unknown as string).toLocaleDateString()}</p> : null}

          {Array.isArray(pagos) ? (
            (() => {
              const primeraPendiente = (pagos as any[]).find((p) => !p.pagado);
              return primeraPendiente ? (
                <div className="mt-3">
                  <CobrarRentaModal
                    pagoId={primeraPendiente.id}
                    periodo={primeraPendiente.periodo as string}
                    monto={Number(primeraPendiente.monto)}
                    onSubmit={async (fd) => { "use server"; await pagarPrimerPago(propiedadId, fd); }}
                  />
                </div>
              ) : (
                <p className="mt-3 text-emerald-400">Pagos al día</p>
              );
            })()
          ) : null}

          <h3 className="text-base font-semibold mt-6 mb-2">Historial de pagos</h3>
          <ul className="divide-y divide-zinc-800">
            {(pagos as any[]).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-zinc-200">Periodo {new Date(p.periodo).toLocaleDateString()}</p>
                  <p className="text-zinc-400 text-sm">Monto: ${Number(p.monto).toLocaleString()}</p>
                </div>
                <span className={`text-sm ${p.pagado ? 'text-emerald-400' : 'text-zinc-400'}`}>{p.pagado ? 'Pagado' : 'Pendiente'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


