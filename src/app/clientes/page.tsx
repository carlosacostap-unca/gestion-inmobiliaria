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

  type Contrato = { id: string; cliente_id: string; monto_financiado: number; estado: string; lote_id: string };
  type Cuota = { contrato_id: string; monto: number; pagado: boolean; vencimiento: string };
  type Alquiler = { id: string; cliente_id: string; propiedad_id: string; precio_mensual: number; estado: string; fecha_inicio: string | null; fecha_fin: string | null };
  type PagoAlquiler = { contrato_id: string; monto: number; pagado: boolean; periodo: string };

  const clientesList = (clientes as Cliente[] | null) ?? [];
  const clienteIds = clientesList.map((c) => c.id);

  type DetallesContrato = { contratoId: string; etiqueta: string; pendiente: number; enMora: boolean };
  type DetallesCliente = { compras: DetallesContrato[]; alquileres: DetallesContrato[] };
  let detallesPorCliente = new Map<string, DetallesCliente>();

  let contratos: Contrato[] = [];
  let cuotas: Cuota[] = [];
  if (clienteIds.length > 0) {
    const { data: contratosData } = await supabase
      .from("contratos")
      .select("id, cliente_id, monto_financiado, estado, lote_id")
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

    // Alquileres activos por cliente
    const { data: alquileresData } = await supabase
      .from("contratos_alquiler")
      .select("id, cliente_id, propiedad_id, precio_mensual, estado, fecha_inicio, fecha_fin")
      .in("cliente_id", clienteIds)
      .eq("estado", "activo");
    const alquileres: Alquiler[] = (alquileresData as Alquiler[] | null) ?? [];

    // Pagos de alquiler asociados
    const alquilerIds = alquileres.map((a) => a.id);
    let pagosAlquiler: PagoAlquiler[] = [];
    if (alquilerIds.length > 0) {
      const { data: pagosData } = await supabase
        .from("contratos_alquiler_pagos")
        .select("contrato_id, monto, pagado, periodo")
        .in("contrato_id", alquilerIds);
      pagosAlquiler = (pagosData as PagoAlquiler[] | null) ?? [];
    }

    // Mapas de ayuda para mostrar detalles
    const contratoIdToPagos = new Map<string, PagoAlquiler[]>();
    for (const p of pagosAlquiler) {
      const arr = contratoIdToPagos.get(p.contrato_id) ?? [];
      arr.push(p);
      contratoIdToPagos.set(p.contrato_id, arr);
    }

    // Obtener nombres de propiedades y números de lote
    const propiedadIds = Array.from(new Set(alquileres.map((a) => a.propiedad_id)));
    const loteIds = Array.from(new Set(contratos.map((c) => c.lote_id)));
    const [propsResp, lotesResp] = await Promise.all([
      propiedadIds.length > 0
        ? supabase.from("propiedades").select("id, nombre").in("id", propiedadIds)
        : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
      loteIds.length > 0
        ? supabase.from("lotes").select("id, numero").in("id", loteIds)
        : Promise.resolve({ data: [] as { id: string; numero: number }[] }),
    ]);
    const propiedadIdToNombre = new Map<string, string>();
    ((propsResp.data as { id: string; nombre: string }[]) || []).forEach((p) => propiedadIdToNombre.set(p.id, p.nombre));
    const loteIdToNumero = new Map<string, number>();
    ((lotesResp.data as { id: string; numero: number }[]) || []).forEach((l) => loteIdToNumero.set(l.id, l.numero));

    // Construir detalles por cliente
    const clienteIdToDetalles = new Map<
      string,
      {
        compras: { contratoId: string; etiqueta: string; pendiente: number; enMora: boolean }[];
        alquileres: { contratoId: string; etiqueta: string; pendiente: number; enMora: boolean }[];
      }
    >();

    for (const cliId of clienteIds) {
      clienteIdToDetalles.set(cliId, { compras: [], alquileres: [] });
    }

    // Compras
    const cuotasPorContrato = new Map<string, Cuota[]>();
    for (const q of cuotas) {
      const arr = cuotasPorContrato.get(q.contrato_id) ?? [];
      arr.push(q);
      cuotasPorContrato.set(q.contrato_id, arr);
    }
    for (const c of contratos) {
      const qs = cuotasPorContrato.get(c.id) ?? [];
      const pendiente = qs.filter((x) => !x.pagado).reduce((acc, x) => acc + Number(x.monto || 0), 0);
      const enMora = qs.some((x) => !x.pagado && new Date(x.vencimiento) < new Date());
      const etiqueta = `Compra Lote ${loteIdToNumero.get(c.lote_id) ?? ''}`;
      const resumen = clienteIdToDetalles.get(c.cliente_id)!;
      resumen.compras.push({ contratoId: c.id, etiqueta, pendiente, enMora });
    }

    // Alquileres
    for (const a of alquileres) {
      const ps = contratoIdToPagos.get(a.id) ?? [];
      const pendiente = ps.filter((x) => !x.pagado).reduce((acc, x) => acc + Number(x.monto || 0), 0);
      const enMora = ps.some((x) => !x.pagado && new Date(x.periodo) < new Date());
      const etiqueta = `Alquiler ${propiedadIdToNombre.get(a.propiedad_id) ?? ''}`;
      const resumen = clienteIdToDetalles.get(a.cliente_id)!;
      resumen.alquileres.push({ contratoId: a.id, etiqueta, pendiente, enMora });
    }

    // Adjuntar a objeto para rendering
    detallesPorCliente = clienteIdToDetalles as Map<string, DetallesCliente>;
  }

  // Estructuras para resumen y detalle
  const clienteIdToResumen = new Map<string, { activos: number; estadoCuenta: "al_dia" | "en_mora"; pendienteTotal: number }>();
  for (const [clienteId, det] of detallesPorCliente.entries()) {
    const activos = det.compras.length + det.alquileres.length;
    const enMora = [...det.compras, ...det.alquileres].some((d) => d.enMora);
    const pendienteTotal = [...det.compras, ...det.alquileres].reduce((acc, d) => acc + d.pendiente, 0);
    clienteIdToResumen.set(clienteId, { activos, estadoCuenta: enMora ? "en_mora" : "al_dia", pendienteTotal });
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
                    <span className={`px-2 py-0.5 rounded-md border ${resumen.estadoCuenta === 'al_dia' ? 'border-emerald-800 text-emerald-300' : 'border-yellow-800 text-yellow-300'}`}>
                      {resumen.estadoCuenta === 'al_dia' ? 'Al día' : 'En mora'}
                    </span>
                    <span className="text-zinc-400">Pendiente: ${resumen.pendienteTotal.toLocaleString()}</span>
                  </div>
                );
              })()}

              {(() => {
                const det = detallesPorCliente.get(c.id);
                if (!det) return null;
                return (
                  <div className="mt-3 space-y-2">
                    {det.compras.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Compras de lotes</p>
                        <ul className="text-sm space-y-1">
                          {det.compras.map((d) => (
                            <li key={d.contratoId} className="flex items-center gap-2">
                              <span className="text-zinc-200">{d.etiqueta}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-xs ${d.enMora ? 'border-yellow-800 text-yellow-300' : 'border-emerald-800 text-emerald-300'}`}>{d.enMora ? 'En mora' : 'Al día'}</span>
                              <span className="text-zinc-400">Pend.: ${d.pendiente.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {det.alquileres.length > 0 && (
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">Alquileres</p>
                        <ul className="text-sm space-y-1">
                          {det.alquileres.map((d) => (
                            <li key={d.contratoId} className="flex items-center gap-2">
                              <span className="text-zinc-200">{d.etiqueta}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-xs ${d.enMora ? 'border-yellow-800 text-yellow-300' : 'border-emerald-800 text-emerald-300'}`}>{d.enMora ? 'En mora' : 'Al día'}</span>
                              <span className="text-zinc-400">Pend.: ${d.pendiente.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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


