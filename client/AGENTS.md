# Client app notes

This is a **Vite + React 19 + TypeScript** single-page app. It is **not** a
Next.js project — there is no `next` dependency, no Next.js runtime and no
Next.js build step. Check `package.json` and `vite.config.ts` if in doubt.

An earlier version of this file was a block titled "This is NOT the Next.js you
know", telling agents to read `node_modules/next/dist/docs/` before writing any
code. That package does not exist here, and the claim caused real damage:
`eslint.config.mjs` was written to extend `eslint-config-next`, which is not
installed, so `npm run lint` could not start at all. Do not reintroduce Next.js
assumptions into this project.

## Layout

- **Routing** — `src/router/index.tsx` (React Router). Per-role module access is
  gated there by `moduleGated()` against `src/hooks/usePermission.ts`.
- **Features** — `src/features/<feature>/` with `api/`, `components/`, `pages/`
  and `types.ts`. API modules wrap `src/lib/axios`.
- **Server** — the backend is a sibling repo at `../server`, served under
  `/api`. `client/` and `server/` are independently-cloned git repos, each with
  its own history and remote.

`src/app/dashboard/teaching-log/**` uses Next.js app-router-style folder naming
(`page.tsx`, `[id]/`) but is ordinary, live react-router code — all four files
are imported and routed from `src/router/index.tsx` (`/teaching-log` and
`/dashboard/teaching-log` paths). None of them import from `next`. Don't delete
them because of the naming; the naming is just a leftover habit from whoever
wrote the feature, not a sign the code is unreachable.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build
npm run lint         # ESLint (flat config in eslint.config.mjs)
npm test             # Vitest
```

## State of the gates

- `npm run lint` passes with 0 errors. Remaining warnings are pre-existing
  typing debt (`no-explicit-any`) and fast-refresh hints.
- `npm run build` has pre-existing type errors in a few older files
  (`features/library` CatalogTab and HistoryTab, `students/StudentProfilePage`),
  so `tsc -b` is not yet a clean gate. Check a failure against that baseline
  before assuming it is yours.
