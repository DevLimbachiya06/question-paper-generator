export type Question = {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  type: string;
  marks: number;
  difficulty: string;
  text: string;
  options: string[];
  correctAnswer: string;
  answerKey: string;
  source?: string;
  year?: string;
};

export type BlueprintSection = {
  id: string;
  name: string;
  questionType: string;
  questionCount: number;
  marksPerQuestion: number;
};

export type GenerateRequest = {
  paperName: string;
  subject: string;
  chapters: string[];
  topics: string[];
  totalMarks: number;
  blueprint: BlueprintSection[];
  questions?: Question[];
};
