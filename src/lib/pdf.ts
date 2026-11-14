import PDFDocument from "pdfkit";
import type { BlueprintSection } from "@/types/question";

type Paper = {
  name: string;
  subject: string;
  totalMarks: number;
  questions: Array<{
    text: string;
    marks: number;
    options: string[];
    correctAnswer?: string;
    answerKey?: string;
  }>;
  blueprint?: BlueprintSection[];
};

function collectPdf(document: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
}

export async function createPdf(paper: Paper): Promise<Buffer> {
  const document = new PDFDocument({ margin: 54 });
  const result = collectPdf(document);
  document.fontSize(20).font("Helvetica-Bold").text(paper.name, { align: "center" });
  document.moveDown(0.5).fontSize(11).font("Helvetica")
    .text(`Subject: ${paper.subject}    Maximum Marks: ${paper.totalMarks}`, { align: "center" });
  document.moveDown().font("Helvetica-Bold").text("General Instructions:");
  document.font("Helvetica").text("1. All questions are compulsory unless stated otherwise.");
  document.text("2. Read each section carefully and answer according to the marks allotted.");
  document.moveDown();

  let questionIndex = 0;
  const sections = paper.blueprint?.length
    ? paper.blueprint
    : [{ id: "default", name: "Questions", questionType: "", questionCount: paper.questions.length, marksPerQuestion: 0 }];
  sections.forEach((section) => {
    const sectionQuestions = paper.questions.slice(questionIndex, questionIndex + section.questionCount);
    if (!sectionQuestions.length) return;
    document.fontSize(14).font("Helvetica-Bold").text(section.name, { underline: true });
    document.fontSize(10).font("Helvetica-Oblique")
      .text(`${section.questionType || "Questions"} - ${sectionQuestions.length} question(s)`);
    document.moveDown(0.4);
    sectionQuestions.forEach((question, index) => {
      document.font("Helvetica-Bold").text(`${questionIndex + index + 1}. `, { continued: true });
      document.font("Helvetica").text(`${question.text} (${question.marks} marks)`);
      question.options.filter(Boolean).forEach((option, optionIndex) => {
        document.text(`     ${String.fromCharCode(65 + optionIndex)}. ${option}`);
      });
      document.moveDown(0.7);
    });
    questionIndex += sectionQuestions.length;
  });
  document.end();
  return result;
}

export async function createAnswerKeyPdf(paper: Paper): Promise<Buffer> {
  const document = new PDFDocument({ margin: 54 });
  const result = collectPdf(document);
  document.fontSize(20).font("Helvetica-Bold").text(`${paper.name} - Answer Key`, { align: "center" });
  document.moveDown(0.5).fontSize(11).font("Helvetica")
    .text(`Subject: ${paper.subject}    Maximum Marks: ${paper.totalMarks}`, { align: "center" });
  document.moveDown();

  let questionIndex = 0;
  const sections = paper.blueprint?.length
    ? paper.blueprint
    : [{ id: "default", name: "Answers", questionType: "", questionCount: paper.questions.length, marksPerQuestion: 0 }];
  sections.forEach((section) => {
    const sectionQuestions = paper.questions.slice(questionIndex, questionIndex + section.questionCount);
    if (!sectionQuestions.length) return;
    document.fontSize(14).font("Helvetica-Bold").text(section.name, { underline: true });
    document.moveDown(0.4);
    sectionQuestions.forEach((question, index) => {
      const answer = question.answerKey || question.correctAnswer || "Not provided";
      document.font("Helvetica-Bold").text(`${questionIndex + index + 1}. `, { continued: true });
      document.font("Helvetica").text(`${answer} (${question.marks} marks)`);
      if (question.answerKey && question.correctAnswer) {
        document.fontSize(10).fillColor("#555555").text(`Marking scheme: ${question.answerKey}`);
        document.fontSize(11).fillColor("#000000");
      }
      document.moveDown(0.7);
    });
    questionIndex += sectionQuestions.length;
  });
  document.end();
  return result;
}
