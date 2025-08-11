"use client";

import { useEffect, useState } from "react";
import NuevoClienteModal from "./NuevoClienteModal";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Cliente = { id: string; nombre_completo: string; telefono?: string };

type Props = {
  clientes: Cliente[];
  onSubmit: (formData: FormData) => Promise<void>;
  triggerLabel?: string;
};

export default function VentaModal({ clientes: _clientes, onSubmit, triggerLabel = "Vender" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const buscar = async () => {
      const q = busqueda.trim();
      if (q.length < 2) {
        setResultados([]);
        return;
      }
      setCargandoBusqueda(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nombre_completo, telefono")
          .or(`nombre_completo.ilike.%${q}%,telefono.ilike.%${q}%`)
          .order("nombre_completo")
          .limit(10);
        if (!cancelado) {
          if (error) {
            setResultados([]);
          } else {
            setResultados((data as Cliente[]) || []);
          }
        }
      } finally {
        if (!cancelado) setCargandoBusqueda(false);
      }
    };
    const t = setTimeout(buscar, 300);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda]);

  return (
    <>
      <button
        type="button"
        className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1"
        onClick={() => setAbierto(true)}
      >
        {triggerLabel}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-3xl rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Registrar venta</h3>
              <button type="button" className="text-zinc-400 hover:text-white" onClick={() => setAbierto(false)}>✕</button>
            </div>

            <form action={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3 flex items-center gap-2 relative">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="flex-1 rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800"
                />
                <NuevoClienteModal
                  triggerLabel="Nuevo cliente"
                  onCreated={(c) => {
                    setSeleccionado(c);
                    setBusqueda("");
                    setResultados([]);
                  }}
                />

                {busqueda && resultados.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 shadow-lg z-10">
                    {resultados.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800"
                          onClick={() => {
                            setSeleccionado(c);
                            setBusqueda(c.nombre_completo);
                            setResultados([]);
                          }}
                        >
                          <span className="block text-zinc-100">{c.nombre_completo}</span>
                          <span className="block text-zinc-400 text-sm">{c.telefono}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Datos del cliente (solo lectura cuando hay seleccionado) */}
              <input readOnly value={seleccionado?.nombre_completo || ""} placeholder="Nombre y Apellido" className="rounded-md bg-zinc-900 text-zinc-400 px-3 py-2 ring-1 ring-zinc-800" />
              <input readOnly value={seleccionado?.telefono || ""} placeholder="Teléfono" className="rounded-md bg-zinc-900 text-zinc-400 px-3 py-2 ring-1 ring-zinc-800" />
              <input type="hidden" name="cliente_existente_id" value={seleccionado?.id || ""} />
              <input name="precio_total" placeholder="Precio total" type="number" step="0.01" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" required />
              <input name="anticipo" placeholder="Anticipo" type="number" step="0.01" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" />
              <input name="cuotas_total" placeholder="Cuotas" type="number" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" required />
              <input name="primera_cuota_fecha" placeholder="Primera cuota" type="date" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" required />
              <input name="tasa_interes" placeholder="Tasa % anual" type="number" step="0.01" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" />

              <div className="sm:col-span-3 mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 px-4 py-2">Cancelar</button>
                <button disabled={!seleccionado} type="submit" className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 font-medium">Confirmar venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


