FROM node:22-slim AS frontend-builder

WORKDIR /frontend
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci
COPY src/frontend ./
RUN npm run build


FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 libffi-dev \
    shared-mime-info tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src/backend/pyproject.toml ./
COPY src/backend/app ./app
RUN pip install --no-cache-dir .

COPY src/backend/alembic ./alembic
COPY src/backend/alembic.ini ./alembic.ini
COPY compliance /compliance
COPY --from=frontend-builder /frontend/dist ./static
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
