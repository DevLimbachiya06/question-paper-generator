import type { BlueprintSection } from "@/types/question";

type SectionTemplate = {
  name: string;
  questionType: string;
  marksPerQuestion: number;
  baseCount: number;
};

const standardTemplate: SectionTemplate[] = [
  { name: "Section A", questionType: "MCQ", marksPerQuestion: 1, baseCount: 20 },
  { name: "Section B", questionType: "Very Short Answer", marksPerQuestion: 2, baseCount: 5 },
  { name: "Section C", questionType: "Short Answer", marksPerQuestion: 3, baseCount: 6 },
  { name: "Section D", questionType: "Long Answer", marksPerQuestion: 5, baseCount: 4 },
  { name: "Section E", questionType: "Case Study", marksPerQuestion: 4, baseCount: 3 },
];

const englishTemplate: SectionTemplate[] = [
  { name: "Section A - Reading", questionType: "MCQ", marksPerQuestion: 1, baseCount: 20 },
  { name: "Section B - Writing and Grammar", questionType: "Very Short Answer", marksPerQuestion: 2, baseCount: 5 },
  { name: "Section C - Literature", questionType: "Short Answer", marksPerQuestion: 3, baseCount: 6 },
  { name: "Section D - Long Answer", questionType: "Long Answer", marksPerQuestion: 5, baseCount: 4 },
  { name: "Section E - Case-Based", questionType: "Case Study", marksPerQuestion: 4, baseCount: 3 },
];

function templatesForSubject(subject: string): SectionTemplate[] {
  return subject.toLowerCase().includes("english") ? englishTemplate : standardTemplate;
}

function roundedTarget(totalMarks: number): number {
  return Math.max(1, Math.round(totalMarks));
}

export function createCbseBlueprint(subject: string, totalMarks: number): BlueprintSection[] {
  const target = roundedTarget(totalMarks);
  const templates = templatesForSubject(subject);
  const desired = templates.map((template) => template.baseCount * target / 80);
  let states = new Map<number, { cost: number; counts: number[] }>([[0, { cost: 0, counts: [] }]]);

  templates.forEach((template, index) => {
    const next = new Map<number, { cost: number; counts: number[] }>();
    states.forEach((state, marks) => {
      for (let count = 0; marks + count * template.marksPerQuestion <= target; count += 1) {
        const nextMarks = marks + count * template.marksPerQuestion;
        const cost = state.cost + (count - desired[index]) ** 2;
        const existing = next.get(nextMarks);
        if (!existing || cost < existing.cost) {
          next.set(nextMarks, { cost, counts: [...state.counts, count] });
        }
      }
    });
    states = next;
  });

  const counts = states.get(target)?.counts || templates.map(() => 0);
  return templates.map((template, index) => ({
    id: `cbse-section-${index}`,
    name: template.name,
    questionType: template.questionType,
    questionCount: counts[index],
    marksPerQuestion: template.marksPerQuestion,
  }));
}

export function normalizeMarks(value: number): number {
  return roundedTarget(Number.isFinite(value) ? value : 1);
}
