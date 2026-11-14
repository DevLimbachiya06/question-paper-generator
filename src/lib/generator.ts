import type { BlueprintSection, GenerateRequest, Question } from "@/types/question";

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function selectSection(questions: Question[], section: BlueprintSection, used: Set<string>): Question[] {
  const matches = shuffled(questions.filter((question) =>
    !used.has(question.id) &&
    question.type.toLowerCase() === section.questionType.toLowerCase() &&
    question.marks === section.marksPerQuestion,
  ));
  if (matches.length < section.questionCount) {
    throw new Error(
      `${section.name} needs ${section.questionCount} ${section.questionType} questions worth ${section.marksPerQuestion} mark(s), but only ${matches.length} are available.`,
    );
  }
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
    question.subject === input.subject &&
    input.chapters.includes(question.chapter) &&
    (!input.topics.length || input.topics.includes(question.topic)),
  );
  if (!available.length) throw new Error("No questions match the selected filters.");

  const expectedMarks = input.blueprint.reduce(
    (total, section) => total + section.questionCount * section.marksPerQuestion,
    0,
  );
  if (expectedMarks !== input.totalMarks) {
    throw new Error(`The blueprint totals ${expectedMarks} marks, but the paper target is ${input.totalMarks}.`);
  }

  const used = new Set<string>();
  const questions = input.blueprint.flatMap((section) => {
    const selected = selectSection(available, section, used);
    selected.forEach((question) => used.add(question.id));
    return selected;
  });

  return {
    id: crypto.randomUUID(),
    name: input.paperName.trim() || `${input.subject} Question Paper`,
    subject: input.subject,
    totalMarks: input.totalMarks,
    questions,
    blueprint: input.blueprint,
  };
}
