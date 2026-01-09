# CLAUDE.md

ONotebook is an open-source RAG knowledge assistant.

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

## Code Principles

**Write clean code:**
- Clear names that describe intent; no abbreviations
- Functions do one thing; split if it needs a comment to explain
- Handle errors explicitly with meaningful messages
- Delete unused code immediately; no TODOs or commented-out blocks

**Avoid over-engineering:**
- No premature abstractions; write concrete code until duplication is obvious
- No "just in case" flexibility; solve the current problem only
- No wrapper functions that just call another function
- Three similar lines is better than a premature abstraction

**Avoid under-engineering:**
- Validate all user input at API boundaries
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

### Guidelines

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

### Guidelines

- Function declarations for components: `function Button() {}` not `const Button = () => {}`
- Use shadcn/ui as primitives; compose rather than modify
- **Zustand** for client state, **TanStack Query** for server state, **useState** for local
- Tailwind only; use `cn()` for conditional classes
- All API calls through TanStack Query hooks in `hooks/use-<resource>.ts`
