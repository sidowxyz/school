# Deploying the School Management System

This guide puts the system online, step by step, with **two copies**:

| | **Demo** (test copy) | **Live** (the real school) |
|---|---|---|
| Git branch | `demo` | `main` |
| Frontend (Vercel) | demo website | live website |
| Backend (Render) | `school-api-demo` | `school-api` |
| Database (MongoDB Atlas) | `school_demo` | `school_live` |

The two copies never share data. Whatever you break on demo cannot touch the live school.

**How you will work every day:**

```
your computer  ──push──►  demo branch  ──test on the demo website──►  merge into main  ──►  live
```

You do the setup below **once**. After that, deploying is only `git push` (see [Part 7](#part-7--your-daily-workflow-local--demo--live)).

---

## Contents

1. [Before you start](#part-1--before-you-start)
2. [Put the code on GitHub with two branches](#part-2--put-the-code-on-github-with-two-branches)
3. [Create the databases (MongoDB Atlas)](#part-3--create-the-databases-mongodb-atlas)
4. [Deploy the backend (Render)](#part-4--deploy-the-backend-render)
5. [Deploy the frontend (Vercel)](#part-5--deploy-the-frontend-vercel)
6. [Connect frontend and backend, then sign in](#part-6--connect-frontend-and-backend-then-sign-in)
7. [Your daily workflow: local → demo → live](#part-7--your-daily-workflow-local--demo--live)
8. [If something goes wrong in live: roll back](#part-8--if-something-goes-wrong-in-live-roll-back)
9. [Important limits of the free plans](#part-9--important-limits-of-the-free-plans)
10. [Environment variables reference](#part-10--environment-variables-reference)
11. [Troubleshooting](#part-11--troubleshooting)
12. [Final checklist](#part-12--final-checklist)

---

## Part 1 — Before you start

Create these free accounts. Sign in to Render and Vercel **with GitHub**, so they can see your repository.

- GitHub: https://github.com (the code is already at `github.com/sidowxyz/school`)
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas/register
- Render: https://render.com
- Vercel: https://vercel.com

On your computer you need Git, Node.js 20 or newer and pnpm 10 (`npm install -g pnpm@10`).

Files in this repository that the hosting uses (already created, you don't need to write them):

| File | What it does |
|---|---|
| `render.yaml` | Tells Render to create **both** backends (demo and live) |
| `client/vercel.json` | Tells Vercel how to build the frontend, and makes page refresh work on every page |
| `server/src/server.js` | Reads `CORS_ORIGINS`, so only your own websites can call the API |

---

## Part 2 — Put the code on GitHub with two branches

Do this in a terminal, in the project folder.

**Step 2.1 — Save your current work and put it on `main`.**

```bash
git status                       # see what changed
git add -A
git commit -m "Prepare for deployment"
git checkout main
git merge ui-redesign-and-docs   # bring your work branch into main
git push origin main
```

> Your work is currently on a branch called `ui-redesign-and-docs`. If you prefer, open a
> Pull Request on GitHub from that branch into `main` and merge it there instead.

**Step 2.2 — Create the `demo` branch from `main`.**

```bash
git checkout -b demo
git push -u origin demo
```

Now GitHub has two branches: `main` (live) and `demo` (test).

**Step 2.3 — Protect `main` (recommended).** On GitHub open
**Settings → Branches → Add branch ruleset** (or *Add rule*), target branch `main`, and tick
**Require a pull request before merging**. This stops anyone pushing to live by accident.

---

## Part 3 — Create the databases (MongoDB Atlas)

One free cluster can hold both databases.

**Step 3.1 — Create a cluster.**
1. In Atlas click **Create** (or **Build a Database**).
2. Choose **M0 Free**, any provider, and a region close to your Render region
   (for example *Frankfurt* if Render is in Frankfurt).
3. Name it `school-cluster` and click **Create Deployment**.

**Step 3.2 — Create two database users** (one per copy, so demo can never write to live).
1. Go to **Security → Database Access → Add New Database User**.
2. User 1: username `school_demo_user`, click **Autogenerate Secure Password**, copy it somewhere safe.
   Under **Database User Privileges** choose **Specific Privileges → readWrite** on database `school_demo`.
3. User 2: username `school_live_user`, a new generated password,
   **readWrite** on database `school_live`.

> Use passwords without `@ : / ?` characters (the generated ones are fine). Those characters break the connection string.

**Step 3.3 — Allow Render to connect.**
Render's free plan has no fixed IP address, so go to **Security → Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).
Your data stays protected by the database users' passwords.

**Step 3.4 — Get the two connection strings.**
1. Click **Connect** on the cluster → **Drivers** → copy the string. It looks like:
   `mongodb+srv://<username>:<password>@school-cluster.abc12.mongodb.net/?retryWrites=true&w=majority`
2. Make two versions. Put the user, the password and the **database name after `.net/`**:

```text
DEMO:  mongodb+srv://school_demo_user:DEMO_PASSWORD@school-cluster.abc12.mongodb.net/school_demo?retryWrites=true&w=majority
LIVE:  mongodb+srv://school_live_user:LIVE_PASSWORD@school-cluster.abc12.mongodb.net/school_live?retryWrites=true&w=majority
```

The database name after `.net/` matters: without it, data goes into a database called `test`.
You don't need to create the databases by hand; they appear on the first save.

---

## Part 4 — Deploy the backend (Render)

`render.yaml` creates both backends at once.

**Step 4.1 — Create the Blueprint.**
1. In Render click **New + → Blueprint**.
2. Connect the GitHub repository `sidowxyz/school`.
3. Render reads `render.yaml` and shows two services: **school-api-demo** (branch `demo`) and **school-api** (branch `main`).

**Step 4.2 — Fill in the secret values.** Render asks for every value marked `sync: false`:

| Variable | school-api-demo | school-api (live) |
|---|---|---|
| `MONGODB_URI` | the **DEMO** string from step 3.4 | the **LIVE** string from step 3.4 |
| `ADMIN_EMAIL` | e.g. `admin@demo.yourschool.com` | the real admin's email |
| `ADMIN_PASSWORD` | at least 8 characters | a **strong** password, at least 8 characters |
| `CORS_ORIGINS` | leave empty for now (set in Part 6) | leave empty for now (set in Part 6) |

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated automatically and differ between the two, so a demo login never works on live.

Click **Apply**. Render installs and starts both services; it takes a few minutes.

**Step 4.3 — Check that both are running.**
Each service gets a URL such as `https://school-api-demo.onrender.com` and `https://school-api.onrender.com`
(Render may add letters if the name is taken; use the URLs it shows you).
Open each one in the browser. You should see:

```json
{ "success": true, "message": "Server is running 🚀" }
```

In each service's **Logs** you should see `MongoDB Connected` and `Created the first admin account: …`.
`https://<service>.onrender.com/api/health` should answer `{"success":true,"database":"connected"}` — Render uses this
address to decide whether a deploy is healthy, and the server refuses to start without its database or secrets.

**Write the two URLs down.** The API address the frontend needs is the URL **plus `/api`**:

```text
DEMO API:  https://school-api-demo.onrender.com/api
LIVE API:  https://school-api.onrender.com/api
```

<details>
<summary>Not using the Blueprint? Create each service by hand instead</summary>

Do this twice (once for `demo`, once for `main`): **New + → Web Service** → pick the repository, then:

- Name: `school-api-demo` / `school-api`
- Branch: `demo` / `main`
- Root Directory: `server`
- Runtime: Node
- Build Command: `npx --yes pnpm@10.34.7 install --frozen-lockfile`
- Start Command: `node src/server.js`
- Instance type: Free
- Health Check Path: `/api/health`
- Environment: `NODE_VERSION=24`, `NODE_ENV=production`, `SCHOOL_TIMEZONE=Africa/Mogadishu`, plus the variables in the table above, plus
  `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (make each with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, and use different ones for demo and live).

</details>

---

## Part 5 — Deploy the frontend (Vercel)

One Vercel project serves both copies: the `main` branch is **Production** (live) and the `demo` branch is a **Preview** with its own permanent address.

**Step 5.1 — Import the project.**
1. In Vercel click **Add New… → Project** and import `sidowxyz/school`.
2. **Root Directory:** click *Edit* and choose `client`. This one matters.
3. Framework Preset: **Vite** (picked automatically; build settings come from `client/vercel.json`).
4. Open **Environment Variables** and add:
   - Name `VITE_API_BASE_URL`, value = your **LIVE API** (`https://school-api.onrender.com/api`).
5. Click **Deploy**.

**Step 5.2 — Make `main` the live branch.**
Go to **Settings → Environments → Production** (on older dashboards: **Settings → Git**) and check the production branch is `main`.

**Step 5.3 — Point the demo website at the demo backend.**
Go to **Settings → Environment Variables** and set `VITE_API_BASE_URL` per environment:

| Environment | Value |
|---|---|
| **Production** | `https://school-api.onrender.com/api` (live) |
| **Preview**, branch `demo` | `https://school-api-demo.onrender.com/api` (demo) |
| **Preview** (all other branches) | `https://school-api-demo.onrender.com/api` (demo, so a test branch can never touch live data) |

To set a value for one branch: edit the variable, tick only **Preview**, and choose the branch `demo`.

> **Vite bakes the value into the build.** After changing an environment variable you must
> **redeploy** (Deployments → ⋯ → Redeploy). Otherwise the site keeps the old address.

**Step 5.4 — Deploy demo and note the two website addresses.**
Push anything to `demo` (or use **Redeploy** on its latest deployment). Then:

- **Live website:** the Production domain, e.g. `https://school.vercel.app`
- **Demo website:** the branch address, e.g. `https://school-git-demo-yourname.vercel.app`
  (shown under **Deployments** → the `demo` deployment → *Domains*)

Optional: give demo a nicer name under **Settings → Domains → Add**, e.g. `demo-school.vercel.app`
or `demo.yourschool.com`, and set its **Git Branch** to `demo`. Add your real domain for live there too.

---

## Part 6 — Connect frontend and backend, then sign in

The backend refuses requests from websites it doesn't know (CORS), so tell each backend its website.

**Step 6.1 — Set `CORS_ORIGINS` in Render.** Open each service → **Environment** → edit `CORS_ORIGINS`:

| Service | `CORS_ORIGINS` |
|---|---|
| `school-api-demo` | your demo website, e.g. `https://school-git-demo-yourname.vercel.app` |
| `school-api` | your live website, e.g. `https://school.vercel.app` |

- No `/` at the end, and include `https://`.
- Several addresses (e.g. the `.vercel.app` one **and** your own domain) go in **one line, separated by commas**:
  `https://school.vercel.app,https://portal.yourschool.com`

Click **Save, rebuild, and deploy**.

**Step 6.2 — Sign in.**
1. Open the **demo** website and sign in with the demo `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. The first request can take up to a minute while the free server wakes up. That is normal.
3. Do the same on the **live** website with the live admin login.
4. In each copy, go to **Settings** and fill in the school profile. The demo and live data are separate, so fill in both.

The system creates the admin account only when the database has no admin yet. Changing `ADMIN_PASSWORD` later does **not** change an existing password; change it in the app instead (top-right menu → **My account**).

**Forgotten passwords.** The app sends no email, so nobody can reset a password by themselves. An admin opens
**User Accounts → Reset password** next to the person, and gives them the temporary password shown once. They sign in
with it and choose their own under **My account**. Everyone (including teachers, parents and students) can change
their own password under **My account**.

---

## Part 7 — Your daily workflow: local → demo → live

### 1. Work on your computer

```bash
git checkout demo
git pull                        # get the latest demo
git checkout -b feature/new-report   # a branch for this change
pnpm dev                        # server :5000 + client :5173, against your local database
```

Make your change and test it locally. Then:

```bash
git add -A
git commit -m "Add the new report"
```

### 2. Send it to demo

```bash
git checkout demo
git merge feature/new-report
git push origin demo
```

That push automatically:
- rebuilds the **demo website** on Vercel (about 1–2 minutes), and
- redeploys **school-api-demo** on Render (about 2–5 minutes).

Watch the progress in the Vercel **Deployments** page and the Render **Events** page.

### 3. Test on the demo website

Open the demo website and try the change the way a real user would. If something is wrong, fix it locally and push to `demo` again. Repeat until demo is good.

> Every pull request and every push to `demo` or `main` runs the automatic checks in
> `.github/workflows/ci.yml` (server tests and lint, client type check, tests and build). Merge only when they are green.

### 4. Release to live

When demo works well, merge `demo` into `main`. The safest way is a **Pull Request on GitHub**:

1. GitHub → **Pull requests → New pull request**.
2. **base:** `main` ← **compare:** `demo`.
3. Check the list of changes, click **Create pull request**, then **Merge pull request**.

Or from the terminal (only if `main` is not protected):

```bash
git checkout main
git pull
git merge demo
git push origin main
```

Merging into `main` automatically deploys the **live website** and **school-api**. Open the live website and check quickly that it works.

### 5. Keep demo up to date

```bash
git checkout demo
git merge main
git push origin demo
```

### Golden rules

- **Never push straight to `main`.** Everything goes through `demo` first.
- **Never use the live database on your computer or on demo.** Each copy has its own `MONGODB_URI`.
- **Never commit `.env` files.** Secrets live only in Render, Vercel and your local `.env` (they are already in `.gitignore`).
- **New environment variable?** Add it in **both** Render services, or in **both** Vercel environments, before merging the code that needs it.

---

## Part 8 — If something goes wrong in live: roll back

You can undo a bad release in one click while you fix it on demo.

- **Frontend (Vercel):** Deployments → pick the last good **Production** deployment → ⋯ → **Instant Rollback**.
- **Backend (Render):** `school-api` → **Events** → the last good deploy → **Rollback**.
- **Code:** revert the merge so `main` matches what is running again:

```bash
git checkout main
git revert -m 1 <merge-commit-id>
git push origin main
```

A rollback does **not** undo changes to the data in the database. Atlas M0 has no automatic backups,
so before a risky release take a copy with `mongodump --uri "<LIVE connection string>"`
(from MongoDB Database Tools).

---

## Part 9 — Important limits of the free plans

| Limit | What it means | What to do |
|---|---|---|
| **Render free servers sleep** after 15 minutes without visitors | The first visit after a quiet period waits about 30–60 seconds | Fine for demo. For live, upgrade `school-api` to **Starter** (about $7/month) so it never sleeps |
| **Render free disk is temporary** | Uploaded files (school logo, student photos, documents, receipt PDFs) are saved on the server disk and are **deleted on every deploy or restart** | For live, use a paid instance and add a **Disk** (Render → service → Disks, mount path `/opt/render/project/src/server/uploads`), or later move uploads to cloud storage |
| **Atlas M0** has 512 MB and no automatic backups | Fine to start with | Take `mongodump` copies regularly; upgrade the cluster when the school grows |
| **Monthly fee charging** runs when the server starts and every 6 hours | On a sleeping free server it runs when someone next opens the site | No action needed; it never charges a student twice |

---

## Part 10 — Environment variables reference

### Backend (Render, each service)

| Variable | Required | Demo value | Live value |
|---|---|---|---|
| `NODE_ENV` | yes | `production` | `production` |
| `NODE_VERSION` | yes | `24` | `24` |
| `MONGODB_URI` | yes | Atlas `school_demo` string | Atlas `school_live` string |
| `JWT_ACCESS_SECRET` | yes | random, different from live | random |
| `JWT_REFRESH_SECRET` | yes | random, different from live | random |
| `ADMIN_EMAIL` | first start | demo admin email | real admin email |
| `ADMIN_PASSWORD` | first start | 8+ characters | strong, 8+ characters |
| `CORS_ORIGINS` | yes | demo website address(es) | live website address(es) |
| `SCHOOL_TIMEZONE` | recommended | `Africa/Mogadishu` | `Africa/Mogadishu` |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `AI_PROVIDER` | only for the AI assistant | optional | optional |

Render sets `PORT` itself; don't add it.

### Frontend (Vercel)

| Variable | Production (live) | Preview (demo) |
|---|---|---|
| `VITE_API_BASE_URL` | `https://school-api.onrender.com/api` | `https://school-api-demo.onrender.com/api` |

### Your computer

- `server/.env`: `MONGODB_URI` pointing at your **local** MongoDB (e.g. `mongodb://127.0.0.1:27017/school_management_system`), plus the JWT secrets.
- `client/.env`: `VITE_API_BASE_URL=http://localhost:5000/api` (or leave it out; that is the default).

---

## Part 11 — Troubleshooting

| Problem | Cause and fix |
|---|---|
| Browser console says **"CORS Policy: Origin not allowed"** or "blocked by CORS policy" | The website address is missing from that backend's `CORS_ORIGINS`, or has a `/` at the end, or `http` instead of `https`. Fix it in Render and redeploy |
| Login does nothing, and the network tab shows calls to `localhost:5000` | `VITE_API_BASE_URL` was not set for that Vercel environment, or you didn't redeploy after setting it |
| Demo website shows **live** data (or the other way round) | The Vercel variable for that environment points at the wrong API. Check Part 5.3, then redeploy |
| Refreshing a page like `/students` gives **404** | The Root Directory in Vercel is not `client`, so `client/vercel.json` isn't used |
| Render log: **MongoServerSelectionError** / timeout | Atlas Network Access doesn't allow `0.0.0.0/0`, or the connection string has the wrong password |
| Render log: **bad auth : authentication failed** | Wrong username or password in `MONGODB_URI`, or the password has special characters. Reset the password in Atlas |
| Render log: **No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD** | Add both variables (8+ character password) and redeploy |
| Site is very slow on the first visit | The free Render server was asleep. Wait a minute, or upgrade live to Starter |
| Uploaded logo or photos disappeared | The free Render disk was reset by a deploy (Part 9). Add a Render Disk for live |
| Vercel build fails with **VITE_API_BASE_URL is not set** | Add `VITE_API_BASE_URL` for that environment (Part 5.3) and redeploy. The build stops on purpose rather than ship a site that calls localhost |
| Render deploy never becomes **Live**, log says **Missing required environment variables** or **Could not connect to the database** | Set `MONGODB_URI`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, and check Atlas Network Access. The server exits on purpose instead of running half-configured |
| Build fails with **ERR_PNPM_OUTDATED_LOCKFILE** | You changed `package.json` without updating the lockfile. Run `pnpm install` in `client/` or `server/`, commit `pnpm-lock.yaml`, push again |
| Everyone is logged out after a deploy | Normal if you changed `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`. Don't change them unless needed |

---

## Part 12 — Final checklist

- [ ] GitHub has `main` and `demo` branches, and `main` is protected
- [ ] Atlas: one cluster, users `school_demo_user` and `school_live_user`, Network Access `0.0.0.0/0`
- [ ] Render: `school-api-demo` (branch `demo`) and `school-api` (branch `main`) both show **Live**, and `/api/health` says `"database":"connected"`
- [ ] Each Render service has its own `MONGODB_URI`, its own JWT secrets, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `CORS_ORIGINS`
- [ ] Vercel: Root Directory `client`, production branch `main`
- [ ] Vercel `VITE_API_BASE_URL`: Production → live API, Preview → demo API, then redeployed
- [ ] Signed in on the demo website **and** on the live website
- [ ] (Live) Render instance upgraded and a Disk added if you rely on uploaded files
