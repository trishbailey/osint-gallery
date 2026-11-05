# Beacon_OSINT_Tools.com

Public directory of OSINT tools. This site is a storefront. Each tool stays its own Render Web Service. Preview videos stay on Google Drive. Do not commit `.mp4` files.

## Add a tool

1. Edit `tools.json` and drop an icon in `icons/`. The tile `icon` path is `/icons/your-file.svg`.
2. Paste the Drive **file ID**, not the `/view` URL. The embed is `https://drive.google.com/file/d/FILE_ID/preview`. Replacing a file in place keeps the ID. A new upload needs a new ID.
3. `enterUrl` is the tool’s Render **Web Service** URL, not this gallery.
4. Free tool services may take about a minute to wake. This site does not show a waking spinner.
5. Hobby workspaces allow two custom domains. Point one at this gallery if you have a domain.

`status` is `live`, `preview-soon`, or `soon`.

- An empty or invalid `previewDriveId` hides the Preview button. A valid video ID enables it.
- Enter stays disabled unless `status` is `live` and `enterUrl` is a real http(s) URL. Placeholder hosts that contain `REPLACE` stay disabled so the gallery itself does not 404.

## Deploy on Render

Service type: **Static Site**. Do not create a Web Service for the gallery. Do not add Postgres.

`render.yaml` is a Blueprint:

1. In the Render Dashboard, choose **New → Blueprint**.
2. Connect this GitHub repo (`trishbailey/osint-gallery`) and apply the Blueprint.
3. Auto-deploy from `main`.

Or create a Static Site by hand:

- Build command: `echo no-build`
- Publish directory: `.` (the repo root)
- Environment variable: `SKIP_INSTALL_DEPS` = `true`

## Directory content

The directory lists Spotlight X, Domain Recon, Information Operations Spotlight, and Telegram Channel Collector with live Enter links. Reddit, Bluesky, and TikTok have reserved Coming soon tiles.

- Add Drive file IDs in `tools.json` to enable previews.
- To launch a planned tool, set its `enterUrl` and change its `status` to `live`.
- Site name and owner remain configurable in `tools.json`.

## Dashboards

The page has two separate sections: **Tools** (the `tools` array in `tools.json`) and **Dashboards** (the `dashboards` array). To add a dashboard (e.g. Africa Brief, Cartel, Water Security, Belt and Road), append an entry to `dashboards` with `id`, `name`, `blurb`, `icon` (optional), `enterUrl`, and `status`. Only entries with `status: "live"` and a real https URL are shown, so an entry can sit as `"soon"` until it launches.

## Dashboards: how publishing works

All Beacon dashboards are served from this one Render static site (`beacon-tools`), each under its own subpath. Nothing is copied by hand.

| Subpath | Source repo (branch `main`) | Build command | Publish dir | Status |
|---|---|---|---|---|
| `/world-brief/` | `trishbailey/world-brief` (private) | none | `public/` | live |
| `/critical-minerals/` | `trishbailey/critical-minerals` (private) | none | `public/` | live |
| `/cartel/` | `trishbailey/cartel-dashboard` (public) | `bash pipeline/build.sh` | `public/` | live |
| `/africa-brief/` | in this repo (`africa-brief/`, own workflow) | | | live, not synced |
| `/water-security/` | (not yet) | | `public/` | reserved |
| `/belt-and-road/` | in this repo (`belt-and-road/`, own workflow) | | | live, not synced |
| `/ghost-fleet/` | in this repo (`ghost-fleet/`, own workflow) | | | live, not synced |
| `/middle-east/` | (not yet) | | `public/` | reserved |
| `/indo-pacific/` | (not yet) | | `public/` | reserved |
| `/latin-america/` | (not yet) | | `public/` | reserved |

The single source of truth is `dashboards.json`. Reserved subpaths hold a "Coming soon" page until they go live. Entries marked `in-repo` (Africa Brief, Belt and Road) are built directly in this repo by their own workflows, and the sync never touches them. Never add a sync entry for a slug that already has an in-repo folder.

### How an update reaches the live site

1. The dashboard bot pushes to **its own repo's `main`** as usual. It does not touch this repo.
2. Every 15 minutes (cron `7,22,37,52 * * * *`, off the busy :00/:15 marks), `.github/workflows/sync-dashboards.yml` in this repo runs `scripts/sync_dashboards.py`. For each `live` entry in `dashboards.json` it:
   - shallow-clones the repo's `main` branch,
   - runs the `build` command, if there is one,
   - copies the publish dir (`public/`) to a temp folder and rewrites root-relative links (`href="/x"`, `src="/x"`, `url(/x)`, `fetch("/x")`) to `/<slug>/x`. It also changes the old `*.onrender.com` URL in og:url, canonical and og:image to `https://beacon-tools.onrender.com/<slug>/`, strips the retired GA tag `G-FE6CZGWX0J`, and adds `G-Z61EKRP8QV` only if the page lacks it,
   - replaces `/<slug>/` **only if clone and build both succeeded**. If anything fails, the previous version stays live,
   - points that dashboard's card in `tools.json` at `/<slug>/`.
3. If anything changed, the workflow commits it to `main` and Render auto-deploys `beacon-tools`. An update is normally live 15 to 25 minutes after the dashboard repo's push. GitHub's scheduled runs are best-effort: they can be late or skipped under load, and a newly added schedule may take an hour or more to start firing.

Each subpath has a `.source` file showing the repo commit that is live (e.g. `/cartel/.source`).

### Rules for a dashboard bot (follow these and it just works)

- Commit the finished, validated site to `public/` on `main` (or provide a `build` command that produces it). The page must be `public/index.html`.
- Only commit to `main` after validation passes. Whatever is on `main` gets published (World Brief already works this way: `render-brief` only commits after `validate_reasoner.py` passes).
- Use relative links (`style.css`, `data/x.json`) or root-relative links (`/style.css`). Both work, because root-relative links are rewritten to the subpath. Don't build URLs in JavaScript from `location.origin + "/..."`, since those are not rewritten. Use relative paths instead.
- Keep the GA tag `G-Z61EKRP8QV` in each page's `<head>`. If it is missing, the sync adds it. Don't add `G-FE6CZGWX0J` (retired; the sync strips it).
- Optional, for instant publishing: from your repo's Action, send a `repository_dispatch` of type `dashboard-updated` to `trishbailey/osint-gallery` with `{"slug": "<slug>"}`. That needs a token with access to this repo. Without it, the 15-minute schedule picks the update up.

### Adding a new dashboard (e.g. Water Security)

1. In `dashboards.json`, find the reserved entry, set `repo` (`owner/name`), `private`, `build` (or `""`), `publish` (usually `public`), `oldUrl` (or `""`), and change `status` to `live`.
2. Add a card to the `dashboards` array in `tools.json` with `"id"` equal to the entry's `cardId` (the slug) and `"status": "live"`. The sync sets its `enterUrl` to `/<slug>/` after the first successful build.
3. If the repo is private, set up a read-only deploy key for it (see "Access to private repos" below).
4. Merge. The push runs the sync immediately (Actions → sync-dashboards → Run workflow also works, optionally with a slug).

### Access to private repos (read-only deploy keys)

Each private dashboard repo has its own **read-only deploy key** (repo Settings → Deploy keys, titled "osint-gallery sync (read-only)"). The matching private key is an Actions secret in `trishbailey/osint-gallery`:

| Repo | Secret |
|---|---|
| `trishbailey/world-brief` | `DEPLOY_KEY_WORLD_BRIEF` |
| `trishbailey/critical-minerals` | `DEPLOY_KEY_CRITICAL_MINERALS` |

The workflow writes GitHub's SSH host keys (from `https://api.github.com/meta`) to a known_hosts file. The script clones each private repo from `git@github.com:<repo>.git`, with `GIT_SSH_COMMAND` using only that repo's key and strict host checking. The key goes into a 0600 temp file that is deleted right after the clone. Secrets are never passed to build commands or printed. No personal access token is used.

**To add a private dashboard:**
1. Generate an ed25519 key pair in a temp dir.
2. Add the public key to the new repo as a deploy key with "Allow write access" **off**.
3. Save the private key as the secret `DEPLOY_KEY_<SLUG_IN_CAPS>`, e.g. `gh secret set DEPLOY_KEY_WATER_SECURITY -R trishbailey/osint-gallery < keyfile`.
4. Delete the local key with `shred -u`.
5. Set `"deployKeySecret": "DEPLOY_KEY_<SLUG>"` on its `dashboards.json` entry, and add the same `env:` line to the "Build dashboards into subpaths" step in `.github/workflows/sync-dashboards.yml`.

Public repos need no key.

### Concurrent edits

Several bots work on this repo at once. To avoid overwriting each other:
- Change only **your own folder** (`/<slug>/`) and **your own entry** in `dashboards.json` (and your own card in `tools.json`). Don't reformat or reorder other entries, and don't touch other dashboards' folders or workflows.
- **Rebase onto the latest `main` right before merging**, then check that the PR diff contains only your files.

### Cost

$0. This repo is public, so GitHub Actions minutes are free. `beacon-tools` stays a free Render static site with no build step (`echo no-build`), and no new Render services are added.

## CI check (every change)
`.github/workflows/ci-check.yml` runs `scripts/ci_check.py` on every PR and push to main. It fails when a page or generator carries the retired GA tag or lacks `G-Z61EKRP8QV`, links to github.io or an old standalone `*.onrender.com` dashboard site, or when a changed dashboard fails the colour (no greys, delta E >= 20), label-size (>= 13px) or 390px phone-width checks (no sideways scroll, no JS errors). A PR that edits shared files (scripts/, .github/, render.yaml, README.md, root page files) or more than one dashboard folder fails unless it has the `trish-approved` label. Run locally: `python scripts/ci_check.py --changed-from origin/main`. It also fails map labels that sit more than 7px from their marker's edge (SVG and Leaflet maps) and all-caps acronyms that are never spelled out on the page, e.g. `Full name (ACR)`. Mark decorative SVG parts with `data-ci-ignore`. Shades of one group's own colour (an intensity tint ramp) are exempt from the delta E look-alike rule when the marks carry `data-ramp="<group>"` (on the mark or an ancestor); pairs from different groups are still checked.

**Grey for defunct items only.** The no-grey rule has one opt-in exception, for markers of dissolved or defunct groups/items. Put `data-status="defunct"` (exact value) on the SVG shape or on a `<g>` inside the SVG that holds it, and name it with an `aria-label` or a child `<title>`, e.g. `<g data-status="defunct" aria-label="Dissolved: Example Front"><circle fill="#8a8a8a" .../></g>`. Only grey fills under that marker are exempt: the marker cannot be the `<svg>` root, a class such as `is-defunct` does nothing, unnamed markers fail, non-grey colours on it are checked as usual, and at most half the shapes in one SVG may use it. Every other grey still fails CI.
