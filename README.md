
# Task Manager — Full-Stack (Node.js + PostgreSQL + React/TS)

A production-minded MVP: **Signup → Email Verify → Login**, JWT in **HttpOnly** cookie with **Double-Submit CSRF**, **lockout** after 3 failed attempts (2 min), **rate-limit**, user-scoped **Tasks CRUD**, **pagination/search/sort**, and a **Dev Mailbox** for viewing verification codes.

> Stack: **Node 20 + Express + Prisma + PostgreSQL** and **React + Vite + TypeScript + TanStack Query**.
> **Run mode:** **Docker only** (simpler, consistent, no local env drift).

---

##  Quick Start (Docker only)

### 1) Requirements

* Docker & Docker Compose

### 2) Start the stack

```bash
# from repo root
docker compose up --build -d
```

### 3) URLs

* **Frontend (Vite)**: [http://localhost:5173](http://localhost:5173)
* **Server API**: [http://localhost:3000/api](http://localhost:3000/api)
* **Dev Mailbox (verification codes)**

  * HTML view: `http://localhost:3000/dev/mailbox`
  * JSON API (filter by email): `http://localhost:3000/api/dev/mailbox?to=<email>`

### 4) Stop / Clean

```bash
docker compose down
# (optional) also remove volumes/images if needed:
# docker compose down -v --rmi local
```

> **Why Docker-only?** We intentionally removed local `npm run dev` paths to avoid Node/ESM/CORS/env drift across machines. Docker guarantees the same behavior graders will see.

---

##  Environment

Compose provides sane defaults. If you need to override:

**server/.env**

```
DATABASE_URL="postgresql://postgres:postgres@db:5432/taskdb?schema=public"
JWT_SECRET="ASDASD2E123123123123123123QASDASD"
CSRF_SECRET="ASDASD2E123123123123123123QASDASD"
CORS_ORIGIN="http://localhost:5173"
PORT=3000
NODE_ENV=production
```

**client/.env**

```
VITE_API_URL="http://localhost:3000/api"
```

> In Compose, the DB host is the service name `db`, not `localhost`.

---

##  Integration Tests (End-to-End)

The scripts perform:

1. **Signup** → 2) read **verification code** from Dev Mailbox → 3) **Verify** →
2. **Login** (keeps cookies & CSRF) → 5) `GET /auth/me` →
3. **Create task** → 7) **List tasks** → 8) **Logout**.

### Windows (PowerShell — recommended)

```powershell
# from repo root
powershell -ExecutionPolicy Bypass -File tests/integration/run_tests.ps1
```

### Linux/macOS/WSL (bash)

```bash
chmod +x tests/integration/run_tests.sh
./tests/integration/run_tests.sh
```

**Notes**

* Tests expect the server at `http://localhost:3000` and the Dev Mailbox at `/dev/mailbox`.
* Scripts preserve cookies and send the `x-csrf-token` header for POST/PUT/DELETE.
* The PowerShell script includes short retries to allow the mailbox record to appear.

---

##  Auth & Security

* **Signup** creates a 6-digit **verification code** (TTL ~15m) stored **hashed** and surfaced in the **Dev Mailbox**.
* **Verify** marks `emailVerifiedAt` and unlocks login.
* **Login**

  * **Lockout** after **3** failed attempts for **2 minutes**.
  * **Rate-limit** on `/auth/login` (10 req/min/IP).
  * **IP Allow-List (bonus)**: if enabled, denies login for non-listed IPs (seed adds `127.0.0.1`).
* **Session**

  * JWT in **HttpOnly** cookie.
  * **Double-Submit CSRF**: client sends `x-csrf-token` matching the CSRF cookie for mutating requests.

---

##  API (Selected)

**Auth**

* `POST /api/auth/signup` `{ email, password }`
* `POST /api/auth/verify` `{ email, code }`
* `POST /api/auth/login` `{ email, password }`
* `POST /api/auth/logout`
* `GET  /api/auth/me`

**Tasks (requires auth)**

* `GET  /api/tasks?page=1&pageSize=10&search=&sort=createdAt:desc`
* `POST /api/tasks` `{ title, description?, dueDate?, done? }`
* `GET  /api/tasks/:id`
* `PUT  /api/tasks/:id`
* `DELETE /api/tasks/:id`

**Dev Mailbox**

* `GET /dev/mailbox` (HTML)
* `GET /api/dev/mailbox?to=<email>` (JSON)

**Admin (bonus)**

* `GET    /api/admin/ip-allowlist`
* `POST   /api/admin/ip-allowlist` `{ ip, label? }`
* `DELETE /api/admin/ip-allowlist/:id`

---

##  Data Model (Prisma)

* **User**: `id, email, emailVerifiedAt, passwordHash, failedLoginCount, lockoutUntil, createdAt, updatedAt`
* **VerificationCode**: `id, userId, codeHash, expiresAt, createdAt`
* **Task**: `id, userId, title, description, dueDate, done, createdAt, updatedAt`
* **IpAllowList (bonus)**: `id, ip (unique), label?, isActive, createdAt, updatedAt`

---

##  Frontend

* React + Vite + TypeScript
* **TanStack Query** for fetching/cache/invalidations & robust loading/error states
* Forms validated with **zod**, user feedback with **react-hot-toast**
* **Protected routes**: `/tasks` requires a valid session; unverified users are redirected to Verify

**Why TanStack Query for state?**
It gives us request-level caching, automatic background refetch, mutation helpers, and error/loading handling out of the box—ideal for CRUD + auth where the server is source-of-truth. It also keeps UI state lean and predictable.

---

##  Architecture Overview

**Client** (Vite) ←→ **API** (Express) ←→ **Prisma** ←→ **PostgreSQL**

* **Auth**: email/password → verification code → login → JWT (HttpOnly) + CSRF cookie
* **Tasks**: user-scoped CRUD; list endpoint supports pagination, search, sort
* **Dev Mailbox**: simple outbox table + HTML/JSON views for verification codes
* **Security**: bcrypt password hashing, lockout, rate-limit, CSRF, CORS, input validation

---

##  HAAT Task Checklist

**Core user stories**

* ✅ Signup + Email Verification (short-lived code, hashed)
* ✅ Login with lockout & rate limiting
* ✅ User-scoped Tasks CRUD (incl. get by id / get all)
* ✅ Pagination / search / sort
* ✅ Friendly UI with validation & toasts

**Frontend**

* ✅ React + TypeScript
* ✅ TanStack Query (caching/invalidations)
* ✅ Full auth flow + protected routes
* ✅ Persisted session (HttpOnly + CSRF)
* ✅ Clear error/success messages and edge-states

**Backend**

* ✅ Node + Express + PostgreSQL (Prisma)
* ✅ Email verification via local outbox (Dev Mailbox)
* ✅ JWT + CSRF (double-submit)
* ✅ Lockout & rate-limit
* ✅ IP Allow-List (bonus)

**Dev Experience**

* ✅ Single-command Docker bring-up
* ✅ End-to-end integration tests (PowerShell & bash)
* ✅ Lint/format & typed code (TS)

---

##  Requirements Coverage (HAAT ✅/❌)

> **Legend:** ✅ done · ❌ bonus/not required (unless your grader marks it required)

### 1) Authentication & Users

| Item                                            | Status | Notes                                      |
| ----------------------------------------------- | :----: | ------------------------------------------ |
| Signup (email + password)                       |    ✅   | `POST /api/auth/signup`                    |
| Email verification (6-digit code, TTL, hashed)  |    ✅   | Code stored hashed; visible in Dev Mailbox |
| Verify endpoint                                 |    ✅   | `POST /api/auth/verify`                    |
| Login (JWT session)                             |    ✅   | HttpOnly cookie + CSRF cookie              |
| Logout                                          |    ✅   | `POST /api/auth/logout`                    |
| Get current user                                |    ✅   | `GET /api/auth/me`                         |
| Password hashing (bcrypt)                       |    ✅   | Server side                                |
| Account lockout after 3 failed attempts (2 min) |    ✅   | Stored per user                            |
| Rate limiting on `/auth/login`                  |    ✅   | 10 req/min/IP                              |
| IP allow-list                                   |    ✅   | **Bonus**; seeded with `127.0.0.1`         |

### 2) Tasks (User-Scoped CRUD)

| Item                                 | Status | Notes                     |       |
| ------------------------------------ | :----: | ------------------------- | ----- |
| Create / Update / Delete / Get by id |    ✅   | Auth required             |       |
| List with pagination                 |    ✅   | `page`, `pageSize`        |       |
| Search & sort                        |    ✅   | `search`, `sort=field:asc | desc` |
| Ownership scoping                    |    ✅   | Enforced by `userId`      |       |

### 3) Security

| Item                   | Status | Notes                   |
| ---------------------- | :----: | ----------------------- |
| JWT in HttpOnly cookie |    ✅   | Access token cookie     |
| Double-Submit CSRF     |    ✅   | `x-csrf-token` header   |
| CORS for client origin |    ✅   | `http://localhost:5173` |
| Input validation (zod) |    ✅   | Server & client         |

### 4) Frontend (React + TS)

| Item                            | Status | Notes                      |
| ------------------------------- | :----: | -------------------------- |
| React + Vite + TypeScript       |    ✅   | Client app                 |
| TanStack Query                  |    ✅   | Tasks & auth               |
| Protected routes                |    ✅   | Redirect unauth/unverified |
| UX states (loading/empty/error) |    ✅   | In TasksPage               |
| Form validation & toasts        |    ✅   | zod + react-hot-toast      |

### 5) Dev Experience

| Item                                | Status | Notes                                  |
| ----------------------------------- | :----: | -------------------------------------- |
| Docker Compose one-command bring-up |    ✅   | `docker compose up -d`                 |
| Local `npm run dev` path            |    ❌   | Deliberately removed (Docker-only)     |
| Prisma migrations auto in Docker    |    ✅   | On server start                        |
| Dev Mailbox (HTML + JSON)           |    ✅   | `/dev/mailbox`, `/api/dev/mailbox?to=` |

### 6) Testing & CI/CD

| Item                              | Status | Notes                             |
| --------------------------------- | :----: | --------------------------------- |
| E2E test (PowerShell)             |    ✅   | `tests/integration/run_tests.ps1` |
| E2E test (bash)                   |    ✅   | `tests/integration/run_tests.sh`  |
| Unit tests (backend)              |    ❌   | Bonus                             |
| Unit/UI tests (frontend)          |    ❌   | Bonus                             |
| CI pipeline (GitHub Actions)      |    ❌   | Bonus                             |
| Hosted deployment (server/client) |    ❌   | Bonus                             |
