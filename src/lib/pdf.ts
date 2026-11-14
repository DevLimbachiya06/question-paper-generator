import PDFDocument from "pdfkit";

type Paper = {
  name: string;
  subject: string;
  totalMarks: number;
  questions: Array<{ text: string; marks: number; options: string[] }>;
};

export function createPdf(paper: Paper): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 54 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(20).font("Helvetica-Bold").text(paper.name, { align: "center" });
    document.moveDown(0.5).fontSize(11).font("Helvetica")
      .text(`Subject: ${paper.subject}    Maximum Marks: ${paper.totalMarks}`, { align: "center" });
    document.moveDown();

    paper.questions.forEach((question, index) => {
      document.font("Helvetica-Bold").text(`${index + 1}. `, { continued: true });
      document.font("Helvetica").text(`${question.text} (${question.marks} marks)`);
      question.options.filter(Boolean).forEach((option, optionIndex) => {
        document.text(`     ${String.fromCharCode(65 + optionIndex)}. ${option}`);
      });
      document.moveDown(0.7);
    });
    document.end();
  });
}
