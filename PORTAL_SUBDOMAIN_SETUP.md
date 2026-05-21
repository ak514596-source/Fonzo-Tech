# Fonzo Tech — Team Portal subdomain setup

This connects **portal.fonzotech.co.uk** to the project so it opens straight
into the private team portal, while **fonzotech.co.uk** stays the customer shop.

Both run from the same deployment and the same Supabase database — the app
simply detects which address it was opened on:

- **fonzotech.co.uk** → customer storefront (shop, product pages, checkout)
- **portal.fonzotech.co.uk** → staff login, then the team portal

The subdomain is free — you already own `fonzotech.co.uk`.

---

## Step 1 — Deploy the updated code

Make sure the latest code from this project is deployed to Vercel (the version
that contains `client/src/lib/portal.ts`). Without it, the subdomain would just
show the shop. If you're unsure, push/redeploy first.

---

## Step 2 — Add the subdomain in Vercel

1. Go to **vercel.com** and open the Fonzo Tech project.
2. Click **Settings → Domains**.
3. In the box, type **`portal.fonzotech.co.uk`** and click **Add**.
4. Vercel will then show you the **DNS record** it needs. It is normally:

   | Type  | Name     | Value                   |
   |-------|----------|-------------------------|
   | CNAME | `portal` | `cname.vercel-dns.com`  |

   > Vercel shows the exact value on screen — always use what Vercel shows,
   > as it occasionally differs.

---

## Step 3 — Add the DNS record

This is done wherever the DNS for `fonzotech.co.uk` is managed — usually the
company you bought the domain from (e.g. GoDaddy, Namecheap, Cloudflare, IONOS,
123-Reg), or Vercel itself if your domain is already on Vercel.

1. Open the DNS settings for `fonzotech.co.uk`.
2. Add a new record with the **Type / Name / Value** that Vercel showed you in
   Step 2 (the CNAME above).
3. Save.

If `fonzotech.co.uk`'s DNS is already managed by Vercel, Vercel adds the record
for you automatically and you can skip this step.

---

## Step 4 — Wait, then check

1. Back on the Vercel **Domains** page, `portal.fonzotech.co.uk` will move to a
   **Valid** state once the DNS record is detected. This usually takes a few
   minutes, occasionally up to a few hours.
2. Vercel issues the HTTPS (SSL) certificate automatically — nothing to do.
3. When it shows valid, open **https://portal.fonzotech.co.uk** — it should
   load straight to the **team portal login**.

---

## What staff and customers see

| | fonzotech.co.uk | portal.fonzotech.co.uk |
|---|---|---|
| Lands on | The shop homepage | Staff login → team portal |
| Shop, cart, checkout | Yes | No |
| Product / stock / order management | No | Yes (after login) |
| Old links like `/team`, `/manager` | Redirect to the portal subdomain | — |
| Listed on Google | Yes | No (set to `noindex`) |

Customers never see portal controls. Staff just bookmark
`portal.fonzotech.co.uk`. Both still read and write the same Supabase
database, so stock and pricing stay perfectly in sync.

---

## Notes

- **Security:** access is enforced on the server — every product/stock/order
  change requires a signed-in staff session, no matter which address it comes
  from. The separate subdomain is for clarity and tidiness; the lock itself is
  the server-side check added in Stage 1.
- **Previewing before DNS is ready:** add `?portal=1` to any address to force
  the portal view — for example `https://fonzotech.co.uk/?portal=1`, or a
  Vercel preview URL with `?portal=1` on the end. This lets you check the
  portal immediately, without waiting for the `portal.fonzotech.co.uk` DNS to
  propagate. It is not a security risk — every staff action is still verified
  on the server.
- **Testing locally:** the portal view also appears on any `portal.` hostname,
  so you can try it at `http://portal.localhost:5000` while running
  `npm run dev`.
- **Email login codes** are still shown on screen for now — wiring up real
  email/SMS delivery is the remaining hardening step.
