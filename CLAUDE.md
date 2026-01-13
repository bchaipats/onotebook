# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ONotebook is an open-source RAG knowledge assistant (self-hosted NotebookLM alternative).

## Project Structure

```
onotebook/
├── backend/    # FastAPI server (Python)
├── frontend/   # Next.js app (TypeScript)
└── docs/       # Documentation
```

## Development

```bash
# Backend
cd backend
uv add <package>                          # Add package
uv run fastapi dev src/backend/main.py    # Start dev server
uv run ruff check --fix src               # Lint and auto-fix
uv run ruff format src                    # Format code

# Frontend
cd frontend
bun add <package>    # Add package
bun run dev          # Start dev server
bun run lint         # Lint and auto-fix
bun run format       # Format code
```

**Package management:** Always use `uv` for Python and `bun` for JavaScript. Never manually edit dependency files or lock files.

**Documentation:** Keep README.md up-to-date with quickstart instructions. Keep it minimal.

## Code Rules

When writing code, follow these rules:

**Clarity**
- Name things clearly; no abbreviations
- One function, one job
- Use early returns to flatten nesting
- Delete comments that restate code

**Simplicity**
- Inline abstractions used only once
- No wrapper functions that just call another function
- No config objects; use constants
- Three similar lines beats a premature abstraction
- Delete unused code, variables, and imports immediately

**Safety**
- Validate user input at API boundaries
- Handle all error states in the UI
- No `any` in TypeScript; type hints on all Python functions

---

## Backend

### Structure

```
src/backend/
├── <domain>/           # e.g., notebooks, documents, chat
│   ├── router.py       # API endpoints
│   ├── schemas.py      # Request/response models
│   ├── models.py       # Database models
│   └── service.py      # Business logic
├── config.py
├── database.py
└── main.py
```

### Rules

- Never block async functions with synchronous I/O
- Run sync SDK calls in threadpool; CPU-intensive tasks in worker processes
- Use Pydantic validators; raise `ValueError` for user-friendly errors
- Chain dependencies to avoid repetition; prefer async dependencies
- Use explicit naming for indexes/constraints
- Table names: `lower_case_snake`, singular, `_at` suffix for timestamps

---

## Frontend

### Structure

```
src/
├── app/           # Next.js App Router pages
├── components/
│   ├── ui/        # shadcn/ui primitives
│   └── <feature>/ # Feature components
├── lib/           # API client, utils, constants
├── hooks/         # TanStack Query hooks
├── stores/        # Zustand stores
└── types/
```

### Rules

- Use function declarations: `function Button() {}` not `const Button = () => {}`
- Use shadcn/ui as primitives; compose rather than modify
- Zustand for client state, TanStack Query for server state, useState for local
- Tailwind only; use `cn()` for conditional classes
- All API calls through TanStack Query hooks in `hooks/use-<resource>.ts`

---

## Architecture

### Data Flow

1. **Sources** (Documents) are uploaded or created from URLs/YouTube/paste
2. **Processing** extracts text, chunks it, and generates embeddings
3. **ChromaDB** stores embeddings per notebook collection
4. **Chat** retrieves relevant chunks via vector search, builds RAG prompt, streams response

### Key Concepts

- **Notebook**: Container for sources, chat sessions, notes, and studio outputs
- **Document/Source**: A source of knowledge (file, URL, YouTube, paste); chunks stored in vector DB
- **ChatSession**: Conversation thread within a notebook; messages link to source chunks via citations
- **StudioOutput**: Generated artifacts (mind maps, etc.) from notebook content

### LLM Abstraction

The `llm/` module provides a unified interface for multiple providers:
- `base.py`: `LLMProvider` abstract class with `chat_stream()` method
- `factory.py`: `get_provider(name)` returns cached provider instance
- Providers: Ollama (default), Anthropic, OpenAI

### Vector Store

ChromaDB with one collection per notebook (`notebook_{id}`). Embeddings use `sentence-transformers` with BGE model. Search returns chunks with cosine distance scores.

### Streaming Responses

Chat uses Server-Sent Events (SSE). Stream events: `sources`, `grounding`, `token`, `done`, `suggestions`, `error`.
