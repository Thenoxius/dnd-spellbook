# Deployment

The app is a static site hosted on GitHub Pages. There is no server, no
database and no build-time configuration: every character, spell and setting
lives in the visitor's own browser (IndexedDB and localStorage), so a
deployment is nothing but HTML, CSS and JS.

Live at **https://thenoxius.github.io/dnd-spellbook/**

## One-time setup

Repository → **Settings → Pages → Build and deployment → Source: GitHub
Actions**. That is the whole setup. No secrets, no external accounts.

## How it works

`.github/workflows/deploy.yml` runs on every push to `main` and on demand via
**Actions → Deploy to GitHub Pages → Run workflow**:

1. `npm ci`, then `npx tsc --noEmit` as a gate so a type error stops the run.
2. `npm run build` with `NEXT_PUBLIC_BASE_PATH=/dnd-spellbook`, producing a
   static export in `out/`.
3. `actions/deploy-pages` publishes it and registers the deployment, so the
   live URL appears on the repository's Environments panel and beside each
   commit.

### Why the base path is set at build time

A project site is served from `https://<user>.github.io/<repo>/`, so every
asset URL needs that prefix baked in. `basePath` is inlined into the client
bundle and cannot be changed afterwards, which is why the workflow passes it as
an environment variable rather than the config hardcoding it. Locally the
variable is unset, so `next dev` keeps serving from `/`.

### Why character pages use a query string

Static export cannot emit a page for `/character/<id>` because the ids are
random UUIDs created in the browser, and Next.js requires every dynamic route
to be enumerable at build time. The character screens therefore read their id
from the query string — `/character/?id=…`, `/character/spells/?id=…` — which
exports as three ordinary pages and resolves entirely on the client.

## Testing on a phone

Open the URL above. Because storage is per-browser, a phone starts with an
empty shelf; it does not see the characters on your laptop. Either create one
there, or use **Backup** on the laptop to download the JSON and **Restore** on
the phone.

To test before pushing, `npm run dev` also listens on your local network — the
terminal prints a `Network:` address you can open on a phone on the same Wi-Fi.

## Troubleshooting

**The workflow succeeds but the site 404s**
Pages is probably still set to "Deploy from a branch". Switch the source to
GitHub Actions.

**The page loads but has no styling, or assets 404**
The base path and the repository name have diverged. The workflow derives it
from `github.event.repository.name`, so renaming the repo fixes itself on the
next run; a custom domain means dropping the base path entirely.

**A character page opens empty on a hard refresh**
Check the URL kept its `?id=…`. Without it the page has nothing to look up.
