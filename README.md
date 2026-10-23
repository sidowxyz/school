# School Management Workspace

Clone this one repo, run two commands, and get both the server (backend) and client
(frontend) running together locally:

```bash
npm install
npm run setup
```

Then, after filling in your `server/.env` (see below):

```bash
npm run dev
```

---

## 1. What this is / is not

**What it is:** a thin orchestration repo   a setup script plus a `concurrently`
runner   that gets both services running side by side for local integration work.

**What it is NOT:** not a monorepo. It does not merge git histories, and it doesn't
replace either repo's own README, CI, or PR workflow. `server/` and `client/` are
full, independent git repos with their own remotes, branches, issues, and PRs   exactly
as before this workspace repo existed. You still `cd server` or `cd client` to
commit, branch, push, and open PRs against their own GitHub repos.

After setup, the layout looks like:

```
school-management-workspace/
├── .gitignore
├── README.md
├── package.json
├── setup.sh
├── server/     ← independent clone of school-management-backend (gitignored here)
└── client/     ← independent clone of school-management-frontend (gitignored here)
```

## 2. Repos included

- Server (`server/`): https://github.com/ZUST-ICT/school-management-backend   Node.js/Express/MongoDB API, default port **5000**.
- Client (`client/`): https://github.com/ZUST-ICT/school-management-frontend   React 19 + Vite, default port **5173**.

## 3. Prerequisites

- Git
- Node.js and npm   **note:** the backend repo's CI pins Node 24, the frontend repo's
  CI pins Node 20 (a known, pre-existing mismatch between the two repos, not something
  this workspace fixes). If you hit odd install/runtime errors in one side, check
  `node --version` against that repo's CI config first. Using `nvm` to switch per-folder
  is the easiest workaround if you need to match exactly.
- Access to a MongoDB instance (e.g. MongoDB Atlas) for the server's `MONGODB_URI`.
  Ask **Me** (dayibabdi861@gmail.com) for access or a connection string.
- Real server secrets to put in `server/.env` (see §7   there's no `.env.example` in
  that repo yet, so these come from a teammate, not from any file in the repo).
  Ask **Dayib Abdi** (dayibabdi861@gmail.com) for the real values.

## 4. One-time setup

```bash
git clone https://github.com/ZUST-ICT/school-management-workspace.git
cd school-management-workspace
npm install       # installs concurrently for the workspace root
npm run setup     # clones server + client as siblings, npm installs both,
                   # copies client/.env.example -> client/.env,
                   # and scaffolds a placeholder server/.env
```

Then edit `server/.env` and replace the `REPLACE_ME` placeholders with real values
(§7 lists what each one is and does). `client/.env` is copied automatically from the
frontend repo's own `.env.example` and normally needs no changes for local dev.

`npm run setup` is safe to re-run any time   it won't reclone a repo that's already
there, won't overwrite an existing `.env`, and will just refresh `npm install` in both
folders (handy after a `git pull` that changed dependencies).

## 5. Day-to-day usage

| Command | What it does |
|---|---|
| `npm run dev` | Runs server + client together, color-coded/labeled output |
| `npm run dev:server` | Runs only the server |
| `npm run dev:client` | Runs only the client |
| `npm run install:all` | Re-installs deps in both `server/` and `client/` |
| `npm run setup` | Re-runs full setup (idempotent) |

- Server: http://localhost:5000
- Client: http://localhost:5173
- CORS: the server's default allowlist already includes `localhost:5173` (and
  `localhost:3000`), so local dev on the default ports needs no extra CORS config.
- Stop both with a single `Ctrl+C` in the terminal running `npm run dev`.

## 6. Working on server or client code

`server/` and `client/` are ordinary git clones pointing at their own GitHub
remotes (`school-management-backend` and `school-management-frontend` respectively).
To make changes:

```bash
cd server    # or: cd client
git checkout -b your-branch
# ...make changes, commit, push, open a PR against that repo as usual...
```

Nothing you do inside `server/` or `client/` touches this workspace repo's own git
history, and vice versa , this repo only ever tracks the four files listed in §1.

To pull the latest from both repos later:

```bash
git -C server pull
git -C client pull
npm run install:all   # in case dependencies changed
```

## 7. Environment variables reference

### Server (`server/.env`)

| Variable | Purpose | Notes |
|---|---|---|
| `PORT` | Server port | defaults to `5000` |
| `MONGODB_URI` | MongoDB connection string | ask a teammate  see prerequisites TODO above |
| `JWT_ACCESS_SECRET` | Signs short-lived access tokens | ask a teammate |
| `JWT_REFRESH_SECRET` | Signs longer-lived refresh tokens | ask a teammate |
| `NODE_ENV` | `development` \| `test` \| `production` | use `development` locally |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin login, created only when the database has no admin | optional in development (defaults to admin@gmail.com / admin); required in production. No demo data is ever created — everything is entered in the app |

The backend repo doesn't ship a `.env.example` yet (known gap), so `npm run setup`
scaffolds `server/.env` with the keys above set to `REPLACE_ME` placeholders   fill
them in with real values before `npm run dev` will fully work.

### Client (`client/.env`)

| Variable | Purpose | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL the client calls | defaults to `http://localhost:5000/api`, which already matches the server's default port |

## 8. Troubleshooting

- **"Port already in use"**   something else is already listening on 5000 or 5173.
- **CORS error in the browser console**   make sure the client is running on 5173 (or
  3000), not some other port; those are the only two the server currently allows.
- **`concurrently: command not found`**   run `npm install` at the workspace root
  before `npm run dev` (`npm run setup` does this automatically).
- **Server crashes on startup / Mongo connection error**   check `server/.env` for
  leftover `REPLACE_ME` placeholders.
- **Weird install or runtime errors on one side only**   check `node --version` against
  that repo's CI-pinned version (see §3).
- **Things are in a broken state and you don't know why**   `rm -rf server client`
  and re-run `npm run setup`; this is always safe since this workspace repo's own git
  history never includes those folders.
