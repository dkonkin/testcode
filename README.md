# Каталог баз отдыха Башкортостана

Монорепозиторий: **backend** (Python, Flask, JWT) и **frontend** (React, TypeScript, Vite).

**База данных:** по умолчанию локально используется **SQLite** (`backend/bases.db`). Для production рекомендуется **PostgreSQL в Supabase** — задайте **`DATABASE_URL`** (или **`SUPABASE_DB_URL`**) со строкой подключения из панели Supabase.

## Роли

| Роль        | Возможности |
|------------|-------------|
| **user**   | Просмотр каталога, фильтры, карта |
| **admin**  | То же + **админ-панель** с формой добавления баз (`POST /api/bases`) |

При первом запуске backend создаётся два пользователя (если таблица `users` пуста):

- `admin` / `admin` — администратор  
- `user` / `user` — только просмотр  

Задайте в production переменные **`ADMIN_PASSWORD`**, **`USER_PASSWORD`**, **`JWT_SECRET`**.

## Структура

```
backend/
  app.py          # API, модели User + базы отдыха, раздача SPA при FRONTEND_DIST
  wsgi.py         # gunicorn
  bases.json      # начальные данные (импорт при пустой БД)
  requirements.txt
frontend/
  src/            # React-приложение, маршруты /, /login, /admin
  package.json
Dockerfile        # сборка frontend + backend в один образ
```

## API (кратко)

- `POST /api/auth/login` — `{ "username", "password" }` → `{ access_token, role, username }`
- `GET /api/auth/me` — заголовок `Authorization: Bearer <token>`
- `GET /api/bases` — список баз (без авторизации)
- `POST /api/bases` — добавление базы (**только admin**, JWT обязателен)

## Supabase (PostgreSQL)

1. Создайте проект на [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI**  
   - Для деплоя на Railway / serverless удобен **Transaction pooler** (порт **6543**).  
   - Скопируйте URI и подставьте пароль БД.
3. В переменных окружения backend задайте одну из переменных:
   - **`DATABASE_URL`** — предпочтительно;  
   - или **`SUPABASE_DB_URL`** — то же значение.
4. Строка может начинаться с `postgres://` или `postgresql://` — приложение приведёт её к драйверу **`pg8000`** (чистый Python, без Visual C++ и без `psycopg2`) и при необходимости добавит `sslmode=require` для хостов Supabase.
5. При первом запуске **`db.create_all()`** создаст таблицы `users` и `bases`; затем выполнятся сиды (пользователи `admin`/`user` и импорт из `bases.json`, если таблицы пустые).

Пример см. в `backend/.env.example`.

**Важно:** URL вида `https://xxx.supabase.co` и ключ **`sb_publishable_...` (anon / publishable)** — это **не** пароль PostgreSQL. Для Flask + SQLAlchemy нужен **`Database password`** из *Settings → Database* (или полный **`DATABASE_URL`**). В репозитории можно задать в `backend/.env`: **`SUPABASE_URL`**, **`SUPABASE_ANON_KEY`** (опционально), **`SUPABASE_DB_PASSWORD`** — приложение само соберёт строку `postgresql://...@db.<ref>.supabase.co:5432/postgres` (см. `app.py`). Файл `.env` в `.gitignore`, не коммитьте пароли.

Проверка: `GET /api/health` вернёт `"database": "postgres"` при подключении к PostgreSQL.

### Windows, Python 3.14 и ошибка «Microsoft Visual C++»

Раньше использовался **`psycopg2-binary`**, для которого под новые версии Python часто нет готового wheel — pip пытается собрать из исходников и требует MSVC. Сейчас в зависимостях **`pg8000`** (pure Python), отдельный компилятор не нужен.

## Локальная разработка

### Backend

```powershell
cd backend
python -m pip install -r requirements.txt
# опционально: $env:DATABASE_URL="postgresql://..."
python app.py
```

Без **`DATABASE_URL`** используется SQLite в каталоге `backend`.  
API: `http://127.0.0.1:8000`  
CORS по умолчанию: `http://localhost:5173`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Приложение: `http://localhost:5173` — запросы к `/api` проксируются на порт 8000 (см. `vite.config.ts`).

Для production-сборки с отдельным URL API задайте `VITE_API_URL` (например `https://api.example.com`).

## Docker (полный стек одним образом)

```powershell
docker build -t bash-bases .
docker run --rm -p 8000:8000 -e DATABASE_URL="postgresql://..." -e JWT_SECRET="..." bash-bases
```

Откройте `http://localhost:8000` — статика React и API на одном хосте (`FRONTEND_DIST` задаётся в образе).

## Railway

1. Подключите репозиторий, выберите **Dockerfile** в корне.  
2. Задайте **`DATABASE_URL`** из Supabase (или встроенный Postgres Railway — тогда URI от Railway).  
3. Задайте **`JWT_SECRET`**, **`ADMIN_PASSWORD`**, **`USER_PASSWORD`**.  
4. При необходимости расширьте **`CORS_ORIGINS`** (если фронт вынесен на другой домен).

## Старый монолит

Файлы `index.html` / `script.js` / `server.py` в корне удалены; логика перенесена в `frontend/` и `backend/`.
