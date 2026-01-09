Lint, format, and commit changes:

1. **Run linters and formatters:**
   ```bash
   cd backend && uv run ruff check --fix src && uv run ruff format src
   cd frontend && bun run lint && bun run format
   ```

2. **Review changes:** Run `git status` and `git diff` to understand what changed.

3. **Update README.md** if changes affect setup, dependencies, or usage.

4. **Commit with descriptive message:**
   - Summarize the "why" not the "what"
   - Use imperative mood (Add, Fix, Update, Remove)
   - No Claude Code trailer (no Co-Authored-By line)
   - Format:
     ```
     git commit -m "Short description of change"
     ```

Do NOT push to remote unless explicitly asked.
