# Contributing

## Development setup

1. Create a Python 3.12+ virtual environment.
2. Install dependencies with `python -m pip install -r requirements.txt`.
3. Run the tests with `python -m unittest discover -v`.
4. Start the app with `python app.py` or `docker compose up --build`.

## Pull requests

Keep changes focused, add or update a smoke test for behavior changes, and update the README when setup or configuration changes. Do not commit `data/`, uploads, generated documents, virtual environments, secrets, or local database files.
