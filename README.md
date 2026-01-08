# onotebook

Open-source RAG knowledge assistant. Self-hosted NotebookLM alternative.

## Structure

- `frontend/` - Next.js web app
- `backend/` - FastAPI server

## Development

Terminal 1:
cd backend && uv run fastapi dev src/backend/main.py

Terminal 2:
cd frontend && bun run dev

Terminal 3:
ollama serve

## Documentation

- `docs/app_spec.txt` - Full specification