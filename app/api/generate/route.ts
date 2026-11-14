import { NextResponse } from "next/server";
import { generatePaper } from "@/lib/generator";
import { getQuestionBank } from "@/lib/question-bank";
import type { GenerateRequest } from "@/types/question";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as GenerateRequest;
    const bank = Array.isArray(payload.questions) && payload.questions.length
      ? payload.questions
      : await getQuestionBank();
    return NextResponse.json({ paper: generatePaper(payload, bank) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The paper could not be generated.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
