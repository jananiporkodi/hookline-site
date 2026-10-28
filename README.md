# Hookline website

Static site plus one Cloudflare Pages advanced-mode worker (`public/_worker.js`).

- `public/` is the whole site. Cloudflare Pages serves it with no build step.
- `public/_worker.js` handles `/api/lead` (waitlist, newsletter, booking, corporate forms), `/api/plan` (free LinkedIn plan via the Claude API) and `/admin` (signups list, CSV at `/admin.csv`).

## Cloudflare Pages settings
- Build command: none. Build output directory: `public`
- D1 binding: `DB` (tables are created automatically on first use)
- Secrets: `ANTHROPIC_API_KEY`, `ADMIN_KEY`
- Optional variables: `CLAUDE_MODEL`, `PLAN_DAILY_CAP` (default 150)

Open signups at `/admin?key=YOUR_ADMIN_KEY`.

## Local testing
`npx wrangler pages dev public --d1 DB=hookline-local --binding ADMIN_KEY=testkey`
