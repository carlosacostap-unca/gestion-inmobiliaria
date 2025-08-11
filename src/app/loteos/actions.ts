"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function crearLoteo(formData: FormData): Promise<void> {
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("loteos").insert({ nombre });
  revalidatePath("/loteos");
}

export async function eliminarLoteo(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("loteos").delete().eq("id", id);
  revalidatePath("/loteos");
}


