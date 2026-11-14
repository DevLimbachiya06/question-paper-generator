import { NextResponse } from "next/server";
import { createPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const paper = await request.json();
    const pdf = await createPdf(paper);
    return new NextResponse(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${String(paper.name || "question-paper").replace(/[^a-z0-9-_ ]/gi, "").trim() || "question-paper"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The PDF could not be generated.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
