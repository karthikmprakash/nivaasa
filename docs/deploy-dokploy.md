# Deploy on Dokploy (GHCR + Docker Compose)

This is the production runbook for **nivaasa.karthikmprakash.online**. The image is built and published by GitHub Actions; Dokploy only pulls and runs it. Nothing in this document executes a deployment by itself.

## What you need

- A Dokploy server with Docker and Traefik.
- DNS for `nivaasa.karthikmprakash.online` pointing at the Dokploy server (A/AAAA).
- The GHCR image: `ghcr.io/karthikmprakash/nivaasa`.
  - Pushes to `main` publish `latest` and `sha-*`.
  - Tags like `v1.0.0` publish `1.0.0`, `1.0` and `sha-*`.

## 1. Make the image available

The published `karthikmprakash/nivaasa` package is **public** and multi-arch (`linux/amd64` + `linux/arm64`), so Dokploy can pull it without credentials. The production VPS is arm64; the compose file attaches to Dokploy’s external `dokploy-network` instead of allocating a new bridge network.

If you fork the repository and keep your package private, either make it public (GitHub → your profile → Packages → `nivaasa` → Package settings → Change visibility) or create a GitHub PAT (classic) with `read:packages` and add it in Dokploy under **Settings → Registries** (registry `ghcr.io`, username your GitHub username, token = PAT).

## 2. Create the Dokploy application

Create a **Compose** application in Dokploy and point it at this repository, using:

```
docker-compose.dokploy.yml
```

If you prefer not to connect the repo, paste that file into the compose editor. Set:

```env
NIVAASA_IMAGE=ghcr.io/karthikmprakash/nivaasa:1.0.3
NEXT_PUBLIC_APP_URL=https://nivaasa.karthikmprakash.online
CORS_ORIGIN=https://nivaasa.karthikmprakash.online
NEXT_PUBLIC_DEMO_MODE=true
SEED_DEMO=true
```

Use `latest` instead of `1.0.3` only if you want every redeploy to pull the newest main build.

### Real deployment instead of the demo

Set:

```env
NEXT_PUBLIC_DEMO_MODE=false
SEED_DEMO=false
```

A fresh volume still gets the schema (`drizzle-kit push`) but no demo rows. Onboard the first community at `/onboarding`.

## 3. Add the domain

In Dokploy, add a domain to the `nivaasa` service:

- **Host:** `nivaasa.karthikmprakash.online`
- **Service:** `nivaasa`
- **Container port:** `3000`
- **HTTPS:** enabled (Let's Encrypt via Traefik)

The compose file uses `expose: "3000"`; Dokploy routes the domain to that port. Do not publish a host port unless you need direct access.

## 4. Volumes

The compose file creates two named volumes:

| Volume | Mount | Contents |
|---|---|---|
| `nivaasa-data` | `/app/data` | SQLite database (`nivaasa.db`) |
| `nivaasa-uploads` | `/app/apps/web/public/uploads` | Uploaded documents and images |

The first boot copies nothing and runs `drizzle-kit push`; if the database is new and `SEED_DEMO=true`, it seeds the Verdant Heights + Lakeview demo. Later boots keep the volume and never reseed.

## 5. First deploy

1. Save the compose and environment.
2. Click **Deploy**.
3. Watch the logs for `Starting Nivaasa` and the demo seed line.
4. Open `https://nivaasa.karthikmprakash.online/api/health` — it must return `{"ok":true,...}`.
5. Open the site, sign in with `resident@nivaasa.app` / `demo1234`, and verify the blue logo and CTA animation.

## 6. Updates

1. Push a tag (for example `v1.0.3`); GitHub Actions publishes `ghcr.io/karthikmprakash/nivaasa:1.0.3`.
2. In Dokploy, change `NIVAASA_IMAGE` to the new tag (or keep `latest`).
3. Redeploy. The database and uploads volumes survive.

## 7. Backups

Stop writes briefly, then snapshot the volume:

```bash
docker run --rm \
  -v nivaasa-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'tar czf /backup/nivaasa-data-$(date +%F).tgz -C /data .'
```

For a consistent SQLite copy without stopping the app:

```bash
docker compose exec nivaasa node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/nivaasa.db');
db.backup('/app/data/backup-' + Date.now() + '.db').then(() => process.exit(0));
"
```

Copy the backup out of the volume afterwards.

## 8. Local image test

```bash
docker build -t nivaasa:local .
docker run --rm -p 3100:3000 \
  -e SEED_DEMO=true \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3100 \
  -v nivaasa-data:/app/data \
  nivaasa:local
```

Then open `http://localhost:3100` and `http://localhost:3100/api/health`.

## Troubleshooting

- **`manifest unknown` on pull:** the image tag does not exist yet, or the package is private without registry credentials.
- **Healthcheck fails:** check the container logs; the entrypoint may still be running `drizzle-kit push` on first boot (allow ~40 s).
- **Login loops / no data:** confirm `SEED_DEMO=true` on the very first boot, or onboard at `/onboarding` for a real deployment.
- **Uploads disappear after redeploy:** the uploads volume is missing or mounted at the wrong path.
- **Wrong absolute URLs:** `NEXT_PUBLIC_APP_URL` is baked at image build time; use the published image built for this domain, or rebuild with the correct build arg.
