# Сборка фронтенда (Vite + React)
FROM node:20-alpine AS frontend-build
WORKDIR /src
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Backend + статика SPA
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/static/frontend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend-build /src/dist ./static/frontend

EXPOSE 8000

CMD ["sh", "-c", "gunicorn -w 2 -b 0.0.0.0:${PORT:-8000} wsgi:app"]
