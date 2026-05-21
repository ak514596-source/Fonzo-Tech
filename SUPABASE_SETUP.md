# Fonzo Tech — Supabase database setup

This guide connects the Fonzo Tech website and team portal to one shared
Supabase database. Once done, anything the team changes in the portal — a
price, stock level, a new product, an order status — is immediately live on
the customer website, because both use the same database.

You only need to do this once. It takes about 10 minutes.

---

## Step 1 — Create the database tables

1. Open your project at **supabase.com**.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open the file **`supabase-setup.sql`** (included in this project), copy
   everything in it, and paste it into the editor.
5. Click **Run** (or press Ctrl/Cmd + Enter).

You should see a success message. This creates five tables — `products`,
`orders`, `users`, `otp_codes`, `sessions` — and adds the starter product
catalogue. Running it again later is safe; it won't duplicate anything.

To check it worked: click **Table Editor** in the sidebar and open the
`products` table — you should see 14 products.

---

## Step 2 — Get your two connection values

You need two things from Supabase.

**A. Project URL**
Already known for your project:
`https://xkbmjrljtxyzmdkawhof.supabase.co`
(You can also find it under **Project Settings → API**.)

**B. service_role key**
1. Click **Project Settings** (the gear icon) → **API Keys**.
2. Find the key labelled **`service_role`** (it may also say **secret**).
3. Click to reveal it and copy it.

> ⚠️ **Keep the service_role key private.** It has full access to your
> database. It is only ever used on the server. Never paste it into frontend
> code, never commit it to GitHub, never share it publicly. (You do **not**
> need to send it to anyone — you'll paste it straight into Vercel.)

---

## Step 3 — Add the values to Vercel (the live website)

1. Go to **vercel.com** and open the Fonzo Tech project.
2. Click **Settings → Environment Variables**.
3. Add these two variables (select all environments — Production, Preview,
   Development):

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | `https://xkbmjrljtxyzmdkawhof.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(the service_role key from Step 2)* |

4. Optionally add `TEAM_EMAILS` — a comma-separated list of staff emails
   allowed into the portal. If you skip it, the default is
   `ak514596@gmail.com,team@fonzotech.co.uk,admin@fonzotech.co.uk`.
5. Go to the **Deployments** tab and **redeploy** the latest deployment so it
   picks up the new variables.

After redeploying, the live site is running on the shared database.

---

## Step 4 — (Optional) Run it on your own computer

Only needed if you want to run the project locally with `npm run dev`.

1. In the project folder, copy `.env.example` to a new file named `.env`.
2. Open `.env` and fill in `SUPABASE_SERVICE_ROLE_KEY` (the URL is already
   filled in).
3. Run:

   ```bash
   npm install
   npm run dev
   ```

The local site and the live site will now read and write the **same**
database.

---

## Step 5 — Check that syncing works

1. Open the team portal and sign in (use an email from the allow-list).
2. Change a product's price or stock, or mark an item out of stock.
3. Open the customer website — the change is already there.

That is the auto-sync working: one database, two front doors.

---

## What changed in the code

- `server/storage.ts` and `api/index.ts` now read and write Supabase instead
  of an in-memory list (which used to reset and never persisted).
- `better-sqlite3` was removed — it is no longer needed.
- The data layer is the only thing that changed. The website pages, the
  portal pages, and the product/order logic are untouched.

## Notes & next steps

- **Login codes (OTP):** for now the 6-digit code is still shown on screen,
  because email/SMS sending isn't connected yet. Wiring that up is a later
  hardening step — see the main recommendation document.
- **Backups:** Supabase's free plan keeps your data, but does not include
  automatic daily backups. Consider the Pro plan later, or export the tables
  periodically, once real orders start coming in.
- **Putting the portal on `portal.fonzotech.co.uk`:** that is the next stage
  and is independent of this database work.
