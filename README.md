# Question Paper Generator

A Vercel-ready Next.js App Router application for creating balanced question
papers from Excel question banks. It keeps the original Exam Studio workflow:
chapter and topic filters, editable blueprints, live preview, and document export.

## Stack

- Next.js 16 App Router and React
- TypeScript
- Tailwind CSS
- ExcelJS for server-side `.xlsx` parsing
- PDFKit for server-side PDF generation
- Vercel Functions with the Node.js runtime

The application currently uses the tracked starter workbook as a read-only
fallback question bank. Uploaded workbooks are parsed securely on the server
and used for the current browser session.

The paper builder starts with a CBSE Grade 10 five-section blueprint:
20 one-mark objective questions, 5 two-mark questions, 6 three-mark
questions, 4 five-mark questions, and 3 four-mark case-study questions
(80 marks). Other maximum-mark values are rounded to a whole number and
adapted proportionally while preserving the exact total. Editing the blueprint
automatically updates the maximum marks.

## Local development

Requirements: Node.js 20.9 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

Useful checks:

```powershell
npm run typecheck
npm run build
```

## Vercel deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Keep the framework preset as **Next.js**.
4. Add the variables from `.env.example` in Project Settings.
5. Deploy.

`vercel.json` pins the Functions region and gives the API routes a 60-second
maximum duration. The PDF endpoint streams the generated PDF directly instead
of writing to the function filesystem.

## Production data persistence

The current no-database mode is useful for a demo, but uploaded files are
intentionally session-scoped. For a multi-user production deployment:

1. Provision a Postgres database such as Neon.
2. Add its connection string as `DATABASE_URL`.
3. Replace the fallback workbook repository in `src/lib/question-bank.ts` with
   a database repository and migrations.
4. Store uploaded workbooks and generated documents in private object storage
   such as Vercel Blob.
5. Add authentication and owner checks before exposing question banks or answer
   keys.

Do not use SQLite, `uploads/`, or `generated/` as durable storage on Vercel.

## API routes

- `GET /api/questions` — subjects, chapters, topics, and counts
- `POST /api/upload` — validates and parses an `.xlsx` workbook
- `POST /api/generate` — validates the blueprint and generates a paper
- `POST /api/pdf` — returns a formatted PDF download
- `POST /api/answer-key` — returns a formatted answer-key PDF download

The generator automatically reduces section counts when the selected bank does
not contain enough matching questions, then recalculates the blueprint and
maximum marks instead of failing with an availability error.

The subject catalog includes SST, Chemistry, Biology, and SCIENCE. SCIENCE
selects questions stored as Physics, Chemistry, Biology, or Science. The
official CBSE 2025 and 2026 papers are copyrighted, so they are not copied into
this repository. Use the Excel importer for question banks and answer keys you
are authorized to use.

## Workbook format

Required columns:

```text
Question_ID, Subject, Question_Type, Marks, Question_Text
```

Optional columns include `Chapter`, `Topic`, `Difficulty`, `Option_A` through
`Option_D`, `Correct_Answer`, `Answer_Key`, `Source`, `Year`, and `Active`.

## Legacy Flask implementation

The original Flask implementation is archived under [`legacy/flask/`](./legacy/flask/)
for reference. It is not part of the Vercel deployment; the deployment entrypoint
is the Next.js application in the root [`app/`](./app/) directory.

## License

MIT. See [LICENSE](./LICENSE).
