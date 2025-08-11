"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createCliente(formData: FormData): Promise<void> {
  const nombreCompleto = String(formData.get("nombre_completo") || "").trim();
  const telefono = String(formData.get("telefono") || "").trim();

  if (!nombreCompleto || !telefono) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("clientes").insert({ nombre_completo: nombreCompleto, telefono });
  revalidatePath("/clientes");
}

export async function deleteCliente(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("clientes").delete().eq("id", id);
  revalidatePath("/clientes");
}


