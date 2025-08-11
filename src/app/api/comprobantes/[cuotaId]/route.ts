import { NextRequest } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cuotaId: string }> }) {
  const { cuotaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: cuota } = await supabase
    .from("contratos_cuotas")
    .select("id, numero, vencimiento, monto, pagado, pagado_en, contrato_id, contratos:contrato_id(id, cliente_id, lote_id)")
    .eq("id", cuotaId)
    .single();

  if (!cuota || !cuota.pagado) {
    return new Response("No existe o no está pagada", { status: 404 });
  }

  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, cliente_id, lote_id, precio_total, anticipo")
    .eq("id", cuota.contrato_id)
    .single();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre_completo, telefono")
    .eq("id", contrato?.cliente_id)
    .single();

  const { data: lote } = await supabase
    .from("lotes")
    .select("id, numero, loteo_id")
    .eq("id", contrato?.lote_id)
    .single();

  let loteo: { id: string; nombre: string } | null = null;
  if (lote) {
    const resp = await supabase
      .from("loteos")
      .select("id, nombre")
      .eq("id", lote.loteo_id)
      .single();
    loteo = resp.data as { id: string; nombre: string } | null;
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const { width } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const drawText = (text: string, x: number, y: number, size = 12) => {
    page.drawText(text, { x, y, size, font, color: rgb(1, 1, 1) });
  };

  let y = 780;
  page.drawRectangle({ x: 0, y: 0, width, height: 842, color: rgb(0.06, 0.06, 0.06) });
  drawText("Comprobante de pago", 50, y, 18); y -= 30;

  // Logo si existe en public/logo.png (opcional)
  try {
    const logoUrl = new URL("/logo.png", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").toString();
    const res = await fetch(logoUrl);
    if (res.ok) {
      const bytes = await res.arrayBuffer();
      const img = await pdf.embedPng(bytes).catch(async () => pdf.embedJpg(bytes));
      page.drawImage(img, { x: width - 150, y: y + 15, width: 100, height: 30 });
    }
  } catch {}
  drawText(`Cliente: ${cliente?.nombre_completo ?? ""}`, 50, y); y -= 18;
  drawText(`Teléfono: ${cliente?.telefono ?? ""}`, 50, y); y -= 18;
  drawText(`Loteo: ${loteo?.nombre ?? ""}`, 50, y); y -= 18;
  drawText(`Lote: ${lote?.numero ?? ""}`, 50, y); y -= 24;
  // Recuperar número de recibo
  const { data: recibo } = await supabase
    .from("recibos")
    .select("id")
    .eq("cuota_id", cuota.id)
    .single();

  drawText(`Recibo Nº: ${recibo?.id ?? "-"}`, 50, y); y -= 18;
  drawText(`Cuota #${cuota.numero}`, 50, y); y -= 18;
  drawText(`Monto: $${Number(cuota.monto).toLocaleString()}`, 50, y); y -= 18;
  drawText(`Vencimiento: ${new Date(cuota.vencimiento as unknown as string).toLocaleDateString()}`, 50, y); y -= 18;
  drawText(`Pagado en: ${new Date(cuota.pagado_en as unknown as string).toLocaleDateString()}`, 50, y);

  const pdfBytes = await pdf.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=comprobante-${cuotaId}.pdf`,
    },
  });
}


