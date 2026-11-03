# Contributing to Nivaasa

Nivaasa is an open-source community operating system. Contributions are welcome — code, design, docs, reproductions and deployment feedback.

## Set up

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Demo accounts use `demo1234`:

- `resident@nivaasa.app`
- `admin@nivaasa.app`
- `guard@nivaasa.app`
- `accountant@nivaasa.app`
- `owner@nivaasa.app`

`npm run db:seed` **wipes and reseeds** the local database. Never run it against a database with real data.

## Before you open a PR

```bash
npm run typecheck
npm run test:ui --workspace @mycommunity/web
npm run build
```

Add a focused test when you change billing, permissions, visitor state or any other rule that can quietly break. Include screenshots or a short recording for UI changes, at desktop and mobile widths.

## Branches and commits

- Branch from `main`; use a descriptive name such as `fix/receipt-rounding` or `feat/amenity-waitlist`.
- Keep PRs small enough to review in one sitting.
- Write commit subjects in the imperative mood: `fix: align receipt totals`, `feat: add visitor passes`.
- Link the issue the PR closes.

## Code and design

- TypeScript, React Server Components and Tailwind CSS 4. Follow the patterns around you rather than introducing a second styling or data layer.
- Use the tokens in `apps/web/src/app/globals.css`; do not hard-code brand colours in components.
- The brand mark, wordmark, icons and motion live in [`brand/`](brand/README.md). Changes to them should keep the SVG and animation sources in sync.
- Accessible names, keyboard focus and reduced-motion behaviour are part of the definition of done.
- Never commit `.env` files, tokens, real resident data or `data/*.db`.

## Database changes

Update `apps/web/src/db/schema.ts`, run `npm run db:push` locally, and mention the migration in the PR. The demo seed is `apps/web/src/db/seed.ts`; keep it working.

## Security

Read [`SECURITY.md`](SECURITY.md). Report vulnerabilities through GitHub Security Advisories, not public issues.

## Deployment

The production image is built by `.github/workflows/docker.yml` and published to GHCR. The Dokploy runbook is [`docs/deploy-dokploy.md`](docs/deploy-dokploy.md). Do not commit deployment secrets.

## Conduct

By participating, you agree to the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
