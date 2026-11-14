import { NextResponse } from "next/server";
import { createAnswerKeyPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const paper = await request.json();
    const pdf = await createAnswerKeyPdf(paper);
    const filename = `${String(paper.name || "question-paper")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim() || "question-paper"}-answer-key.pdf`;
    return new NextResponse(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The answer key could not be generated.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
