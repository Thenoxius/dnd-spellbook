# Deployment Guide

The app deploys to Vercel from GitHub Actions. There is no backend and no
database: everything a character owns lives in the browser's IndexedDB, so a
deployment is just static assets plus Next.js rendering. No environment
variables are needed to build it.

## One-time setup

You need three repository secrets. Until they exist the workflow stops on its
first step and tells you which ones are missing.

### 1. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com).
2. **Add New → Project** and import `Thenoxius/dnd-spellbook`.
3. Framework preset **Next.js**; leave the build and output settings alone.
4. Deploy once so the project exists.

If you would rather not click through the dashboard, run `npx vercel link` in
the repo instead — it creates the project and writes `.vercel/project.json`
with the two ids you need below. That file is gitignored.

### 2. Collect the three values

| Secret | Where to find it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel → Account Settings → General (or `.vercel/project.json` → `orgId`) |
| `VERCEL_PROJECT_ID` | The project → Settings → General (or `.vercel/project.json` → `projectId`) |

### 3. Add them to GitHub

Repository → **Settings → Secrets and variables → Actions → New repository
secret**, once for each of the three.

## What the workflow does

`.github/workflows/deploy.yml` runs on every push to `main`, on pull requests
targeting `main`, and on demand via **Actions → Deploy → Run workflow**.

- Pull requests get a **preview** deployment with its own URL.
- Pushes to `main` get the **production** deployment.
- The job declares a GitHub `environment`, so the deployment and its URL appear
  on the repository's Environments panel and next to each commit — that is what
  makes a "live environment" visible in GitHub at all.
- The deployed URL is also printed in the run's summary.

## Testing on a phone

Open the production URL on the device. Because storage is per-browser, a phone
starts with an empty shelf — it does not see the characters on your laptop.
Two options:

- Create a throwaway character on the phone, or
- Use **Backup** on the laptop to download the JSON, move it to the phone
  (AirDrop, mail, cloud drive), and use **Restore** there.

## Troubleshooting

**The workflow fails on "Check the Vercel credentials are present"**
One or more of the three secrets is missing or empty. The error names them.

**"Project not found" during `vercel pull`**
`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` belong to different accounts or
projects, or the token was issued for a different scope. Re-copy both ids from
the same project.

**The build fails**
Reproduce locally with `npm run build`. The workflow also runs `npx tsc
--noEmit` first, so a type error stops the run before Vercel is involved.

**No environment shows up in GitHub even though the deploy succeeded**
Check that the job still has its `environment:` block — that, not the
deployment itself, is what registers the environment with GitHub.
