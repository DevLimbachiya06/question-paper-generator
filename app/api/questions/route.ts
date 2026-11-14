import { NextResponse } from "next/server";
import { getQuestionBank, getSubjects, subjectMatches } from "@/lib/question-bank";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || "";
  const selectedChapters = searchParams.getAll("chapter");
  const bank = await getQuestionBank();
  const questions = subject ? bank.filter((question) => subjectMatches(question.subject, subject)) : bank;
  const filtered = selectedChapters.length
    ? questions.filter((question) => selectedChapters.includes(question.chapter))
    : questions;

  return NextResponse.json({
    subjects: getSubjects(bank),
    chapters: [...new Set(questions.map((question) => question.chapter))].sort(),
    topics: [...new Set(filtered.map((question) => question.topic).filter(Boolean))].sort(),
    chapterCounts: Object.fromEntries([...new Set(questions.map((question) => question.chapter))].map((chapter) => [
      chapter,
      questions.filter((question) => question.chapter === chapter).length,
    ])),
    topicCounts: Object.fromEntries([...new Set(filtered.map((question) => question.topic).filter(Boolean))].map((topic) => [
      topic,
      filtered.filter((question) => question.topic === topic).length,
    ])),
  });
}
