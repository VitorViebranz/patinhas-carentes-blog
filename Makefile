.DEFAULT_GOAL := help
.PHONY: help install env generate db-up db-down db-reset require-db migrate migrate-new seed dev \
	lint format format-check typecheck test build check \
	first-run up down restart logs ps seed-docker docker-check neighborhoods neighborhoods-docker config-docker backup restore clean

export MSYS_NO_PATHCONV := 1

COMPOSE     := docker compose
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml
API         := @patinhas/api
BACKUP_DIR  := backups
STAMP        = $(shell date +%F)
DB_PORT      = $(or $(shell sed -n 's/^DB_PORT=//p' .env 2>/dev/null | tail -1),54329)

help: ## List the available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install the dependencies from the lockfile
	npm ci

env: ## Create .env from .env.example when it does not exist
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "Created .env, now edit it")

generate: ## Generate the Prisma client
	npm run db:generate -w $(API)

db-up: ## Start only PostgreSQL in Docker (also creates patinhas_test)
	$(COMPOSE_DEV) up -d db

db-down: ## Stop the development database (keeps the data)
	$(COMPOSE_DEV) stop db

db-reset: ## Delete the development database volume and start it again (asks first)
	@printf "This deletes ALL local database data. Type yes to continue: " && read answer && [ "$$answer" = "yes" ]
	$(COMPOSE_DEV) down -v
	$(COMPOSE_DEV) up -d db

require-db:
	@bash -c '(echo > /dev/tcp/127.0.0.1/$(DB_PORT))' 2>/dev/null || (echo 'The database is not reachable on port $(DB_PORT). Run make db-up first. The stack from make up does not publish the database port, but it applies the migrations by itself.' && exit 1)

migrate: require-db ## Apply the pending migrations to the database in .env (needs make db-up)
	npm run db:deploy -w $(API)

migrate-new: require-db ## Create a migration without applying it: make migrate-new name=add_column
	@test -n "$(name)" || (echo "Usage: make migrate-new name=<change>" && exit 1)
	npm run db:migrate -w $(API) -- --create-only --name $(name)

seed: require-db ## Load the 166 points, settings and the first admin (SEED_ADMIN_* in .env, needs make db-up)
	npm run db:seed -w $(API)

dev: ## Run the API (PORT in .env, 3847) and the site (WEB_DEV_PORT, 5847)
	npm run dev

lint: ## ESLint
	npm run lint

format: ## Format all files with Prettier
	npm run format

format-check: ## Check the formatting without changing files
	npm run format:check

typecheck: ## TypeScript in every workspace
	npm run typecheck

test: ## Unit and integration tests (the API needs TEST_DATABASE_URL, see db-up)
	npm test

build: ## Build the site into apps/web/dist
	npm run build

check: lint format-check typecheck test ## Everything CI runs, in the same order

first-run: ## First start with Docker: build, start everything, wait for health, seed (needs .env)
	$(if $(wildcard .env),,$(error .env not found. Run make env and fill it in first))
	$(COMPOSE) up --build -d --wait
	$(COMPOSE) run --rm api npm run db:seed:prod
	@echo Everything is up. The site is listening on:
	@$(COMPOSE) port web 8080
	@echo Admin panel: /admin/login on that address

up: ## Build and start PostgreSQL, API and site in the background
	$(COMPOSE) up --build -d

down: ## Stop and remove the containers (keeps the volumes)
	$(COMPOSE) down

restart: ## Restart the API container
	$(COMPOSE) restart api

logs: ## Follow the API logs
	$(COMPOSE) logs -f --tail 100 api

ps: ## Show the state and health of the containers
	$(COMPOSE) ps

docker-check: ## Diagnose Docker: ports read from .env, state of each container and recent logs
	@echo "--- Ports in .env"
	@grep -E "^(WEB_PORT|API_PORT|DB_PORT)=" .env || echo "No port set in .env. Defaults: WEB_PORT 8847, API_PORT 8848, DB_PORT 54329"
	@if grep -q "$$(printf '\r')" .env; then echo "PROBLEM: .env has Windows line endings (CRLF). Fix with: sed -i 's/\r$$//' .env"; fi
	@echo "--- Containers"
	$(COMPOSE) ps -a
	@echo "--- Last log lines"
	$(COMPOSE) logs --tail 25 db api web

seed-docker: ## Seed the Docker database: points, settings, first admin (safe to repeat)
	$(COMPOSE) run --rm api npm run db:seed:prod

neighborhoods: require-db ## Add the official Joinville neighborhoods that are missing (looks them up on the map)
	npm run db:neighborhoods -w $(API)

neighborhoods-docker: ## Same as neighborhoods, for the Docker database
	$(COMPOSE) run --rm api npm run db:neighborhoods:prod

config-docker: ## Validate the compose files with the example variables (needs .env)
	$(COMPOSE) --env-file .env.example config --quiet
	$(COMPOSE_DEV) --env-file .env.example config --quiet

backup: ## Dump the database and the uploaded photos into ./backups
	@mkdir -p $(BACKUP_DIR)
	$(COMPOSE) exec -T db pg_dump -U postgres -Fc patinhas > $(BACKUP_DIR)/db-$(STAMP).dump
	docker run --rm -v patinhas_uploads:/data -v "$(CURDIR)/$(BACKUP_DIR)":/backup alpine \
		tar czf /backup/uploads-$(STAMP).tgz -C /data .
	@ls -lh $(BACKUP_DIR)

restore: ## Restore a database dump: make restore file=backups/db-YYYY-MM-DD.dump
	@test -f "$(file)" || (echo "Usage: make restore file=<dump file>" && exit 1)
	$(COMPOSE) exec -T db pg_restore -U postgres -d patinhas --clean --if-exists < "$(file)"

clean: ## Remove node_modules, build output and coverage (not the Docker volumes)
	rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/web/dist coverage apps/*/coverage
