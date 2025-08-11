"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function pagarPrimeraCuota(loteId: string, formData: FormData): Promise<void> {
  const cuotaId = String(formData.get("cuota_id") || "").trim();
  const fechaPago = String(formData.get("fecha_pago") || "").trim();

  const supabase = await createSupabaseServerClient();

  let cuotaIdAUsar = cuotaId;
  if (!cuotaIdAUsar) {
    // Seguridad: si no vino, buscamos la primera pendiente por servidor
    const { data: contrato } = await supabase
      .from("contratos")
      .select("id")
      .eq("lote_id", loteId)
      .single();
    if (!contrato) return;
    const { data: cuota } = await supabase
      .from("contratos_cuotas")
      .select("id")
      .eq("contrato_id", contrato.id)
      .eq("pagado", false)
      .order("numero", { ascending: true })
      .limit(1)
      .single();
    if (!cuota) return;
    cuotaIdAUsar = cuota.id as string;
  }

  const pagoFecha = fechaPago ? new Date(fechaPago).toISOString() : new Date().toISOString();

  await supabase
    .from("contratos_cuotas")
    .update({ pagado: true, pagado_en: pagoFecha })
    .eq("id", cuotaIdAUsar);

  // Crear recibo si no existe
  const { data: existente } = await supabase
    .from("recibos")
    .select("id")
    .eq("cuota_id", cuotaIdAUsar)
    .maybeSingle();
  if (!existente) {
    await supabase
      .from("recibos")
      .insert({ cuota_id: cuotaIdAUsar })
      .select("id")
      .single();
  }

  // Si todas las cuotas quedaron pagadas, podemos opcionalmente actualizar el estado del contrato
  const { data: contratoDeCuota } = await supabase
    .from("contratos_cuotas")
    .select("contrato_id")
    .eq("id", cuotaIdAUsar)
    .single();

  const contratoId = contratoDeCuota?.contrato_id as string | undefined;
  if (contratoId) {
    const { count } = await supabase
      .from("contratos_cuotas")
      .select("id", { count: "exact", head: true })
      .eq("contrato_id", contratoId)
      .eq("pagado", false);
    if (typeof count === "number" && count === 0) {
      await supabase.from("contratos").update({ estado: "completo" }).eq("id", contratoId);
    }
  }

  revalidatePath(`/lotes/${loteId}`);
}


