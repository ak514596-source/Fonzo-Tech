# Fonzo Tech — Database setup (Neon Postgres via Vercel)

The website and the team portal share **one Neon Postgres database**. That is
what keeps them in sync: a price/stock/product change made in the portal is
immediately live on the customer site, because there is only ever one
product list.

Neon was chosen over Supabase because its free plan allows up to 20 projects
and paused databases **wake automatically in under a second** when a visitor
arrives — no manual restore step.

Setup is one step, done in the Vercel dashboard. **There is no SQL to run** —
the app creates its tables and seeds the starter catalogue automatically the
first time it runs.

---

## Step 1 — Add a Neon database in Vercel

1. Open **vercel.com** → your **fonzo-tech** project.
2. Click the **Storage** tab.
3. Click **Create Database** → choose **Neon** (Serverless Postgres).
4. Accept the defaults (region: pick **London / eu-west** or Frankfurt),
   click **Create**, and when asked, **connect it to the fonzo-tech project**
   for all environments.

That's it. Vercel automatically adds `DATABASE_URL` (and related variables)
to the project — no copying or pasting of secrets.

> The old `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` variables are no
> longer used. You can delete them from Settings → Environment Variables.

## Step 2 — Redeploy

Push any commit (or click **Redeploy** on the latest deployment). On the
first request, the app will create its five tables (`products`, `orders`,
`users`, `otp_codes`, `sessions`) and insert the 14 starter products.

## Step 3 — Check it works

1. Open the shop — products should load.
2. Open the team portal, sign in, change a price.
3. Reload the shop — the change is there. That's the shared database working.

---

## Local development (optional)

To run `npm run dev` locally you need the same `DATABASE_URL`:

1. In Vercel → Storage → your Neon database, open the **`.env.local`** tab and
   copy the `DATABASE_URL` line, or copy the connection string from the Neon
   dashboard.
2. In the project folder, copy `.env.example` to `.env` and paste it in.
3. `npm install && npm run dev`.

Local and live then share the same database.

## Notes

- **Free plan:** ~0.5 GB storage — plenty for the catalogue and orders. The
  database sleeps after a few idle minutes and wakes automatically (~0.5 s)
  on the next visit.
- **Login codes (OTP)** are still shown on screen because email/SMS delivery
  isn't wired up yet — that's the next hardening step.
- **Backups / growth:** if the business takes off, Neon's paid tier (from
  $19/mo) removes sleeping entirely and adds point-in-time restore.
