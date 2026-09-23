# Beacon_OSINT_Tools.com

Public directory of OSINT tools. This site is a storefront. Each tool stays its own Render Web Service. Preview videos stay on Google Drive. Do not commit `.mp4` files.

## Add a tool

1. Edit `tools.json` and drop an icon in `icons/`. The tile `icon` path is `/icons/your-file.svg`.
2. Paste the Drive **file ID**, not the `/view` URL. The embed is `https://drive.google.com/file/d/FILE_ID/preview`. Replacing a file in place keeps the ID. A new upload needs a new ID.
3. `enterUrl` is the tool’s Render **Web Service** URL, not this gallery.
4. Free tool services may take about a minute to wake. This site does not show a waking spinner.
5. Hobby workspaces allow two custom domains. Point one at this gallery if you have a domain.

`status` is `live`, `preview-soon`, or `soon`.

- An empty or invalid `previewDriveId` disables Preview and labels it “Preview soon”.
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

## Fill in before the first real launch

- Site name and owner, in `tools.json`
- Real `enterUrl` values
- Real Drive file IDs
- Icon files
- A custom domain, if you have one

Until those exist, the two placeholder tiles keep Enter disabled.
