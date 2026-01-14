# Polish

Critically review and improve the code from this session. Be ruthless—treat it as if someone else wrote it.

## Process

1. Identify all files changed using git diff or memory
2. For each file, evaluate and **fix** (don't just report):

**Consistency** — Does it match existing patterns?
- UI: spacing, colors, typography, animations, component composition
- Code: naming conventions, file structure, established abstractions
- If not → fix it to match

**Simplicity** — Can anything be deleted?
- Code that doesn't change behavior → delete
- Abstractions used once → inline
- Defensive code for impossible states → delete
- Comments restating the code → delete
- Custom logic a library handles → replace

**Completeness** — Is cleanup finished?
- Dead code, unused imports, orphaned files → delete
- Hardcoded values that should be tokens → extract
- TODOs that should be resolved now → resolve or remove

**Libraries** — Was the wheel reinvented?
- Check `package.json`/`pyproject.toml` for existing solutions
- Check codebase for existing utilities that do the same thing
- Consider modern, well-maintained libraries for the tech stack (React, FastAPI, etc.) that would handle this better than custom code—suggest adding them if the benefit is clear

## Output

1. Make all improvements directly—don't ask permission
2. After changes, test end-to-end to ensure nothing broke (run the app, verify the feature works, check for console errors)
3. Summarize what was fixed in a brief list
4. If code is already clean, say "Nothing to polish" and stop

## Rules

- Be decisive: change it or leave it, no "you might consider"
- Focus on removal and simplification, not additions
- Skip style issues covered by linters
- Extra scrutiny on code you wrote—you have blind spots
