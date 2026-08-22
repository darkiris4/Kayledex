# Kayledex

<p align="center">
  <img src="docs/branding/kayledex.jpeg" alt="Kayledex" width="720">
</p>

Self-hosted, open-source homeschool recordkeeping and academic management platform. Kayledex is built around one idea: **recording a normal homeschool day should take seconds**, while the reports it produces should look professional enough to hand to a state office, umbrella school, or co-op. Full product spec: [`docs/Homeschool Recordkeeping Platform — Product Specification.md`](docs/Homeschool%20Recordkeeping%20Platform%20—%20Product%20Specification.md).

## Features

- **Quick daily logging** — record a subject, activity, and duration in seconds, with or without an attached curriculum; past days remain fully editable
- **Multiple students, school years, and subjects** — flexible enough for mixed curricula, self-created lessons, field trips, and informal instruction
- **Courses, curricula, and lessons** with progress tracking — curriculum is entirely optional per activity
- **Grades and assessments**, with a configurable grading scale and weighted categories
- **Attendance tracking** by instructional days and/or hours — configurable per school year, not hard-coded to any one state's rules
- **State compliance profiles** (Illinois shipped; more contributable under `compliance/US/<state>/`, each sourced and versioned) — a State Requirements page shows what's satisfied and what isn't
- **File attachments** on activities and assessments (photos of worksheets, scanned assignments, PDFs)
- **PDF and CSV reports** — attendance, subject activity, academic report card, curriculum progress, daily activity log — each PDF branded with your own logo or the Kayledex mark by default (configurable in Settings)
- **Calendar** view of the school year, with per-day status (instructional, holiday, sick, field trip, etc.)
- **Light/dark theme** with a few accent-color and background presets
- **Data export and backup** — a one-click full backup (ZIP: every record plus the real attachment files) or JSON/CSV data-only exports from Settings, plus a `pg_dump`-based whole-server backup/restore script pair for disaster recovery (see [Backup & Restore](#backup--restore) below)
- Runs entirely offline: no cloud account, no external APIs, no telemetry — your data stays in your own PostgreSQL database

## Status

Early development, but the core loop works end-to-end for a single family: log a day, track curriculum and grades, check compliance, generate a report, back it up. Not yet built: global search, re-importing a JSON/CSV export back into the app, transcripts, portfolio reports, and multi-family/authenticated deployments — see the spec's MVP and Post-MVP sections (§42–43) for the full roadmap.

## Running it

Every push to `main` is scanned, tested, and published as a container image to
`ghcr.io/darkiris4/kayledex`. Pull the built image:

```bash
cp .env.example .env
docker compose up -d
```

Or build from source instead (useful when developing against local changes):

```bash
cp .env.example .env
docker compose up -d --build
```

App will be available at `http://localhost:8080` (health check: `/api/health`).

## Backup & Restore

**From the app (Settings → Data)**: a per-family "Full Backup" ZIP (structured data plus the real attachment files), or data-only JSON/CSV if you don't need the attachments.

**Whole-server backup** (every family, via `pg_dump` — recommended for actual disaster recovery):

```bash
scripts/backup.sh                    # writes ./backups/homeschool-backup-<timestamp>.tar.gz
scripts/restore.sh ./backups/homeschool-backup-<timestamp>.tar.gz
```

`restore.sh` is destructive — it stops the app, drops and recreates the database, and replaces the `attachments/` directory, before restoring from the archive. It asks for confirmation first.

## Layout

- `src/backend/` — FastAPI application
- `src/frontend/` — React/TypeScript frontend
- `compliance/US/<state>/` — sourced, versioned state compliance profiles
- `docs/branding/` — logo source art
- `attachments/` — bind-mounted upload storage (not committed)
- `docker/` — Dockerfile (multi-stage: Node builds the frontend, Python serves both the API and the built frontend as static files)
- `scripts/` — `backup.sh` / `restore.sh`

## License

[GNU AGPL-3.0](LICENSE). If you modify this and run it as a network service, you're required to make your modified source available to its users.
