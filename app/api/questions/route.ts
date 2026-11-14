import { NextResponse } from "next/server";
import { getChapters, getQuestionBank, getSubjects, subjectMatches } from "@/lib/question-bank";

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
  const chapters = getChapters(bank, subject);

  return NextResponse.json({
    subjects: getSubjects(bank),
    chapters,
    topics: [...new Set(filtered.map((question) => question.topic).filter(Boolean))].sort(),
    chapterCounts: Object.fromEntries(chapters.map((chapter) => [
      chapter,
      questions.filter((question) => question.chapter === chapter).length,
    ])),
    topicCounts: Object.fromEntries([...new Set(filtered.map((question) => question.topic).filter(Boolean))].map((topic) => [
      topic,
      filtered.filter((question) => question.topic === topic).length,
    ])),
  });
}
