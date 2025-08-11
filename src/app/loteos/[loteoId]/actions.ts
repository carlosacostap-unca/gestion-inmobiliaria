"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearLote(loteoId: string, formData: FormData): Promise<void> {
  const numero = Number(formData.get("numero"));
  const superficie_m2 = Number(formData.get("superficie_m2"));
  if (!loteoId || !numero || !superficie_m2) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("lotes").insert({ loteo_id: loteoId, numero, superficie_m2 });
  revalidatePath(`/loteos/${loteoId}`);
}

export async function eliminarLote(loteoId: string, id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("lotes").delete().eq("id", id);
  revalidatePath(`/loteos/${loteoId}`);
}

export async function venderLote(loteoId: string, loteId: string, formData: FormData): Promise<void> {
  const clienteExistenteId = String(formData.get("cliente_existente_id") || "").trim();
  const nombreCompleto = String(formData.get("nuevo_nombre_completo") || "").trim();
  const telefono = String(formData.get("nuevo_telefono") || "").trim();
  const precioTotal = Number(formData.get("precio_total") || 0);
  const anticipo = Number(formData.get("anticipo") || 0);
  const cuotasTotal = Number(formData.get("cuotas_total") || 0);
  const primeraCuotaFechaStr = String(formData.get("primera_cuota_fecha") || "");
  const tasaInteres = Number(formData.get("tasa_interes") || 0); // % anual (simple)
  const fechaCompra = new Date().toISOString();

  if (!precioTotal || cuotasTotal <= 0 || !primeraCuotaFechaStr) return;

  const supabase = await createSupabaseServerClient();

  // Obtener/crear comprador
  let compradorId = clienteExistenteId || null;
  if (!compradorId) {
    if (!nombreCompleto || !telefono) return;
    const { data: nuevoCliente, error } = await supabase
      .from("clientes")
      .insert({ nombre_completo: nombreCompleto, telefono })
      .select("id")
      .single();
    if (error) return;
    compradorId = nuevoCliente?.id ?? null;
  }
  if (!compradorId) return;

  const montoFinanciado = Math.max(precioTotal - anticipo, 0);
  const primeraCuotaFecha = new Date(primeraCuotaFechaStr);

  // Crear contrato
  const { data: contrato, error: contratoError } = await supabase
    .from("contratos")
    .insert({
      lote_id: loteId,
      cliente_id: compradorId,
      precio_total: precioTotal,
      anticipo,
      monto_financiado: montoFinanciado,
      cuotas_total: cuotasTotal,
      frecuencia: "mensual",
      primera_cuota_fecha: primeraCuotaFecha.toISOString().slice(0, 10),
      tasa_interes: tasaInteres,
      estado: "activo",
    })
    .select("id")
    .single();
  if (contratoError || !contrato) return;

  // Calcular monto de cuota simple (sin amortización compuesta para simplicidad)
  const interesMensual = tasaInteres > 0 ? (tasaInteres / 100) / 12 : 0;
  let montoCuota = 0;
  if (interesMensual > 0) {
    // Fórmula de amortización francesa
    const i = interesMensual;
    const n = cuotasTotal;
    montoCuota = n > 0 ? (montoFinanciado * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1) : montoFinanciado;
  } else {
    montoCuota = cuotasTotal > 0 ? montoFinanciado / cuotasTotal : 0;
  }

  // Generar cuotas
  const cuotasAInsertar = Array.from({ length: cuotasTotal }, (_, idx) => {
    const venc = new Date(primeraCuotaFecha);
    venc.setMonth(venc.getMonth() + idx);
    return {
      contrato_id: contrato.id,
      numero: idx + 1,
      vencimiento: venc.toISOString().slice(0, 10),
      monto: Number(montoCuota.toFixed(2)),
    };
  });

  await supabase.from("contratos_cuotas").insert(cuotasAInsertar);

  // Marcar lote como vendido
  await supabase
    .from("lotes")
    .update({ comprado_por_cliente_id: compradorId, fecha_compra: fechaCompra })
    .eq("id", loteId);

  // Redirigir al contrato
  redirect(`/contratos/${contrato.id}`);
}

export async function anularVentaLote(loteoId: string, loteId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("lotes")
    .update({ comprado_por_cliente_id: null, fecha_compra: null })
    .eq("id", loteId);
  revalidatePath(`/loteos/${loteoId}`);
}


