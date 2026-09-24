.PHONY: hermes-up hermes-chat hermes-down hermes-logs \
        jc-install jc-build jc-start jc-dev jc-stop

# ---------------------------------------------------------------------------
# Hermes agent (Docker)
# ---------------------------------------------------------------------------
hermes-up:
	docker compose up -d

hermes-chat: hermes-up
	docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes --tui

hermes-down:
	docker compose down

hermes-logs:
	docker compose logs -f

# ---------------------------------------------------------------------------
# job-collector (native Bun — no Docker)
# ---------------------------------------------------------------------------
JC_DIR := tools/job-collector

jc-install:
	cd $(JC_DIR) && bun install

jc-build: jc-install
	cd $(JC_DIR) && bun run build

# Production: single process serves API + built UI on http://localhost:3061
jc-start: jc-build
	cd $(JC_DIR) && bun run start

# Dev: API on :3061 + Vite on :5173 (hot reload)
jc-dev: jc-install
	cd $(JC_DIR) && bun run dev

# Stop the native server (frees port 3061)
jc-stop:
	-@lsof -nP -tiTCP:3061 -sTCP:LISTEN | xargs kill 2>/dev/null || true
