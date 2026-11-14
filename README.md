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

The generator requires the blueprint total to exactly match the requested
maximum marks and returns a user-safe error when there are not enough matching
questions.

## Workbook format

Required columns:

```text
Question_ID, Subject, Question_Type, Marks, Question_Text
```

Optional columns include `Chapter`, `Topic`, `Difficulty`, `Option_A` through
`Option_D`, `Correct_Answer`, `Answer_Key`, `Source`, `Year`, and `Active`.

## Legacy Flask implementation

The original Flask implementation remains in the repository for reference and
local compatibility. The Vercel deployment entrypoint is now the Next.js
application in the root `app/` directory.

## License

MIT. See [LICENSE](./LICENSE).
