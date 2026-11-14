import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import type { Question } from "@/types/question";

type WorkbookRow = Record<string, unknown>;

const starterWorkbook = path.join(process.cwd(), "CBSE_Class10_Question_Bank_Starter.xlsx");
const catalogSubjects = ["SST", "Chemistry", "Biology", "SCIENCE"];
const scienceSubjects = ["science", "physics", "chemistry", "biology"];
const canonicalChapters: Record<string, string[]> = {
  mathematics: [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  science: [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and Its Compounds",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity",
    "Light - Reflection and Refraction",
    "Human Eye and Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment",
  ],
  sst: [
    "The Rise of Nationalism in Europe",
    "Nationalism in India",
    "The Making of a Global World",
    "The Age of Industrialisation",
    "Print Culture and the Modern World",
    "Resources and Development",
    "Forest and Wildlife Resources",
    "Water Resources",
    "Agriculture",
    "Minerals and Energy Resources",
    "Manufacturing Industries",
    "Lifelines of National Economy",
    "Power Sharing",
    "Federalism",
    "Gender, Religion and Caste",
    "Political Parties",
    "Outcomes of Democracy",
    "Challenges to Democracy",
    "Development",
    "Sectors of the Indian Economy",
    "Money and Credit",
    "Globalisation and the Indian Economy",
    "Consumer Rights",
  ],
  english: [
    "Reading Skills",
    "Writing Skills",
    "Grammar",
    "A Letter to God",
    "Nelson Mandela - Long Walk to Freedom",
    "Stories About Flying",
    "From the Diary of Anne Frank",
    "Glimpses of India",
    "Mijbil the Otter",
    "Madam Rides the Bus",
    "The Sermon at Benares",
    "The Proposal",
    "Dust of Snow",
    "Fire and Ice",
    "A Tiger in the Zoo",
    "How to Tell Wild Animals",
    "The Ball Poem",
    "Amanda!",
    "The Trees",
    "Fog",
    "The Tale of Custard the Dragon",
    "For Anne Gregory",
    "A Triumph of Surgery",
    "The Thief's Story",
    "The Midnight Visitor",
    "A Question of Trust",
    "Footprints Without Feet",
    "The Making of a Scientist",
    "The Necklace",
    "Bholi",
    "The Book That Saved the Earth",
    "Legacy / outside current syllabus",
  ],
};

export function subjectMatches(questionSubject: string, selectedSubject: string): boolean {
  const questionValue = questionSubject.trim().toLowerCase();
  const selectedValue = selectedSubject.trim().toLowerCase();
  if (selectedValue === "science") return scienceSubjects.includes(questionValue);
  if (selectedValue === "sst") return ["sst", "social science", "social studies"].includes(questionValue);
  return questionValue === selectedValue;
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function parseRows(rows: WorkbookRow[]): Question[] {
  return rows
    .map((row, index) => {
      const id = text(row.Question_ID) || `imported-${index + 1}`;
      const chapter = text(row.Chapter) || text(row.Topic) || "General";
      const options = ["Option_A", "Option_B", "Option_C", "Option_D"].map((key) => text(row[key]));
      return {
        id,
        subject: text(row.Subject),
        chapter,
        topic: text(row.Topic),
        type: text(row.Question_Type),
        marks: Number(row.Marks) || 0,
        difficulty: text(row.Difficulty) || "Unspecified",
        text: text(row.Question_Text),
        options,
        correctAnswer: text(row.Correct_Answer),
        answerKey: text(row.Answer_Key),
        source: text(row.Source),
        year: text(row.Year),
      };
    })
    .filter((question) => question.subject && question.type && question.text && question.marks > 0);
}

export async function parseWorkbook(buffer: Buffer): Promise<Question[]> {
  const workbook = new ExcelJS.Workbook();
  const workbookData = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  await (workbook.xlsx.load as unknown as (data: Uint8Array) => Promise<unknown>)(workbookData);
  const firstSheet = workbook.worksheets[0];
  if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
  const headerRow = firstSheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const headers = headerValues.slice(1).map((value: unknown) => text(value));
  const rows: WorkbookRow[] = [];
  firstSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(Object.fromEntries(headers.map((header: string, index: number) => [header, values[index] ?? ""])));
  });
  if (!rows.length) throw new Error("The workbook does not contain any question rows.");
  const questions = parseRows(rows);
  if (!questions.length) {
    throw new Error("No valid questions were found. Check the required columns and marks.");
  }
  return questions;
}

export async function getQuestionBank(): Promise<Question[]> {
  if (!fs.existsSync(starterWorkbook)) return [];
  return parseWorkbook(fs.readFileSync(starterWorkbook));
}

export function getSubjects(questions: Question[]): string[] {
  const existing = [...new Set(questions.map((question) => question.subject))];
  return [...existing, ...catalogSubjects.filter((subject) => !existing.some(
    (value) => value.trim().toLowerCase() === subject.toLowerCase(),
  ))];
}

export function getChapters(questions: Question[], subject: string): string[] {
  const key = subject.trim().toLowerCase();
  const catalogKey = key === "science" ? "science"
    : key === "sst" ? "sst"
      : key.includes("english") ? "english"
        : key;
  const existing = questions
    .filter((question) => subjectMatches(question.subject, subject))
    .map((question) => question.chapter);
  return [...new Set([...(canonicalChapters[catalogKey] || []), ...existing])].sort();
}
