"use client";

import { useState } from "react";

export default function CobrarRentaModal({ pagoId, periodo, monto, onSubmit }: { pagoId?: string; periodo?: string; monto?: number; onSubmit: (formData: FormData) => Promise<void>; }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1" onClick={() => setAbierto(true)}>
        Cobrar mes
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cobrar renta</h3>
              <button type="button" className="text-zinc-400 hover:text-white" onClick={() => setAbierto(false)}>✕</button>
            </div>
            <form action={onSubmit} onSubmit={() => setAbierto(false)} className="grid grid-cols-1 gap-3">
              <input type="hidden" name="pago_id" value={pagoId || ""} />
              <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-zinc-300">
                {periodo ? <p>Periodo: {new Date(periodo).toLocaleDateString()}</p> : <p>Primer periodo pendiente</p>}
                {typeof monto === 'number' ? <p>Monto: ${Number(monto).toLocaleString()}</p> : null}
              </div>
              <label className="text-sm text-zinc-400">Fecha de pago</label>
              <input type="date" name="fecha_pago" className="rounded-md bg-zinc-900 text-zinc-100 px-3 py-2 ring-1 ring-zinc-800" />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setAbierto(false)} className="rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 px-4 py-2">Cancelar</button>
                <button type="submit" className="rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 font-medium">Confirmar cobro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


