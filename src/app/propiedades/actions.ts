"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function crearPropiedad(formData: FormData): Promise<void> {
  const nombre = String(formData.get("nombre") || "").trim();
  const direccion = String(formData.get("direccion") || "").trim();
  const descripcion = String(formData.get("descripcion") || "");
  if (!nombre || !direccion) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("propiedades").insert({ nombre, direccion, descripcion });
  revalidatePath("/propiedades");
}

export async function eliminarPropiedad(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("propiedades").delete().eq("id", id);
  revalidatePath("/propiedades");
}


