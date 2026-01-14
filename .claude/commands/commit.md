# Commit

Create a clean commit for the changes in this session.

## Process

1. Run `git status` and `git diff` to see all changes
2. Run `git log --oneline -5` to understand recent commit style
3. Stage all relevant changes (exclude unrelated files if any)
4. Write a commit message following these rules:
   - Imperative mood: Add, Fix, Update, Remove
   - Summarize the "why" not the "what"
   - One line, concise, no period at end
   - No Co-Authored-By trailer
5. Run `make lint` before committing—fix any issues
6. Create the commit
7. Show the final commit with `git show --stat`

## Rules

- Do not push unless explicitly asked
- Do not amend existing commits unless explicitly asked
- If there are unrelated changes, ask which to include
- If lint fails, fix issues and retry
