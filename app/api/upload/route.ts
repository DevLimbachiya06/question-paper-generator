import { NextResponse } from "next/server";
import { parseWorkbook } from "@/lib/question-bank";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Upload an .xlsx workbook." }, { status: 400 });
    }
    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json({ error: "The workbook must be smaller than 16 MB." }, { status: 400 });
    }
    const questions = await parseWorkbook(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The workbook could not be imported.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
