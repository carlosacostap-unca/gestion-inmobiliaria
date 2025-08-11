"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Cliente = { id: string; nombre_completo: string; telefono: string };

type Props = {
  onCreated: (cliente: Cliente) => void;
  triggerLabel?: string;
};

export default function NuevoClienteModal({ onCreated, triggerLabel = "Nuevo cliente" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  async function handleCreateClick() {
    const nombre_completo = nombre.trim();
    const tel = telefono.trim();
    if (!nombre_completo || !tel) return;
    setCargando(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("clientes")
        .insert({ nombre_completo, telefono: tel })
        .select("id, nombre_completo, telefono")
        .single();
      if (error) throw error;
      if (data) {
        onCreated(data as Cliente);
        setAbierto(false);
        setNombre("");
        setTelefono("");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al crear cliente";
      setError(message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 px-3 py-1"
        onClick={() => setAbierto(true)}
      >
        {triggerLabel}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nuevo cliente</h3>
              <button type="button" className="text-zinc-400 hover:text-white" onClick={() => setAbierto(false)}>✕</button>
            </div>

            {error ? <p className="text-red-400 text-sm mb-2">{error}</p> : null}

            <div className="grid grid-cols-1 gap-3">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y Apellido" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" />
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 px-4 py-2">Cancelar</button>
                <button disabled={cargando} type="button" onClick={handleCreateClick} className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2 font-medium">Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


