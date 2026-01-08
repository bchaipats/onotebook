# CLAUDE.md

Project guidelines for the frontend codebase.

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (routes)/           # Route groups
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── <feature>/          # Feature-specific components
├── lib/
│   ├── api.ts              # API client
│   ├── utils.ts            # Utility functions (cn, etc.)
│   └── constants.ts        # App constants
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## Component Patterns

- Use function declarations for components: `function Button() {}` not `const Button = () => {}`
- Colocate component-specific types in the same file
- Use shadcn/ui components from `@/components/ui` as base primitives
- Compose shadcn/ui components rather than modifying them directly

## State Management

- **Zustand** for global client state (theme, sidebar, UI preferences)
- **TanStack Query** for server state (notebooks, documents, messages)
- **useState** for local component state
- Avoid prop drilling beyond 2 levels; use Zustand or composition instead

## Styling

- Use Tailwind classes exclusively; no inline styles or CSS modules
- Use `cn()` utility from `lib/utils` for conditional classes
- Follow shadcn/ui color conventions: `bg-background`, `text-foreground`, `text-muted-foreground`

## API Integration

- All API calls through TanStack Query hooks in `hooks/use-<resource>.ts`
- API client functions in `lib/api.ts`
- Handle loading/error states via TanStack Query, not manual useState