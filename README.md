# Question Paper Generator

A Flask application for creating CBSE-style question papers from Excel question banks. It supports chapter selection, blueprint-based generation, browser preview, Word export, and answer-key export.

## Quick start with Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and run this from the project directory:

```bash
docker compose up --build -d
```

Open <http://localhost:5000>. The first startup imports the included `CBSE_Class10_Question_Bank_Starter.xlsx` file. Stop the service with `docker compose down`; your database, uploads, and generated documents remain in the `qpg-data` Docker volume.

View logs or check readiness with:

```bash
docker compose logs -f app
docker compose ps
```

To remove the application and its saved data, run `docker compose down -v`.

### Docker without Compose

```bash
docker build -t question-paper-generator .
docker volume create qpg-data
docker run --name question-paper-generator --rm -p 5000:5000 -v qpg-data:/data question-paper-generator
```

## Local development

Requirements: Python 3.12 or newer.

PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python app.py
```

macOS/Linux:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python app.py
```

Then open <http://localhost:5000>. Local runtime data is stored in `data/`. Set `DATA_DIR` to use another location and set `SECRET_KEY` before deploying anywhere shared.

## Using the application

1. Select a subject, one or more chapters, and optionally filter by topics. The selector shows the number of active questions available for each chapter/topic. Banks containing only a topic or a single chapter are supported.
2. Set the paper name and maximum marks.
3. Edit the blueprint rows, including section name, question type, question count, and marks per question. Add or remove sections as needed.
4. Generate the paper.
5. Preview it in the browser or download the paper and answer key as Word documents.
6. Upload additional `.xlsx` question banks when needed.

The workbook must contain `Question_ID`, `Subject`, `Question_Type`, `Marks`, and `Question_Text`. `Chapter` and `Topic` are optional; if `Chapter` is blank or absent, the topic is used as the chapter, or `General` is used when neither is available. Other columns support answer choices, answers, difficulty, source, year, and active status.

## Project layout

```text
app.py                  Local compatibility launcher
app/__init__.py         Flask application and routes
app/services/            Database, import, blueprint, and generation logic
app/templates/           HTML templates
app/static/              Browser assets
tests/                   Smoke tests
Dockerfile               Production container image
docker-compose.yml       Persistent local Docker setup
```

## Testing

```bash
python -m unittest discover -v
```

The GitHub Actions workflow runs the same test suite on every push and pull request.

## Configuration

Copy `.env.example` to `.env` for local configuration. Docker Compose supplies `DATA_DIR=/data` and persists it in a named volume. Never commit real secrets or generated documents.

## Troubleshooting

- Port `5000` is busy: change the left side of `5000:5000` in `docker-compose.yml`.
- Docker Desktop is not running: start it, then rerun `docker compose up --build -d`.
- No subjects appear: verify the starter workbook exists, or upload a valid `.xlsx` workbook from the home page.
- A clean reset is needed: run `docker compose down -v`, then start the service again. This deletes all saved application data.

## License

MIT. See [LICENSE](LICENSE).
