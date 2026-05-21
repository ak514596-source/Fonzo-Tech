# Fonzo Tech source export

This archive contains the editable source code for the Fonzo Tech project, not only the production build.

Included:

- `client/src/components` — React UI, brand, layout, and product components.
- `client/src/pages` — customer website, checkout, auth, team portal, stock/listing manager pages.
- `client/src/lib` — cart, auth, theme, API client, and formatting helpers.
- `server` — Express backend used in the local/fullstack preview.
- `api` — Vercel API function used for the deployed version.
- `shared/schema.ts` — shared product, order, OTP, and auth schemas.
- `client/public` — SEO files such as `robots.txt` and `sitemap.xml`.
- Config files including `package.json`, `vite.config.ts`, `tailwind.config.ts`, `vercel.json`, and TypeScript config.

Excluded:

- `node_modules`
- `dist`
- `.vercel`
- local SQLite database/runtime files
- Git history

To run locally:

```bash
npm install
npm run dev
```

To build:

```bash
npm run build
```
