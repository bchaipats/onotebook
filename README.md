# ONotebook

Open-source RAG knowledge assistant. Self-hosted NotebookLM alternative.

## Quickstart

**Prerequisites:** [Ollama](https://ollama.com), [uv](https://docs.astral.sh/uv/), [Bun](https://bun.sh)

```bash
# Start Ollama
ollama serve

# Backend (terminal 1)
cd backend && uv run fastapi dev src/backend/main.py

# Frontend (terminal 2)
cd frontend && bun install && bun run dev
```

Open http://localhost:3000

## Docker

```bash
docker compose up --build -d
docker compose exec ollama ollama pull llama3.2
```

**NVIDIA GPU:** `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build -d`

**Apple Silicon:** Run Ollama natively for Metal acceleration, then:
```bash
OLLAMA_BASE_URL=http://host.docker.internal:11434 docker compose up backend frontend --build -d
```
