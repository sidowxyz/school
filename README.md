# School Management System

A web application for running a school: students, parents, teachers, classes and
timetables, attendance, exams of the academic year, fees and payments, reports, and
an AI assistant. It is one repository with two apps:

| Folder | What it is | Stack | Default URL |
|---|---|---|---|
| [`server/`](server/README.md) | REST API | Node.js, Express, MongoDB (Mongoose) | http://localhost:5000 (API under `/api`) |
| [`client/`](client/README.md) | Web app | React 19, TypeScript, Vite, Tailwind CSS | http://localhost:5173 |

The root `package.json` only holds helper scripts that start both apps together.

---

## Contents

1. [Quick start](#1-quick-start)
2. [Prerequisites](#2-prerequisites)
3. [Configuration (`.env` files)](#3-configuration-env-files)
4. [Running the project](#4-running-the-project)
5. [First login](#5-first-login)
6. [Project structure](#6-project-structure)
7. [Architecture](#7-architecture)
8. [Roles and access](#8-roles-and-access)
9. [Modules](#9-modules)
10. [Testing and quality checks](#10-testing-and-quality-checks)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Quick start

```bash
git clone https://github.com/sidowxyz/school.git
cd school

pnpm install                       # root helper (concurrently)
ppnpm install:all               # installs server/ and client/ dependencies

cp server/.env.example server/.env    # then edit server/.env (see section 3)
cp client/.env.example client/.env    # usually needs no changes

pnpm dev                       # starts API (5000) and web app (5173) together
```

Open http://localhost:5173 and sign in (see [First login](#5-first-login)).

On Windows PowerShell use `Copy-Item server/.env.example server/.env` instead of `cp`.

## 2. Prerequisites

- **Node.js 20 or newer** and **pnpm 10** (`npm install -g pnpm@10`; check with `node --version` and `pnpm --version`).
- **MongoDB** reachable from the server: a free MongoDB Atlas cluster or a local
  `mongod`. You need its connection string for `MONGODB_URI`.
- Git.

Nothing else is required. The AI assistant and SMS features are optional.

## 3. Configuration (`.env` files)

`.env` files are git-ignored. Never commit them.

### `server/.env`

Copy `server/.env.example` and fill in:

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no | API port, defaults to `5000` |
| `NODE_ENV` | no | `development`, `test` or `production` |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **yes** | Secret for short-lived access tokens (any long random string) |
| `JWT_REFRESH_SECRET` | **yes** | Secret for refresh tokens (a different long random string) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | production only | Creates the first admin when the database has none. In development they default to `admin@gmail.com` / `admin` |
| `AI_PROVIDER`, `GEMINI_API_KEY` | no | Turns on the AI narrative layer. Without a key the assistant still answers data questions |
| `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`, `EMAIL_FROM` | no | SMS and email messaging (the SMS gateway is currently a stub that only logs) |
| `LIBRARY_BORROW_DAYS`, `LIBRARY_FINE_RATE` | no | Reserved library settings |

Generate a secret quickly:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `client/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Where the web app calls the API. Defaults to `http://localhost:5000/api` |

## 4. Running the project

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the API and the web app together (colour-coded output) |
| `pnpm dev:server` | Runs only the API (`nodemon`, restarts on change) |
| `pnpm dev:client` | Runs only the web app (Vite dev server) |
| `ppnpm install:all` | Installs dependencies in `server/` and `client/` |

Stop everything with `Ctrl+C`.

The API allows requests from any `localhost` / `127.0.0.1` port in development, so
no CORS setup is needed locally. The Vite dev server also proxies `/uploads` to the
API so uploaded photos and documents display.

### Production build

```bash
# Web app: type-check and build static files into client/dist
pnpm --dir client build

# API
NODE_ENV=production pnpm --dir server start
```

Serve `client/dist` from any static host and point `VITE_API_BASE_URL` (set before
building) at the public API URL. In production `ADMIN_EMAIL` and `ADMIN_PASSWORD`
(at least 8 characters) must be set so a first admin can be created.

## 5. First login

On startup the server creates only what it cannot work without. **No demo data is
ever created**: classes, students, fees and everything else are entered through the
app.

- If the database has no admin, one is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- In development the defaults are **`admin@gmail.com`** / **`admin`**. Change the
  password after signing in.
- Teachers, parents and students get their accounts automatically when they are
  registered from their own pages. Admin creates staff accounts (principal,
  accountant, academic officer, admin) in **User Accounts**. The one-time
  temporary password is shown once, right after creating the account.

## 6. Project structure

```
.
├── package.json              Root scripts (dev, dev:server, dev:client, install:all)
├── setup.sh                  Legacy helper from when the two apps lived in separate repos
├── README.md                 This file
│
├── server/                   REST API
│   ├── src/
│   │   ├── server.js         App entry: middleware, route mounting, schedulers, listen
│   │   ├── config/           db.js (Mongo connection), access.js (roles and page access), aiConfig.js
│   │   ├── routes/           One file per resource, mounted under /api
│   │   ├── controllers/      Request handlers (thin: validate, call services/models, respond)
│   │   ├── services/         Business logic (invoices, payments, refunds, journal, timetable, ...)
│   │   ├── models/           Mongoose schemas
│   │   ├── validators/       Zod schemas for request bodies
│   │   ├── middleware/       authenticate, authorize, validate, auditLogger, errorHandler, upload
│   │   ├── reports/          Report registry and report definitions (academic, teacher, finance)
│   │   ├── ai/               AI assistant: orchestrator, matcher, tool registry, providers
│   │   ├── seed/bootstrap.js Startup bootstrap (first admin, required reference rows)
│   │   └── utils/            ApiResponse, AppError, tokens, PDFs, schedulers, helpers
│   ├── tests/                Jest tests (unit/ and database-backed suites)
│   ├── __tests__/            More Jest tests (integration/ drives the API with supertest)
│   ├── scripts/              One-off maintenance scripts (reset db, backfills, AI check)
│   ├── uploads/              Uploaded photos and student documents (served at /uploads)
│   ├── receipts/             Generated fee receipt PDFs
│   └── .env.example          Template for server/.env
│
└── client/                   Web app
    ├── index.html
    ├── vite.config.ts        Dev server, "@" alias to src/, /uploads proxy
    ├── tailwind.config.js    Theme tokens (colours, pastel tiles)
    ├── components.json       shadcn/ui configuration
    ├── public/               Static files (logo, login image)
    └── src/
        ├── main.tsx, App.tsx Entry and providers
        ├── router/index.tsx  All routes, with per-role module gating
        ├── features/         One folder per module (see section 9)
        │   └── <feature>/    api/ (axios calls), components/, pages/, types.ts
        ├── components/
        │   ├── ui/           Base components (button, card, dialog = right-side drawer, ...)
        │   ├── layout/       AppLayout, Sidebar, TopBar, student portal sidebar
        │   ├── shared/       StatStrip, tables, filter select
        │   └── common/       PageHeader, EmptyState, SuccessModal, ForbiddenPage, ...
        ├── hooks/            useAuth, usePermission, useDebounce, ...
        ├── store/            Zustand stores (auth, UI, academic year)
        ├── lib/              axios instance with token refresh, utils, chart theme
        ├── services/         Older API helpers (dashboard, finance, attendance, teaching log)
        └── context/, types/, utils/, test/
```

## 7. Architecture

**Request flow.** The web app calls the API through one axios instance
(`client/src/lib/axios.ts`) that attaches the access token and refreshes it when it
expires. On the server a request passes through:

```
helmet + CORS + rate limit  ->  authenticate (JWT)  ->  authorize (role / page access)
   ->  validate (Zod)  ->  controller  ->  service / model  ->  ApiResponse
```

Errors are thrown as `AppError` and formatted by `errorHandler`. Every successful
response has the shape `{ statusCode, data, message }`. The web app reads `data.data`.

**Authentication.** Login returns an access token and a refresh token (JWT). Deactivating
a user takes effect immediately because `authenticate` and login both check the
account status.

**Audit trail.** Administrative actions are recorded by the `auditLogger` middleware
and shown in **Audit Logs**.

**Database.** MongoDB through Mongoose. Fee money is stored as plain numbers and
mirrored into a double-entry ledger (`journalService`) so financial reports balance.

**Background jobs.** The server starts a backup scheduler and a monthly fee charge
scheduler on boot (see `server/src/utils`).

**AI assistant.** `server/src/ai` matches a question to a role-checked tool and runs a
database aggregation. An LLM key is optional and only phrases the result.

**Front-end design system.** Pages use shared pastel stat tiles (`StatStrip`,
`DashboardKit`), rounded cards and a right-side drawer for every add/edit form (the
shared `Dialog` renders as a drawer; pass `centered` for small confirmations).

## 8. Roles and access

Built-in roles: `admin`, `principal`, `academic_officer`, `teacher`, `accountant`,
`student`, `parent`.

- Server: each route is protected by `authorize(...)` with the allowed roles
  (`server/src/middleware/authorize.js`). Page access for **custom roles** is defined in
  `server/src/config/access.js` (modules, actions view/create/edit/delete, API paths).
- Client: the sidebar and routes are gated by `client/src/hooks/usePermission.ts`
  (`rolePermissions`). Admin has access to everything except modules that exist only
  for one role (the Teaching Log is teacher-only).
- Keep the client `rolePermissions` map and the server rules in step when you add a
  page.

| Role | Main areas |
|---|---|
| Admin | Everything: users, roles, settings, audit logs, all modules |
| Principal | Students, teachers, parents, attendance, reports, staff attendance |
| Academic officer | Academic structure, timetable, reports |
| Teacher | Own timetable, teaching log, attendance, own reports |
| Accountant | Fees and payments, discounts, finance reports |
| Student | Student portal (own profile, attendance, timetable, subjects, fees) |
| Parent | Parent portal (children's information and fees) |

## 9. Modules

| Module | Client folder | API prefix |
|---|---|---|
| Authentication | `features/auth` | `/api/auth` |
| Dashboards (per role) | `features/dashboard` | `/api/v1/analytics` |
| Students | `features/students` | `/api/students`, `/api/families` |
| Parents | `features/parents` | `/api/parents` |
| Teachers | `features/teachers` | `/api/teachers`, `/api/teacher-assignments`, `/api/staff` |
| Academic structure (years, terms, levels, classes, sections, subjects) | `features/academic-structure` | `/api/years`, `/api/terms`, `/api/classes`, ... |
| Timetable | `features/timetable` | `/api/timetable` |
| Student attendance | `features/attendance` | `/api/attendance` |
| Staff attendance | `features/teacher-attendance` | `/api/staff-attendance` |
| Teaching log and lesson coverage | `app/dashboard/teaching-log`, `components/teaching-log` | `/api/teaching-logs`, `/api/lesson-coverage` |
| Finance (fees, payments, receipts, refunds, scholarships, ledger) | `features/finance` | `/api/fees`, `/api/refunds`, `/api/ledger`, ... |
| Reports and analytics | `features/reports` | `/api/reports` |
| Student portal | `features/student-portal` | `/api/portal/student` |
| Parent portal | `features/parent-portal` | `/api/portal/parent` |
| User management | `features/users` | `/api/users` |
| Roles | `features/roles` | `/api/roles` |
| Settings (school profile, branding, calendar, discount policy) | `features/settings` | `/api/v1/settings` |
| Audit logs | `features/audit-logs` | `/api/audit-logs` |
| AI assistant | `features/ai-assistant` | `/api/ai` |

## 10. Testing and quality checks

```bash
# Server
pnpm --dir server test:unit          # fast, no database needed
pnpm --dir server test:integration   # needs MONGODB_URI (uses a separate SMS_Test database)
pnpm --dir server lint

# Client
pnpm --dir client test                    # Vitest
pnpm --dir client lint
pnpm --dir client build                   # tsc -b + vite build
```

Note: `client` `pnpm build` currently reports some older type errors in a few files
(see `client/AGENTS.md`). Check a failure against that baseline before assuming it is
yours.

Useful server scripts (run from `server/`):

| Script | Purpose |
|---|---|
| `pnpm bootstrap` | Run the startup bootstrap by hand |
| `pnpm db:reset` | Wipe the database (development only) |
| `pnpm check:ai` | List which AI models your key can use |
| `pnpm backfill:user-links` | Repair user to profile links |
| `pnpm backfill:student-class-sections` | Backfill student class and section data |

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `Port already in use` | Something is already on 5000 or 5173. Stop it or change `PORT` |
| Server exits on start with a Mongo error | Check `MONGODB_URI` and that your IP is allowed in Atlas |
| `JWT secret` / token errors | Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `server/.env` |
| Cannot sign in on a fresh database | Use the dev default `admin@gmail.com` / `admin`, or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` and restart |
| Browser shows CORS errors | Make sure the web app runs on a `localhost` port and `VITE_API_BASE_URL` points to the API |
| Uploaded images do not show | Check the API is running; the client proxies `/uploads` to port 5000 |
| `concurrently: command not found` | Run `pnpm install` in the repository root |
| Odd dependency errors | Delete `node_modules` in the failing folder and run `pnpm install` there |
