# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ONotebook is an open-source RAG knowledge assistant (self-hosted NotebookLM alternative).

## Development Commands

```bash
# Full stack (recommended)
make dev              # Start backend + frontend in parallel (auto-kills old processes)
make stop             # Kill all running services
make lint             # Run all linters/formatters
make clean            # Stop + remove .venv, node_modules, .next

# Backend (Python/FastAPI)
cd backend
uv run fastapi dev src/backend/main.py    # Dev server on :8000
uv run ruff check --fix src               # Lint and auto-fix
uv run ruff format src                    # Format code
uv add <package>                          # Add dependency

# Frontend (Next.js/Bun)
cd frontend
bun run dev          # Dev server on :3000
bun run lint         # Lint and auto-fix
bun run format       # Format code
bun add <package>    # Add dependency

# Docker
make docker          # Docker Compose up + pull llama3.2
make docker-stop     # Docker Compose down
```

**Package management:** Always use `uv` for Python and `bun` for JavaScript. Never manually edit lock files.

## Project Structure

```
onotebook/
├── backend/src/backend/    # FastAPI server
│   ├── <domain>/           # notebooks, documents, chat, sources, studio, etc.
│   │   ├── router.py       # API endpoints
│   │   ├── schemas.py      # Request/response models
│   │   └── service.py      # Business logic
│   ├── llm/                # Multi-provider LLM abstraction
│   ├── processing/         # Document ingestion pipeline
│   ├── embedding/          # Vector store operations
│   ├── models.py           # All SQLModel database schemas
│   ├── config.py           # Settings and environment variables
│   └── main.py             # App setup, CORS, router registration
├── frontend/src/
│   ├── app/                # Next.js App Router pages
│   ├── components/
│   │   ├── ui/             # shadcn/ui primitives
│   │   └── <feature>/      # Feature components (notebook, chat, studio, etc.)
│   ├── lib/api.ts          # All API communication
│   ├── hooks/              # TanStack Query hooks
│   ├── stores/             # Zustand stores
│   └── types/              # TypeScript interfaces
└── Makefile                # Dev workflow automation
```

## Architecture

### Data Flow

1. **Sources** are uploaded or created from URLs/YouTube/paste
2. **Processing** extracts text, chunks it, generates embeddings
3. **ChromaDB** stores embeddings per notebook collection (`notebook_{id}`)
4. **Chat** retrieves relevant chunks via vector search, builds RAG prompt, streams response

### Key Concepts

- **Notebook**: Container for sources, chat sessions, notes, studio outputs
- **Document/Source**: Knowledge source (file, URL, YouTube, paste); processing status tracked
- **ChatSession**: Conversation thread; messages link to source chunks via citations
- **StudioOutput**: Generated artifacts (mind maps) with async progress tracking

### LLM Abstraction (`llm/` module)

- `base.py`: `LLMProvider` abstract class with `chat_stream()` method
- `factory.py`: `get_provider(name)` returns cached provider instance
- Providers: Ollama (default), Anthropic, OpenAI

### Streaming

Chat uses Server-Sent Events (SSE). Stream events: `sources`, `grounding`, `token`, `done`, `suggestions`, `error`.

## Code Rules

**Backend (Python)**
- Async-first: Use AsyncSession, async generators, never block with sync I/O
- Run sync SDK calls in threadpool; CPU-intensive tasks in worker processes
- Type hints on all functions; use Pydantic validators for user input
- Table names: `lower_case_snake`, singular, `_at` suffix for timestamps

**Frontend (TypeScript)**
- Function declarations: `function Button() {}` not `const Button = () => {}`
- shadcn/ui as primitives; compose rather than modify
- Zustand for client state, TanStack Query for server state
- Tailwind only; use `cn()` for conditional classes
- All API calls through TanStack Query hooks in `hooks/use-<resource>.ts`
- No `any` type; explicit interfaces for all API contracts

**General**
- Name things clearly; no abbreviations
- One function, one job; use early returns
- Inline abstractions used only once
- Three similar lines beats a premature abstraction
- Delete unused code immediately

## Quality Standards

**Before implementing, always:**
- Explore existing code patterns, design tokens, and abstractions in the area you're modifying
- Identify if libraries already in `package.json` or `pyproject.toml` solve the problem
- Consider modern, well-maintained libraries for the tech stack that would handle this better than custom code—suggest adding them if the benefit is clear
- Consider 2-3 approaches, analyze tradeoffs, and pick one decisively—don't hedge or ask unless genuinely uncertain

**While implementing:**
- Match existing UI patterns exactly: spacing, colors, typography, animations, component composition
- Extend design tokens (`globals.css`, `tailwind.config.ts`) rather than hardcoding values
- Use libraries for non-trivial logic (dates, validation, formatting, animations); write custom code only when simpler
- Code should be self-documenting—add comments only for non-obvious "why", never for "what"
- No defensive code for impossible states; trust internal functions and framework guarantees
- No abstractions, helpers, or utilities for one-time operations

**After implementing:**
- Delete all dead code, unused imports, and orphaned files—no `_unused` prefixes or `// removed` comments
- Verify the change works in isolation without breaking existing behavior
- For larger changes, mentally walk through: "Is there anything here I wouldn't want to maintain in 6 months?"

**Signs of over-engineering to avoid:**
- Config objects for things that won't change
- Wrapper functions that just call another function
- Validation for internal data that's already validated
- Error handling for errors that can't occur
- Feature flags for features that will always be on
- Backward-compatibility shims when you can just change the code

## Committing

1. Run `make lint` before committing
2. Update README.md if changes affect setup or usage
3. Use imperative mood: Add, Fix, Update, Remove
4. Summarize the "why" not the "what"
5. No Co-Authored-By trailer
6. Do not push unless explicitly asked
