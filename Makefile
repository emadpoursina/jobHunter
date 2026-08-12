.PHONY: hermes-up hermes-chat hermes-down hermes-logs

hermes-up:
	docker compose up -d

hermes-chat: hermes-up
	docker compose exec -it -w /workspace/jobHunter hermes-jobhunter /opt/hermes/.venv/bin/hermes --tui

hermes-down:
	docker compose down

hermes-logs:
	docker compose logs -f
