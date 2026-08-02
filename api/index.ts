// ---------------------------------------------------------------------------
// Fonzo Tech — Vercel API function (the deployed production backend).
//
// Reads and writes the shared Neon Postgres database. The customer website and
// the team portal both go through here, so a change made in the portal (price,
// stock, new product, order status) is immediately live on the storefront —
// there is only ever one database.
//
// DATABASE_URL is injected automatically by Vercel's Neon integration.
// Tables are created and the starter catalogue seeded automatically on first
// use — no manual SQL step.
// ---------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // staff stay logged in for 7 days
const OTP_TTL_MS = 10 * 60 * 1000; // login codes are valid for 10 minutes

// Emails allowed to sign in to the team portal. Override with the TEAM_EMAILS
// environment variable (comma-separated) without touching the code.
const TEAM_ALLOW_LIST = (
  process.env.TEAM_EMAILS ||
  "ak514596@gmail.com,team@fonzotech.co.uk,admin@fonzotech.co.uk"
)
  .split(",")
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// ---------------------------------------------------------------------------
// Schema bootstrap (runs once per warm instance)
// ---------------------------------------------------------------------------

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS products (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    category text NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    condition text NOT NULL,
    storage text NOT NULL DEFAULT '',
    color text NOT NULL DEFAULT '',
    price real NOT NULL,
    "originalPrice" real,
    stock integer NOT NULL DEFAULT 0,
    rating real NOT NULL DEFAULT 4.8,
    "reviewCount" integer NOT NULL DEFAULT 0,
    "shortDescription" text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    featured boolean NOT NULL DEFAULT false,
    "imageUrl" text NOT NULL DEFAULT '',
    "visualKey" text NOT NULL DEFAULT 'phone'
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "orderNumber" text NOT NULL,
    "customerName" text NOT NULL,
    "customerEmail" text NOT NULL,
    "customerPhone" text NOT NULL DEFAULT '',
    "deliveryMethod" text NOT NULL,
    address text NOT NULL DEFAULT '',
    "itemsJson" text NOT NULL,
    subtotal real NOT NULL,
    shipping real NOT NULL,
    total real NOT NULL,
    "paymentStatus" text NOT NULL DEFAULT 'Payment pending',
    "orderStatus" text NOT NULL DEFAULT 'New',
    "paymentProvider" text NOT NULL DEFAULT 'Not connected',
    "createdAt" text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL DEFAULT '',
    role text NOT NULL DEFAULT 'customer',
    "createdAt" text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL,
    code text NOT NULL,
    "expiresAt" text NOT NULL,
    used boolean NOT NULL DEFAULT false,
    "createdAt" text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY,
    "userId" integer NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    "createdAt" text NOT NULL DEFAULT '',
    "expiresAt" text NOT NULL
  )`,
];

const SEED: Array<Record<string, unknown>> = [
  { title: "iPhone 15 Pro Max", category: "iPhone", brand: "Apple", model: "A2849", condition: "Brand New", storage: "256GB", color: "Natural Titanium", price: 1199, originalPrice: 1299, stock: 12, rating: 4.9, reviewCount: 384, shortDescription: "Titanium build, A17 Pro, 5x telephoto.", description: "The iPhone 15 Pro Max delivers a titanium chassis, A17 Pro chip, customizable Action button and a 5x telephoto camera system. Every device is verified by Fonzo Tech engineers.", featured: true, visualKey: "phone" },
  { title: "iPhone 14", category: "iPhone", brand: "Apple", model: "A2649", condition: "Excellent", storage: "128GB", color: "Midnight", price: 619, originalPrice: 799, stock: 22, rating: 4.7, reviewCount: 512, shortDescription: "Certified pre-owned, battery health 90%+.", description: "Certified pre-owned iPhone 14. Battery health 90%+, no visible wear, fully unlocked, includes a fast-charge USB-C cable.", featured: false, visualKey: "phone" },
  { title: "Samsung Galaxy S24 Ultra", category: "Android", brand: "Samsung", model: "SM-S928B", condition: "Brand New", storage: "512GB", color: "Titanium Black", price: 1349, originalPrice: 1419, stock: 8, rating: 4.8, reviewCount: 207, shortDescription: "200MP camera, S Pen, Galaxy AI.", description: "Galaxy S24 Ultra ships sealed with full Samsung warranty. Includes the new Galaxy AI experiences and the integrated S Pen.", featured: true, visualKey: "phone" },
  { title: "Google Pixel 8 Pro", category: "Android", brand: "Google", model: "GC3VE", condition: "Like New", storage: "256GB", color: "Obsidian", price: 749, originalPrice: 999, stock: 14, rating: 4.6, reviewCount: 134, shortDescription: "Tensor G3, Magic Editor, 7 years of updates.", description: "Open-box Pixel 8 Pro inspected and re-sealed by Fonzo Tech. Tensor G3 chip, computational photography stack, 7 years of OS support.", featured: false, visualKey: "phone" },
  { title: 'MacBook Pro 14" M3 Pro', category: "Mac", brand: "Apple", model: "MRX33", condition: "Brand New", storage: "512GB / 18GB RAM", color: "Space Black", price: 1999, originalPrice: 2099, stock: 6, rating: 4.9, reviewCount: 88, shortDescription: "Liquid Retina XDR, M3 Pro chip.", description: 'MacBook Pro 14" with M3 Pro, Liquid Retina XDR display and up to 18 hours battery life. Sealed Apple stock with full one-year warranty.', featured: true, visualKey: "laptop" },
  { title: 'MacBook Air 13" M2', category: "Mac", brand: "Apple", model: "MLY13", condition: "Refurbished", storage: "256GB / 8GB RAM", color: "Midnight", price: 899, originalPrice: 1199, stock: 18, rating: 4.8, reviewCount: 220, shortDescription: "Fanless M2, 18h battery, certified refurbished.", description: "Certified refurbished MacBook Air M2. Battery cycle count under 50, no cosmetic defects, ships with a new MagSafe cable.", featured: false, visualKey: "laptop" },
  { title: 'iPad Pro 12.9" M2', category: "iPad", brand: "Apple", model: "MNXT3", condition: "Like New", storage: "256GB Wi-Fi", color: "Space Gray", price: 949, originalPrice: 1199, stock: 9, rating: 4.8, reviewCount: 76, shortDescription: "Liquid Retina XDR, Apple Pencil hover.", description: 'iPad Pro 12.9" with M2 chip, Liquid Retina XDR mini-LED display, ProMotion 120Hz, and Apple Pencil hover support.', featured: true, visualKey: "tablet" },
  { title: "Samsung Galaxy Tab S9", category: "iPad", brand: "Samsung", model: "SM-X710", condition: "Brand New", storage: "128GB", color: "Graphite", price: 699, originalPrice: 799, stock: 11, rating: 4.6, reviewCount: 54, shortDescription: "Dynamic AMOLED 2X, S Pen included.", description: 'Galaxy Tab S9 with 11" Dynamic AMOLED 2X display, IP68 rating, Snapdragon 8 Gen 2 for Galaxy.', featured: false, visualKey: "tablet" },
  { title: "Meta Quest 3", category: "VR", brand: "Meta", model: "128GB", condition: "Brand New", storage: "128GB", color: "White", price: 499, originalPrice: 549, stock: 16, rating: 4.7, reviewCount: 412, shortDescription: "Mixed reality, Snapdragon XR2 Gen 2.", description: "Meta Quest 3 standalone mixed-reality headset. Snapdragon XR2 Gen 2, 4K+ Infinite Display, full-color passthrough.", featured: true, visualKey: "vr" },
  { title: "Apple Vision Pro", category: "VR", brand: "Apple", model: "MQL83", condition: "Brand New", storage: "256GB", color: "Silver", price: 3499, originalPrice: null, stock: 3, rating: 4.5, reviewCount: 41, shortDescription: "Spatial computing, micro-OLED, M2 + R1.", description: "Apple Vision Pro spatial computer. Micro-OLED displays delivering 23 million pixels, dual-chip M2 + R1 architecture.", featured: false, visualKey: "vr" },
  { title: "Sonos Era 300", category: "Speakers", brand: "Sonos", model: "E30", condition: "Brand New", storage: "", color: "Matte Black", price: 449, originalPrice: 499, stock: 20, rating: 4.7, reviewCount: 98, shortDescription: "Spatial audio, Wi-Fi + Bluetooth.", description: "Sonos Era 300 spatial audio speaker with Dolby Atmos, six drivers, Wi-Fi 6 and Bluetooth 5.0.", featured: false, visualKey: "speaker" },
  { title: "Bose SoundLink Max", category: "Speakers", brand: "Bose", model: "SLM", condition: "Brand New", storage: "", color: "Blue Dusk", price: 399, originalPrice: null, stock: 15, rating: 4.6, reviewCount: 132, shortDescription: "Portable, 20-hour battery, IP67.", description: "Bose SoundLink Max portable Bluetooth speaker. 20-hour battery, IP67 dust and water resistance, USB-C charging.", featured: true, visualKey: "speaker" },
  { title: "AirPods Pro (2nd gen, USB-C)", category: "Accessories", brand: "Apple", model: "MTJV3", condition: "Brand New", storage: "", color: "White", price: 229, originalPrice: 249, stock: 40, rating: 4.9, reviewCount: 1244, shortDescription: "ANC, Adaptive Audio, USB-C case.", description: "AirPods Pro (2nd generation) with USB-C MagSafe case, Adaptive Audio, Personalized Spatial Audio.", featured: false, visualKey: "accessory" },
  { title: "Anker 65W GaN Charger", category: "Accessories", brand: "Anker", model: "A2664", condition: "Brand New", storage: "", color: "Black", price: 39, originalPrice: 49, stock: 80, rating: 4.8, reviewCount: 612, shortDescription: "Compact GaN II, fast-charges MacBooks.", description: "Compact 65W GaN II charger that fast-charges MacBook Air M2, iPhone 15 series and Galaxy flagships.", featured: false, visualKey: "accessory" },
];

// Columns that may be written on products (API field -> quoted SQL identifier).
const PRODUCT_COLUMNS: Record<string, string> = {
  title: '"title"', category: '"category"', brand: '"brand"', model: '"model"',
  condition: '"condition"', storage: '"storage"', color: '"color"', price: '"price"',
  originalPrice: '"originalPrice"', stock: '"stock"', rating: '"rating"',
  reviewCount: '"reviewCount"', shortDescription: '"shortDescription"',
  description: '"description"', featured: '"featured"', imageUrl: '"imageUrl"',
  visualKey: '"visualKey"',
};

const ORDER_COLUMNS: Record<string, string> = {
  orderNumber: '"orderNumber"', customerName: '"customerName"', customerEmail: '"customerEmail"',
  customerPhone: '"customerPhone"', deliveryMethod: '"deliveryMethod"', address: '"address"',
  itemsJson: '"itemsJson"', subtotal: '"subtotal"', shipping: '"shipping"', total: '"total"',
  paymentStatus: '"paymentStatus"', orderStatus: '"orderStatus"', paymentProvider: '"paymentProvider"',
  createdAt: '"createdAt"',
};

const ORDER_UPDATE_COLUMNS: Record<string, string> = {
  paymentStatus: '"paymentStatus"', orderStatus: '"orderStatus"',
};

function buildInsert(table: string, columns: Record<string, string>, input: Record<string, unknown>) {
  const keys = Object.keys(input).filter((k) => columns[k] !== undefined && input[k] !== undefined);
  return {
    text: `INSERT INTO ${table} (${keys.map((k) => columns[k]).join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
    values: keys.map((k) => input[k]),
  };
}

function buildUpdate(table: string, columns: Record<string, string>, input: Record<string, unknown>, id: number) {
  const keys = Object.keys(input).filter((k) => columns[k] !== undefined && input[k] !== undefined);
  if (keys.length === 0) return null;
  return {
    text: `UPDATE ${table} SET ${keys.map((k, i) => `${columns[k]} = $${i + 1}`).join(", ")} WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map((k) => input[k]), id],
  };
}

let readyPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await sql.query(statement);
      }
      const rows = await sql`SELECT count(*)::int AS c FROM products`;
      if (Number(rows[0]?.c ?? 0) === 0) {
        for (const item of SEED) {
          const q = buildInsert("products", PRODUCT_COLUMNS, item);
          await sql.query(q.text, q.values);
        }
      }
    })().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function send(res: any, status: number, body?: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (body === undefined) return res.end();
  res.end(JSON.stringify(body));
}

async function readBody(req: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const idFrom = (path: string, prefix: string) => Number(path.slice(prefix.length).split("/")[0]);

// Pull the bearer token out of the Authorization header, if present.
function getToken(req: any): string | null {
  const header = String(req.headers?.authorization || req.headers?.Authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// Look up the staff session behind a request, or null if there isn't a valid one.
async function getSession(req: any) {
  const token = getToken(req);
  if (!token || !sql) return null;
  const rows = await sql`SELECT * FROM sessions WHERE token = ${token}`;
  const session = rows[0] as { role: string; expiresAt: string } | undefined;
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
    return null;
  }
  return session;
}

// Gate: returns true only when the caller is a signed-in staff member.
// On failure it sends the 401/403 response and the caller must stop.
async function requireTeam(req: any, res: any): Promise<boolean> {
  const session = await getSession(req);
  if (!session) {
    send(res, 401, { error: "Sign in to the team portal to continue." });
    return false;
  }
  if (session.role !== "team") {
    send(res, 403, { error: "Staff access only." });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  try {
    if (!sql) {
      return send(res, 500, {
        error:
          "Database is not configured. Add the Neon integration in Vercel " +
          "(Storage tab) or set DATABASE_URL in the project environment variables.",
      });
    }
    await ensureReady();

    const url = new URL(req.url || "/", "https://fonzotech.co.uk");
    const path = url.pathname;
    const method = req.method || "GET";

    // ---- Products: public reads ------------------------------------------
    if (method === "GET" && path === "/api/products") {
      const rows = await sql`SELECT * FROM products ORDER BY id ASC`;
      return send(res, 200, rows);
    }

    if (method === "GET" && path.startsWith("/api/products/")) {
      const rows = await sql`SELECT * FROM products WHERE id = ${idFrom(path, "/api/products/")}`;
      return rows[0] ? send(res, 200, rows[0]) : send(res, 404, { error: "Not found" });
    }

    // ---- Products: staff-only writes -------------------------------------
    if (method === "POST" && path === "/api/products") {
      if (!(await requireTeam(req, res))) return;
      const input = await readBody(req);
      if (!input.title || !input.category || !input.brand || !input.model) {
        return send(res, 400, { error: "Missing product fields" });
      }
      const q = buildInsert("products", PRODUCT_COLUMNS, input);
      const rows = await sql.query(q.text, q.values);
      return send(res, 201, rows[0]);
    }

    if (method === "PATCH" && path.startsWith("/api/products/")) {
      if (!(await requireTeam(req, res))) return;
      const patch = await readBody(req);
      const q = buildUpdate("products", PRODUCT_COLUMNS, patch, idFrom(path, "/api/products/"));
      if (!q) return send(res, 400, { error: "No valid fields to update" });
      const rows = await sql.query(q.text, q.values);
      return rows[0] ? send(res, 200, rows[0]) : send(res, 404, { error: "Not found" });
    }

    if (method === "DELETE" && path.startsWith("/api/products/")) {
      if (!(await requireTeam(req, res))) return;
      await sql`DELETE FROM products WHERE id = ${idFrom(path, "/api/products/")}`;
      return send(res, 204);
    }

    // ---- Orders: staff-only list -----------------------------------------
    if (method === "GET" && path === "/api/orders") {
      if (!(await requireTeam(req, res))) return;
      const rows = await sql`SELECT * FROM orders ORDER BY id DESC`;
      return send(res, 200, rows);
    }

    // ---- Orders: customers place orders (public) -------------------------
    if (method === "POST" && path === "/api/orders") {
      const input = await readBody(req);
      const items: any[] = input.items || [];
      if (!items.length) return send(res, 400, { error: "Order must include at least one item" });

      const ids = items.map((line) => Number(line.productId));
      const productRows = (await sql`SELECT * FROM products WHERE id = ANY(${ids})`) as any[];

      const snapshot = items.map((line) => {
        const product = productRows.find((row) => row.id === line.productId);
        if (!product) throw new Error("One or more products are unavailable");
        if (product.stock < line.quantity) {
          throw new Error(`${product.title} only has ${product.stock} in stock`);
        }
        return {
          productId: product.id,
          title: product.title,
          brand: product.brand,
          model: product.model,
          condition: product.condition,
          price: product.price,
          quantity: line.quantity,
          lineTotal: product.price * line.quantity,
        };
      });

      const subtotal = snapshot.reduce((sum, item) => sum + item.lineTotal, 0);
      const shipping = input.deliveryMethod === "delivery" ? (subtotal >= 100 ? 0 : 7.95) : 0;
      const order = {
        orderNumber: `FZ-${Date.now().toString().slice(-8)}`,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || "",
        deliveryMethod: input.deliveryMethod,
        address: input.address || "",
        itemsJson: JSON.stringify(snapshot),
        subtotal,
        shipping,
        total: subtotal + shipping,
        paymentStatus: "Payment pending",
        orderStatus: "New",
        paymentProvider: "Not connected",
        createdAt: new Date().toISOString(),
      };

      const q = buildInsert("orders", ORDER_COLUMNS, order);
      const created = await sql.query(q.text, q.values);

      // Reduce stock for each ordered item.
      for (const line of items) {
        const product = productRows.find((row) => row.id === line.productId);
        if (product) {
          await sql`UPDATE products SET stock = ${Math.max(0, product.stock - line.quantity)} WHERE id = ${product.id}`;
        }
      }

      return send(res, 201, created[0]);
    }

    // ---- Orders: staff-only status updates -------------------------------
    if (method === "PATCH" && path.startsWith("/api/orders/")) {
      if (!(await requireTeam(req, res))) return;
      const patch = await readBody(req);
      const q = buildUpdate("orders", ORDER_UPDATE_COLUMNS, patch, idFrom(path, "/api/orders/"));
      if (!q) return send(res, 400, { error: "No valid fields to update" });
      const rows = await sql.query(q.text, q.values);
      return rows[0] ? send(res, 200, rows[0]) : send(res, 404, { error: "Not found" });
    }

    // ---- Authentication --------------------------------------------------
    if (method === "POST" && path === "/api/auth/request-otp") {
      const input = await readBody(req);
      const email = String(input.email || "").trim().toLowerCase();
      if (!email.includes("@")) return send(res, 400, { error: "Valid email is required" });
      const role = input.role || "customer";
      if (role === "team" && !TEAM_ALLOW_LIST.includes(email)) {
        return send(res, 400, { error: "This email is not allowed for team portal access." });
      }

      const previewOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
      await sql`
        INSERT INTO otp_codes (email, role, code, "expiresAt", used, "createdAt")
        VALUES (${email}, ${role}, ${previewOtp}, ${expiresAt}, false, ${new Date().toISOString()})
      `;

      if (input.mode === "signup") {
        await sql`
          INSERT INTO users (email, name, role, "createdAt")
          VALUES (${email}, ${input.name || ""}, ${role}, ${new Date().toISOString()})
          ON CONFLICT (email) DO NOTHING
        `;
      }
      // Preview-only: in production this code would be sent by email/SMS instead.
      return send(res, 200, { email, role, expiresAt, previewOtp });
    }

    if (method === "POST" && path === "/api/auth/verify-otp") {
      const input = await readBody(req);
      const email = String(input.email || "").trim().toLowerCase();
      const role = input.role || "customer";

      const rows = await sql`
        SELECT * FROM otp_codes
        WHERE email = ${email} AND role = ${role} AND code = ${String(input.otp || "")} AND used = false
        ORDER BY id DESC LIMIT 1
      `;
      const row = rows[0] as { id: number; expiresAt: string } | undefined;
      if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
        return send(res, 401, { error: "Invalid or expired OTP" });
      }
      await sql`UPDATE otp_codes SET used = true WHERE id = ${row.id}`;

      await sql`
        INSERT INTO users (email, name, role, "createdAt")
        VALUES (${email}, ${input.name || ""}, ${role}, ${new Date().toISOString()})
        ON CONFLICT (email) DO NOTHING
      `;
      if (input.name) {
        await sql`UPDATE users SET name = ${input.name} WHERE email = ${email}`;
      }

      const userRows = await sql`SELECT id, email, name, role FROM users WHERE email = ${email}`;
      const user = userRows[0];
      if (!user) return send(res, 500, { error: "Could not load user account" });

      const token = randomBytes(32).toString("hex");
      await sql`
        INSERT INTO sessions (token, "userId", email, role, "createdAt", "expiresAt")
        VALUES (${token}, ${user.id}, ${email}, ${role},
                ${new Date().toISOString()}, ${new Date(Date.now() + SESSION_TTL_MS).toISOString()})
      `;
      return send(res, 200, { user, token });
    }

    if (method === "POST" && path === "/api/auth/logout") {
      const token = getToken(req);
      if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    return send(res, 400, { error: (err as Error).message });
  }
}
