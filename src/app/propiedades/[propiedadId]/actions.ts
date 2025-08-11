"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function alquilarPropiedad(propiedadId: string, formData: FormData): Promise<void> {
  const clienteExistenteId = String(formData.get("cliente_existente_id") || "").trim();
  const nombreCompleto = String(formData.get("nuevo_nombre_completo") || "").trim();
  const telefono = String(formData.get("nuevo_telefono") || "").trim();
  const precioMensual = Number(formData.get("precio_mensual") || 0);
  const deposito = Number(formData.get("deposito") || 0);
  const fechaInicioStr = String(formData.get("fecha_inicio") || "");
  const fechaFinStr = String(formData.get("fecha_fin") || "");
  if (!propiedadId || !precioMensual || !fechaInicioStr) return;

  const supabase = await createSupabaseServerClient();
  let clienteId = clienteExistenteId || null;
  if (!clienteId) {
    if (!nombreCompleto || !telefono) return;
    const { data: nuevo } = await supabase
      .from("clientes")
      .insert({ nombre_completo: nombreCompleto, telefono })
      .select("id")
      .single();
    clienteId = nuevo?.id ?? null;
  }
  if (!clienteId) return;

  const { data: contrato } = await supabase
    .from("contratos_alquiler")
    .insert({
      propiedad_id: propiedadId,
      cliente_id: clienteId,
      precio_mensual: precioMensual,
      deposito,
      fecha_inicio: new Date(fechaInicioStr).toISOString().slice(0, 10),
      fecha_fin: fechaFinStr ? new Date(fechaFinStr).toISOString().slice(0, 10) : null,
      estado: "activo",
    })
    .select("id, fecha_inicio, fecha_fin, precio_mensual")
    .single();

  if (!contrato) return;

  // Generar pagos mensuales del periodo
  const pagos: { contrato_id: string; periodo: string; monto: number }[] = [];
  const start = new Date(contrato.fecha_inicio as unknown as string);
  const end = contrato.fecha_fin ? new Date(contrato.fecha_fin as unknown as string) : null;
  const maxMeses = 60; // límite de seguridad
  for (let i = 0; i < maxMeses; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    if (end && d > end) break;
    pagos.push({ contrato_id: contrato.id, periodo: d.toISOString().slice(0, 10), monto: Number(contrato.precio_mensual) });
    if (!end && i >= 11) break; // si no hay fin, generamos 12 meses
  }
  if (pagos.length > 0) {
    await supabase.from("contratos_alquiler_pagos").insert(pagos);
  }

  await supabase.from("propiedades").update({ alquiler_activo: true, alquilada_por_cliente_id: clienteId }).eq("id", propiedadId);
  revalidatePath(`/propiedades/${propiedadId}`);
}

export async function pagarPrimerPago(propiedadId: string, formData: FormData): Promise<void> {
  const pagoId = String(formData.get("pago_id") || "");
  const fechaPago = String(formData.get("fecha_pago") || "");
  const supabase = await createSupabaseServerClient();

  let id = pagoId;
  if (!id) {
    const { data: contrato } = await supabase
      .from("contratos_alquiler")
      .select("id")
      .eq("propiedad_id", propiedadId)
      .eq("estado", "activo")
      .single();
    if (!contrato) return;
    const { data: pago } = await supabase
      .from("contratos_alquiler_pagos")
      .select("id")
      .eq("contrato_id", contrato.id)
      .eq("pagado", false)
      .order("periodo", { ascending: true })
      .limit(1)
      .single();
    if (!pago) return;
    id = pago.id as string;
  }

  const pagoFecha = fechaPago ? new Date(fechaPago).toISOString() : new Date().toISOString();
  await supabase.from("contratos_alquiler_pagos").update({ pagado: true, pagado_en: pagoFecha }).eq("id", id);
  revalidatePath(`/propiedades/${propiedadId}`);
}


