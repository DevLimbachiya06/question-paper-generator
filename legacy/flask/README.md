# Archived Flask implementation

This directory contains the original Flask application and its Docker/Python
configuration. It is retained for reference and is not used by the Vercel
deployment.

The active application is the Next.js App Router project in the repository root.

## Docker setup

The Docker configuration runs the Flask application with Gunicorn on port 5000.
Persistent application data is stored in the `qpg-data` named Docker volume,
including the SQLite database and generated files.

### Prerequisites

- Docker Desktop with Docker Compose enabled
- PowerShell or another shell

### Start the application

From the repository root, run:

```powershell
cd legacy\flask
docker compose up --build -d
```

Wait for the container to become healthy, then open:

<http://localhost:5000>

Check the container status and health state with:

```powershell
docker compose ps
```

View application logs with:

```powershell
docker compose logs -f app
```

Press `Ctrl+C` to stop following the logs.

### Initialization behavior

The container initializes the application automatically when it starts:

- Creates the SQLite database at `/data/question_bank.db`
- Creates `/data/uploads` for imported workbooks
- Creates `/data/generated` for generated papers and answer keys
- Creates database tables if they do not already exist
- Persists all of this data in the `qpg-data` Docker volume

Docker Compose maps host port `5000` to container port `5000`. The health
endpoint is available at:

<http://localhost:5000/health>

The container health check verifies this endpoint every 30 seconds.

### Load questions

The image does not contain a database with question data. After startup, open
the application and use the workbook upload control to import an `.xlsx`
question bank. Uploaded and imported data is stored in the persistent
`qpg-data` volume.

### Manage the container

Stop the application while keeping its data:

```powershell
docker compose stop
```

Start an existing stopped application:

```powershell
docker compose start
```

Stop and remove the container and network:

```powershell
docker compose down
```

The `docker compose down` command does not remove the `qpg-data` volume, so
database and generated-file data remains available. To delete the volume and
start with a clean database, use:

```powershell
docker compose down -v
```

Warning: `docker compose down -v` permanently deletes imported questions and
generated application data.

### Rebuild after code changes

```powershell
docker compose up --build -d
```

### Run tests in the container

```powershell
docker compose run --rm app python -m unittest discover -s tests
```

### Alternative: run without Docker

From `legacy\flask`, use:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open <http://localhost:5000>. Without Docker, application data is stored in the
local `legacy\flask\data` directory.
