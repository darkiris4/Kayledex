# Homeschool Recordkeeping Platform

Self-hosted, FOSS homeschool recordkeeping and reporting app. Full product spec: [`docs/Homeschool Recordkeeping Platform — Product Specification.md`](docs/Homeschool%20Recordkeeping%20Platform%20—%20Product%20Specification.md).

## Status

Early development. See `docker-compose.yml` for the two-service deployment shape (app + PostgreSQL) — no other infrastructure required.

## Running locally

```bash
cp .env.example .env
docker compose up -d --build
```

App will be available at `http://localhost:8080` (health check: `/api/health`).

## Layout

- `src/backend/` — FastAPI application
- `src/frontend/` — React/TypeScript frontend
- `compliance/US/<state>/` — sourced, versioned state compliance profiles
- `attachments/` — bind-mounted upload storage (not committed)
- `docker/` — Dockerfile (multi-stage: Node builds the frontend, Python serves both the API and the built frontend as static files)

## License

[GNU AGPL-3.0](LICENSE). If you modify this and run it as a network service, you're required to make your modified source available to its users.
