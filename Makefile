.PHONY: dev backend frontend stop clean

dev: stop
	@sleep 0.5
	@$(MAKE) -j2 backend frontend

backend:
	@cd backend && uv run fastapi dev src/backend/main.py &

frontend:
	@cd frontend && bun run dev &

stop:
	@-lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	@-lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@-pkill -f "fastapi dev" 2>/dev/null || true
	@-pkill -f "next dev" 2>/dev/null || true
	@echo "Services stopped"

clean: stop
	@rm -rf backend/.venv frontend/node_modules frontend/.next
	@echo "Cleaned build artifacts"

lint:
	@cd backend && uv run ruff check --fix src && uv run ruff format src
	@cd frontend && bun install --silent && bun run lint && bun run format

docker:
	@docker compose up --build -d
	@docker compose exec ollama ollama pull llama3.2

docker-stop:
	@docker compose down
