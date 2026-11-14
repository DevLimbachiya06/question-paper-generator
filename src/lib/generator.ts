import type { BlueprintSection, GenerateRequest, Question } from "@/types/question";
import { subjectMatches } from "@/lib/question-bank";

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function selectSection(questions: Question[], section: BlueprintSection, used: Set<string>): Question[] {
  const matches = shuffled(questions.filter((question) =>
    !used.has(question.id) &&
    question.type.toLowerCase() === section.questionType.toLowerCase() &&
    question.marks === section.marksPerQuestion,
  ));
  return matches.slice(0, section.questionCount);
}

export function generatePaper(input: GenerateRequest, bank: Question[]) {
  if (!input.subject) throw new Error("Choose a subject.");
  if (!input.chapters.length) throw new Error("Choose at least one chapter.");
  if (!input.blueprint.length) throw new Error("Add at least one blueprint section.");
  if (!Number.isInteger(input.totalMarks) || input.totalMarks <= 0) {
    throw new Error("Total marks must be a positive whole number.");
  }

  const available = bank.filter((question) =>
    subjectMatches(question.subject, input.subject) &&
    input.chapters.includes(question.chapter) &&
    (!input.topics.length || input.topics.includes(question.topic)),
  );
  if (!available.length) throw new Error("No questions match the selected filters.");

  const used = new Set<string>();
  const selections = input.blueprint.map((section) => {
    const selected = selectSection(available, section, used);
    selected.forEach((question) => used.add(question.id));
    return selected;
  });
  const adjustedBlueprint = input.blueprint.map((section, index) => ({
    ...section,
    questionCount: selections[index].length,
  }));
  const questions = selections.flat();
  if (!questions.length) {
    throw new Error("No questions match the selected blueprint types and marks.");
  }
  const totalMarks = adjustedBlueprint.reduce(
    (total, section) => total + section.questionCount * section.marksPerQuestion,
    0,
  );
  const adjusted = adjustedBlueprint.some((section, index) => section.questionCount !== input.blueprint[index].questionCount);

  return {
    id: crypto.randomUUID(),
    name: input.paperName.trim() || `${input.subject} Question Paper`,
    subject: input.subject,
    totalMarks,
    questions,
    blueprint: adjustedBlueprint,
    adjusted,
  };
}
