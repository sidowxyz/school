# School Management: Web App (`client/`)

Single-page app built with **React 19, TypeScript, Vite and Tailwind CSS**, using
shadcn/ui-style components on Radix primitives. It talks to the REST API in
[`../server`](../server/README.md).

> This is **not** a Next.js project. There is no `next` dependency. Some
> `src/app/dashboard/teaching-log` folders use Next-style names (`page.tsx`, `[id]/`)
> but are ordinary react-router pages. See [AGENTS.md](AGENTS.md).

## Run it

```bash
cd client
npm install
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:5000/api
npm run dev               # http://localhost:5173
```

The API must be running too. From the repository root, `npm run dev` starts both.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run). `npm run test:watch` for watch mode |

`npm run build` has some older type errors in a few files (library, student profile).
Check any failure against that baseline.

## Environment

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL. Default `http://localhost:5000/api`. Read at build time |

## Folder structure

```
client/
├── public/                    Static files (logo.png, Images/ for the login page)
├── index.html
├── vite.config.ts             "@" alias -> src/, /uploads proxy -> localhost:5000
├── tailwind.config.js         Colours and the pastel "tile" tokens
├── components.json            shadcn/ui config
└── src/
    ├── main.tsx / App.tsx     Entry, providers, toaster
    ├── router/index.tsx       Every route; moduleGated() applies per-role access
    ├── index.css              CSS variables (light/dark theme, --tile-* colours)
    ├── features/<name>/       One folder per module
    │   ├── api/               Functions that call the API (axios)
    │   ├── components/        Module-specific components
    │   ├── pages/             Route-level pages
    │   └── types.ts           TypeScript types for the module
    ├── components/
    │   ├── ui/                Base components: button, card, input, dialog, sheet, table, ...
    │   ├── layout/            AppLayout, Sidebar, TopBar, StudentPortalSidebar
    │   ├── shared/            StatStrip (pastel stat tiles), table helpers, FilterSelect
    │   ├── common/            PageHeader, EmptyState, ForbiddenPage, SuccessModal, ...
    │   └── teaching-log/      Teaching log UI shared by the teacher pages
    ├── app/dashboard/teaching-log/   Teaching log pages (routed from router/index.tsx)
    ├── hooks/                 useAuth, usePermission, useDebounce, useSortableTable, ...
    ├── store/                 Zustand: authStore, uiStore, academicYearStore
    ├── lib/                   axios.ts (token + refresh), utils.ts (cn), chartTheme.ts
    ├── services/              Older API helpers (dashboard, finance, attendance, reports)
    └── context/, types/, utils/, test/
```

### Features

`academic-structure`, `ai-assistant`, `attendance`, `audit-logs`, `auth`, `dashboard`,
`finance`, `parent-portal`, `parents`, `reports`, `roles`, `settings`,
`student-portal`, `students`, `teacher-attendance`, `teachers`, `timetable`, `users`.

## How things work

- **Routing and access.** `router/index.tsx` wraps routes in `moduleGated('<module>', [...])`.
  `hooks/usePermission.ts` holds `rolePermissions` (role to modules). The sidebar uses
  the same map, so a page a role cannot open is also not shown. Modules that belong
  to one role only (the Teaching Log) are hidden from admin.
- **API calls.** Use the instance from `lib/axios.ts`. It adds the bearer token and
  refreshes it on `401`. API responses look like `{ statusCode, data, message }`, so
  feature `api/` files return `response.data.data`.
- **Auth state.** `store/authStore.ts` keeps the token and user (`id`, `name`, `role`).
  `hooks/useAuth` is the way components read it.
- **Forms open in a right-side drawer.** `components/ui/dialog.tsx` renders every
  `DialogContent` as a full-height drawer from the right. For a small confirmation that
  should stay in the centre, pass `centered`.
- **Design tokens.** Pastel tile colours are CSS variables (`--tile-green`, `--tile-blue`,
  ...) used as `bg-tile-green text-tile-foreground`. Build stat rows with
  `components/shared/StatStrip` or the dashboard kit in
  `features/dashboard/components/DashboardKit.tsx` (`KpiTile`, `Panel`, `DonutBreakdown`).
- **Charts** use Recharts; theme colours come from CSS variables.

## Adding a page

1. Create `src/features/<name>/` with `api/`, `pages/`, `types.ts`.
2. Add the route in `router/index.tsx` inside `moduleGated('<module>', [...])`.
3. Add the module to `rolePermissions` in `hooks/usePermission.ts` for the roles that may open it.
4. Add a link in `components/layout/Sidebar.tsx`.
5. Protect the matching API routes on the server with `authorize(...)`.
