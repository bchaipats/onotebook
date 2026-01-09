# Docker Deployment

## Prerequisites

- Docker Engine 20.10+ with Compose V2
- 8GB RAM minimum (16GB recommended)
- 20GB disk space

## Quick Start

```bash
docker compose up --build -d
docker compose exec ollama ollama pull llama3.2
```

Open http://localhost:3000

## Deployment Options

### Standard (CPU)

Works on Linux, macOS Intel, Windows WSL2:

```bash
docker compose up --build -d
docker compose exec ollama ollama pull llama3.2
```

### NVIDIA GPU

Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html):

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build -d
docker compose exec ollama ollama pull llama3.2
```

### macOS Apple Silicon

For Metal acceleration, run Ollama natively instead of in Docker:

```bash
# 1. Install and start Ollama
brew install ollama
ollama serve

# 2. Pull a model
ollama pull llama3.2

# 3. Create .env file
echo "OLLAMA_BASE_URL=http://host.docker.internal:11434" > .env

# 4. Start containers (without Ollama)
docker compose up backend frontend --build -d
```

Or run step 3-4 as a single command:

```bash
OLLAMA_BASE_URL=http://host.docker.internal:11434 docker compose up backend frontend --build -d
```

## Configuration

Create a `.env` file (see `.env.example`):

```bash
OLLAMA_BASE_URL=http://ollama:11434
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Data Volumes

| Volume | Contents |
|--------|----------|
| `onotebook-data` | Database, vectors, uploads |
| `ollama-models` | LLM models |
| `hf-cache` | Embedding model cache |

## Commands

```bash
docker compose logs -f              # View logs
docker compose down                 # Stop (keep data)
docker compose down -v              # Stop and DELETE data
docker compose up --build -d        # Rebuild and restart
```

## Troubleshooting

**Can't connect to Ollama**: Run `docker compose logs ollama` or ensure native Ollama is running

**Slow first startup**: Embedding model (~150MB) downloads automatically on first request

**Port conflict**: Change ports in `docker-compose.yml` (e.g., `"3001:3000"`)

## Production

Use a reverse proxy for HTTPS:

```
# Caddyfile
yourdomain.com {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
}
```
