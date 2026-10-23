# School Management: API (`server/`)

REST API built with **Node.js (ES modules), Express and MongoDB (Mongoose)**. All
endpoints are under `/api`. The web app that uses it is in [`../client`](../client/README.md).

## Run it

```bash
cd server
pnpm install
cp .env.example .env      # fill in MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
pnpm dev               # nodemon on http://localhost:5000
```

| Script | What it does |
|---|---|
| `pnpm dev` | Start with auto-restart (nodemon) |
| `pnpm start` | Start once (production) |
| `pnpm lint` | ESLint on `src/` |
| `pnpm test` | All Jest tests |
| `ppnpm test:unit` | Fast tests, no database |
| `ppnpm test:integration` | API tests against MongoDB (database `SMS_Test`) |
| `pnpm bootstrap` | Run the startup bootstrap by hand |
| `pnpm db:reset` | Wipe the database. **Development only** |
| `pnpm check:ai` | List the AI models your key can use |
| `pnpm backfill:user-links` | Repair user to profile links |
| `pnpm backfill:student-class-sections` | Backfill student class and section data |

## Environment (`server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no | Default `5000` |
| `NODE_ENV` | no | `development`, `test`, `production` |
| `MONGODB_URI` | **yes** | MongoDB connection string |
| `JWT_ACCESS_SECRET` | **yes** | Signs access tokens |
| `JWT_REFRESH_SECRET` | **yes** | Signs refresh tokens |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | production | First admin when none exists. Dev defaults: `admin@gmail.com` / `admin` |
| `AI_PROVIDER`, `GEMINI_API_KEY` | no | Optional AI narrative layer. Other `AI_*` limits are listed in `.env.example` |
| `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`, `EMAIL_FROM` | no | Messaging (SMS gateway is a stub that logs) |
| `LIBRARY_BORROW_DAYS`, `LIBRARY_FINE_RATE` | no | Reserved library settings |

On startup the server connects to MongoDB, runs `seed/bootstrap.js` (drops stale
indexes, ensures the "All Fees" category, creates the first admin if there is none) and
starts the backup and monthly-fee schedulers. **No demo data is ever created.**

## Structure

```
server/
├── src/
│   ├── server.js            Entry: security middleware, CORS, rate limit, routes, schedulers
│   ├── config/
│   │   ├── db.js            Mongo connection
│   │   ├── access.js        Roles and page-access map for custom roles
│   │   └── aiConfig.js      AI provider settings
│   ├── routes/              One file per resource; mounted in server.js
│   ├── controllers/         Request handlers
│   ├── services/            Business logic (invoices, payments, refunds, journal, timetable, ...)
│   ├── models/              Mongoose schemas (User, Student, Teacher, Class, StudentInvoice, ...)
│   ├── validators/          Zod request schemas
│   ├── middleware/          authenticate, authorize, validate, auditLogger, errorHandler, upload
│   ├── reports/             registry.js + academic / teacher / finance report definitions
│   ├── ai/                  AI assistant (orchestrator, matcher, tool registry, providers)
│   ├── seed/bootstrap.js    Startup bootstrap
│   └── utils/               ApiResponse, AppError, token service, PDF generator, schedulers
├── tests/                   Jest: unit/ (no DB) and database-backed suites
├── __tests__/               Jest: integration/ (supertest against the app)
├── scripts/                 Maintenance scripts
├── uploads/                 Uploaded photos and student documents (served at /uploads)
└── receipts/                Generated fee receipt PDFs
```

## How a request is handled

```
helmet + CORS + rate limit -> authenticate (JWT) -> authorize(roles / page access)
  -> validate (Zod) -> controller -> service / model -> ApiResponse
```

- Success responses: `{ statusCode, data, message }`.
- Errors: throw `new AppError(message, status)`; `errorHandler` formats them.
- `authenticate` rejects deactivated accounts immediately.
- `auditLogger` records administrative actions (shown in the Audit Logs page).
- CORS: any `localhost` / `127.0.0.1` port is allowed in development; production origins
  are listed explicitly in `server.js`.

## Authentication

Send `Authorization: Bearer <accessToken>` on every request except login and password
reset. `POST /api/auth/login` returns an access token and a refresh token. The client
refreshes automatically when the access token expires.

## Route map

| Prefix | Purpose |
|---|---|
| `/api/auth` | Login, refresh, password reset, current user |
| `/api/users` | Account management (admin only) |
| `/api/roles` | Roles and page access |
| `/api/students`, `/api/families`, `/api/parents` | Students, families and parents |
| `/api/teachers`, `/api/teacher-assignments`, `/api/assignments`, `/api/staff` | Teachers and staff |
| `/api/years`, `/api/terms`, `/api/levels`, `/api/periods`, `/api/classes`, `/api/sections`, `/api/subjects`, `/api/course-classes`, `/api/syllabus` | Academic structure |
| `/api/timetable` | Timetable |
| `/api/attendance`, `/api/staff-attendance` | Attendance |
| `/api/teaching-logs`, `/api/lesson-coverage`, `/api/lesson-coverage-reports` | Teaching logs |
| `/api/fees` and other finance routes under `/api` | Fee types, structures, invoices, payments, scholarships, discounts |
| `/api/refunds`, `/api/ledger`, `/api/chart-of-accounts`, `/api/fiscal-periods`, `/api/journal-entries`, `/api/expenses`, `/api/fixed-assets`, `/api/financial-reports` | Accounting |
| `/api/reports` | Role-filtered report catalogue, run and export (PDF / Excel) |
| `/api/portal/student`, `/api/portal/parent` | Self-service portals |
| `/api/v1/analytics` | Dashboard and analytics aggregates |
| `/api/v1/settings` | School profile, branding, calendar, discount rule |
| `/api/audit-logs` | Audit trail |
| `/api/ai` | AI assistant |
| `/uploads/*` | Static uploaded files |

## Roles

Built-in roles: `admin`, `principal`, `academic_officer`, `teacher`, `accountant`,
`student`, `parent`. Routes use `authorize('admin', ...)`. Custom roles created on the
Roles page are checked against `config/access.js` (module, action view/create/edit/delete,
API path). User accounts, roles and settings stay admin-only so a custom role can never
grant itself more access. Keep this in step with `client/src/hooks/usePermission.ts`.

## Reports

Reports are defined once in `src/reports` (`report(group, id, title, description,
filters, run)`), registered by department in `registry.js`, and gated by role. Every
report returns the same shape (`columns`, `rows`, `summary`, optional `chart`), so one
viewer and one exporter serve them all. To add one, define it in the matching file and
list its roles in the registry.

## Testing

```bash
ppnpm test:unit          # no database
ppnpm test:integration   # requires MONGODB_URI; uses a separate "SMS_Test" database
```

Integration tests need a reachable MongoDB. Unit tests never open a connection.

## Adding an endpoint

1. Add a Zod schema in `validators/`.
2. Add the controller (and a service if there is real logic) in `controllers/` and `services/`.
3. Add the route file in `routes/` with `authenticate` and `authorize(...)`.
4. Mount it in `server.js`.
5. Add an integration test in `__tests__/integration/`.
