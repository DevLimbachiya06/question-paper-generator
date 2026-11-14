import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import type { Question } from "@/types/question";

type WorkbookRow = Record<string, unknown>;

const starterWorkbook = path.join(process.cwd(), "CBSE_Class10_Question_Bank_Starter.xlsx");

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
  return [...new Set(questions.map((question) => question.subject))].sort();
}
