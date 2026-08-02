import type { Product, InsertProduct, UpdateProduct, Order, InsertOrder, UpdateOrder } from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Shared Neon Postgres database.
//
// Both the customer website and the team portal read and write THIS database,
// which is what keeps them in sync: there is only ever one product list and
// one order list.
//
// The connection string comes from DATABASE_URL, which Vercel's Neon
// integration injects automatically (POSTGRES_URL is accepted as a fallback).
// Tables are created and seeded automatically on first use — no manual SQL
// setup step is required.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // staff stay logged in for 7 days
const OTP_TTL_MS = 10 * 60 * 1000; // login codes are valid for 10 minutes

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  throw new Error(
    "Database is not configured. Set DATABASE_URL (Vercel: add the Neon " +
      "integration under Storage, or set it manually — see DATABASE_SETUP.md).",
  );
}

const sql = neon(DATABASE_URL);

// Emails allowed to sign in to the team portal. Override with the TEAM_EMAILS
// environment variable (comma-separated) without touching the code.
const TEAM_ALLOW_LIST = (
  process.env.TEAM_EMAILS ||
  "ak514596@gmail.com,team@fonzotech.co.uk,admin@fonzotech.co.uk"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Schema bootstrap — runs once per process, guarded by a promise.
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS products (
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
  );

  CREATE TABLE IF NOT EXISTS orders (
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
  );

  CREATE TABLE IF NOT EXISTS users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL DEFAULT '',
    role text NOT NULL DEFAULT 'customer',
    "createdAt" text NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    role text NOT NULL,
    code text NOT NULL,
    "expiresAt" text NOT NULL,
    used boolean NOT NULL DEFAULT false,
    "createdAt" text NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token text PRIMARY KEY,
    "userId" integer NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    "createdAt" text NOT NULL DEFAULT '',
    "expiresAt" text NOT NULL
  );
`;

let readyPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      // Neon's HTTP driver runs one statement per call — split the bootstrap.
      const statements = SCHEMA_SQL.split(/;\s*(?=CREATE)/g)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await sql.query(statement.endsWith(";") ? statement : `${statement};`);
      }
      await seedIfEmptyInternal();
    })().catch((err) => {
      readyPromise = null; // allow retry on next request
      throw err;
    });
  }
  return readyPromise;
}

// Columns staff are allowed to write on products. Keys are the API/TS field
// names; values are the quoted SQL identifiers. Anything not listed is ignored,
// which keeps dynamic UPDATEs safe.
const PRODUCT_COLUMNS: Record<string, string> = {
  title: '"title"',
  category: '"category"',
  brand: '"brand"',
  model: '"model"',
  condition: '"condition"',
  storage: '"storage"',
  color: '"color"',
  price: '"price"',
  originalPrice: '"originalPrice"',
  stock: '"stock"',
  rating: '"rating"',
  reviewCount: '"reviewCount"',
  shortDescription: '"shortDescription"',
  description: '"description"',
  featured: '"featured"',
  imageUrl: '"imageUrl"',
  visualKey: '"visualKey"',
};

const ORDER_UPDATE_COLUMNS: Record<string, string> = {
  paymentStatus: '"paymentStatus"',
  orderStatus: '"orderStatus"',
};

function buildInsert(table: string, columns: Record<string, string>, input: Record<string, unknown>) {
  const keys = Object.keys(input).filter((k) => columns[k] !== undefined && input[k] !== undefined);
  const identifiers = keys.map((k) => columns[k]).join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((k) => input[k]);
  return {
    text: `INSERT INTO ${table} (${identifiers}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
}

function buildUpdate(table: string, columns: Record<string, string>, input: Record<string, unknown>, id: number) {
  const keys = Object.keys(input).filter((k) => columns[k] !== undefined && input[k] !== undefined);
  if (keys.length === 0) return null;
  const sets = keys.map((k, i) => `${columns[k]} = $${i + 1}`).join(", ");
  const values = keys.map((k) => input[k]);
  return {
    text: `UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...values, id],
  };
}

export interface IStorage {
  listProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(input: InsertProduct): Promise<Product>;
  updateProduct(id: number, input: UpdateProduct): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  countProducts(): Promise<number>;
  listOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(input: InsertOrder): Promise<Order>;
  updateOrder(id: number, input: UpdateOrder): Promise<Order | undefined>;
  requestOtp(input: { email: string; name?: string; role: string; mode: string }): Promise<{ email: string; role: string; otp: string; expiresAt: string }>;
  verifyOtp(input: { email: string; otp: string; role: string; name?: string }): Promise<{ id: number; email: string; name: string; role: string } | undefined>;
  createSession(user: { id: number; email: string; role: string }): Promise<string>;
  getSession(token: string): Promise<{ userId: number; email: string; role: string } | undefined>;
  deleteSession(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async listProducts(): Promise<Product[]> {
    await ensureReady();
    const rows = await sql`SELECT * FROM products ORDER BY id ASC`;
    return rows as Product[];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    await ensureReady();
    const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
    return (rows[0] as Product) ?? undefined;
  }

  async createProduct(input: InsertProduct): Promise<Product> {
    await ensureReady();
    const q = buildInsert("products", PRODUCT_COLUMNS, input as Record<string, unknown>);
    const rows = await sql.query(q.text, q.values);
    return rows[0] as Product;
  }

  async updateProduct(id: number, input: UpdateProduct): Promise<Product | undefined> {
    await ensureReady();
    const q = buildUpdate("products", PRODUCT_COLUMNS, input as Record<string, unknown>, id);
    if (!q) return this.getProduct(id);
    const rows = await sql.query(q.text, q.values);
    return (rows[0] as Product) ?? undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    await ensureReady();
    const rows = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }

  async countProducts(): Promise<number> {
    const rows = await sql`SELECT count(*)::int AS c FROM products`;
    return Number(rows[0]?.c ?? 0);
  }

  async listOrders(): Promise<Order[]> {
    await ensureReady();
    const rows = await sql`SELECT * FROM orders ORDER BY id DESC`;
    return rows as Order[];
  }

  async getOrder(id: number): Promise<Order | undefined> {
    await ensureReady();
    const rows = await sql`SELECT * FROM orders WHERE id = ${id}`;
    return (rows[0] as Order) ?? undefined;
  }

  async createOrder(input: InsertOrder): Promise<Order> {
    await ensureReady();
    const record = { ...input, createdAt: new Date().toISOString() } as Record<string, unknown>;
    const ORDER_COLUMNS: Record<string, string> = {
      orderNumber: '"orderNumber"',
      customerName: '"customerName"',
      customerEmail: '"customerEmail"',
      customerPhone: '"customerPhone"',
      deliveryMethod: '"deliveryMethod"',
      address: '"address"',
      itemsJson: '"itemsJson"',
      subtotal: '"subtotal"',
      shipping: '"shipping"',
      total: '"total"',
      paymentStatus: '"paymentStatus"',
      orderStatus: '"orderStatus"',
      paymentProvider: '"paymentProvider"',
      createdAt: '"createdAt"',
    };
    const q = buildInsert("orders", ORDER_COLUMNS, record);
    const rows = await sql.query(q.text, q.values);
    return rows[0] as Order;
  }

  async updateOrder(id: number, input: UpdateOrder): Promise<Order | undefined> {
    await ensureReady();
    const q = buildUpdate("orders", ORDER_UPDATE_COLUMNS, input as Record<string, unknown>, id);
    if (!q) return this.getOrder(id);
    const rows = await sql.query(q.text, q.values);
    return (rows[0] as Order) ?? undefined;
  }

  async requestOtp(input: { email: string; name?: string; role: string; mode: string }) {
    await ensureReady();
    const email = input.email.trim().toLowerCase();
    if (input.role === "team" && !TEAM_ALLOW_LIST.includes(email)) {
      throw new Error("This email is not allowed for team portal access.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await sql`
      INSERT INTO otp_codes (email, role, code, "expiresAt", used, "createdAt")
      VALUES (${email}, ${input.role}, ${otp}, ${expiresAt}, false, ${new Date().toISOString()})
    `;

    if (input.mode === "signup") {
      await sql`
        INSERT INTO users (email, name, role, "createdAt")
        VALUES (${email}, ${input.name || ""}, ${input.role}, ${new Date().toISOString()})
        ON CONFLICT (email) DO NOTHING
      `;
    }

    return { email, role: input.role, otp, expiresAt };
  }

  async verifyOtp(input: { email: string; otp: string; role: string; name?: string }) {
    await ensureReady();
    const email = input.email.trim().toLowerCase();
    const rows = await sql`
      SELECT * FROM otp_codes
      WHERE email = ${email} AND role = ${input.role} AND code = ${input.otp} AND used = false
      ORDER BY id DESC LIMIT 1
    `;
    const row = rows[0] as { id: number; expiresAt: string } | undefined;
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) return undefined;
    await sql`UPDATE otp_codes SET used = true WHERE id = ${row.id}`;

    await sql`
      INSERT INTO users (email, name, role, "createdAt")
      VALUES (${email}, ${input.name || ""}, ${input.role}, ${new Date().toISOString()})
      ON CONFLICT (email) DO NOTHING
    `;
    if (input.name) {
      await sql`UPDATE users SET name = ${input.name} WHERE email = ${email}`;
    }

    const userRows = await sql`SELECT id, email, name, role FROM users WHERE email = ${email}`;
    return userRows[0] as { id: number; email: string; name: string; role: string } | undefined;
  }

  async createSession(user: { id: number; email: string; role: string }): Promise<string> {
    await ensureReady();
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    await sql`
      INSERT INTO sessions (token, "userId", email, role, "createdAt", "expiresAt")
      VALUES (${token}, ${user.id}, ${user.email}, ${user.role},
              ${now.toISOString()}, ${new Date(now.getTime() + SESSION_TTL_MS).toISOString()})
    `;
    return token;
  }

  async getSession(token: string): Promise<{ userId: number; email: string; role: string } | undefined> {
    if (!token) return undefined;
    await ensureReady();
    const rows = await sql`SELECT * FROM sessions WHERE token = ${token}`;
    const row = rows[0] as { userId: number; email: string; role: string; expiresAt: string } | undefined;
    if (!row) return undefined;
    if (new Date(row.expiresAt).getTime() < Date.now()) {
      await sql`DELETE FROM sessions WHERE token = ${token}`;
      return undefined;
    }
    return { userId: row.userId, email: row.email, role: row.role };
  }

  async deleteSession(token: string): Promise<void> {
    if (!token) return;
    await ensureReady();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
}

export const storage = new DatabaseStorage();

// ---------------------------------------------------------------------------
// Seed sample tech retail data on first boot (runs inside ensureReady).
// ---------------------------------------------------------------------------
const SEED: InsertProduct[] = [
  {
    title: "iPhone 15 Pro Max",
    category: "iPhone",
    brand: "Apple",
    model: "A2849",
    condition: "Brand New",
    storage: "256GB",
    color: "Natural Titanium",
    price: 1199,
    originalPrice: 1299,
    stock: 12,
    rating: 4.9,
    reviewCount: 384,
    shortDescription: "Titanium build, A17 Pro, 5x telephoto.",
    description:
      "The iPhone 15 Pro Max delivers a titanium chassis, A17 Pro chip, customizable Action button and a 5x telephoto camera system. Every device is verified by Fonzo Tech engineers.",
    featured: true,
    visualKey: "phone",
  },
  {
    title: "iPhone 14",
    category: "iPhone",
    brand: "Apple",
    model: "A2649",
    condition: "Excellent",
    storage: "128GB",
    color: "Midnight",
    price: 619,
    originalPrice: 799,
    stock: 22,
    rating: 4.7,
    reviewCount: 512,
    shortDescription: "Certified pre-owned, battery health 90%+.",
    description:
      "Certified pre-owned iPhone 14. Battery health 90%+, no visible wear, fully unlocked, includes a fast-charge USB-C cable.",
    featured: false,
    visualKey: "phone",
  },
  {
    title: "Samsung Galaxy S24 Ultra",
    category: "Android",
    brand: "Samsung",
    model: "SM-S928B",
    condition: "Brand New",
    storage: "512GB",
    color: "Titanium Black",
    price: 1349,
    originalPrice: 1419,
    stock: 8,
    rating: 4.8,
    reviewCount: 207,
    shortDescription: "200MP camera, S Pen, Galaxy AI.",
    description:
      "Galaxy S24 Ultra ships sealed with full Samsung warranty. Includes the new Galaxy AI experiences and the integrated S Pen.",
    featured: true,
    visualKey: "phone",
  },
  {
    title: "Google Pixel 8 Pro",
    category: "Android",
    brand: "Google",
    model: "GC3VE",
    condition: "Like New",
    storage: "256GB",
    color: "Obsidian",
    price: 749,
    originalPrice: 999,
    stock: 14,
    rating: 4.6,
    reviewCount: 134,
    shortDescription: "Tensor G3, Magic Editor, 7 years of updates.",
    description:
      "Open-box Pixel 8 Pro inspected and re-sealed by Fonzo Tech. Tensor G3 chip, computational photography stack, 7 years of OS support.",
    featured: false,
    visualKey: "phone",
  },
  {
    title: 'MacBook Pro 14" M3 Pro',
    category: "Mac",
    brand: "Apple",
    model: "MRX33",
    condition: "Brand New",
    storage: "512GB / 18GB RAM",
    color: "Space Black",
    price: 1999,
    originalPrice: 2099,
    stock: 6,
    rating: 4.9,
    reviewCount: 88,
    shortDescription: "Liquid Retina XDR, M3 Pro chip.",
    description:
      'MacBook Pro 14" with M3 Pro, Liquid Retina XDR display and up to 18 hours battery life. Sealed Apple stock with full one-year warranty.',
    featured: true,
    visualKey: "laptop",
  },
  {
    title: 'MacBook Air 13" M2',
    category: "Mac",
    brand: "Apple",
    model: "MLY13",
    condition: "Refurbished",
    storage: "256GB / 8GB RAM",
    color: "Midnight",
    price: 899,
    originalPrice: 1199,
    stock: 18,
    rating: 4.8,
    reviewCount: 220,
    shortDescription: "Fanless M2, 18h battery, certified refurbished.",
    description:
      "Certified refurbished MacBook Air M2. Battery cycle count under 50, no cosmetic defects, ships with a new MagSafe cable.",
    featured: false,
    visualKey: "laptop",
  },
  {
    title: 'iPad Pro 12.9" M2',
    category: "iPad",
    brand: "Apple",
    model: "MNXT3",
    condition: "Like New",
    storage: "256GB Wi-Fi",
    color: "Space Gray",
    price: 949,
    originalPrice: 1199,
    stock: 9,
    rating: 4.8,
    reviewCount: 76,
    shortDescription: "Liquid Retina XDR, Apple Pencil hover.",
    description:
      'iPad Pro 12.9" with M2 chip, Liquid Retina XDR mini-LED display, ProMotion 120Hz, and Apple Pencil hover support.',
    featured: true,
    visualKey: "tablet",
  },
  {
    title: "Samsung Galaxy Tab S9",
    category: "iPad",
    brand: "Samsung",
    model: "SM-X710",
    condition: "Brand New",
    storage: "128GB",
    color: "Graphite",
    price: 699,
    originalPrice: 799,
    stock: 11,
    rating: 4.6,
    reviewCount: 54,
    shortDescription: "Dynamic AMOLED 2X, S Pen included.",
    description:
      'Galaxy Tab S9 with 11" Dynamic AMOLED 2X display, IP68 rating, Snapdragon 8 Gen 2 for Galaxy.',
    featured: false,
    visualKey: "tablet",
  },
  {
    title: "Meta Quest 3",
    category: "VR",
    brand: "Meta",
    model: "128GB",
    condition: "Brand New",
    storage: "128GB",
    color: "White",
    price: 499,
    originalPrice: 549,
    stock: 16,
    rating: 4.7,
    reviewCount: 412,
    shortDescription: "Mixed reality, Snapdragon XR2 Gen 2.",
    description:
      "Meta Quest 3 standalone mixed-reality headset. Snapdragon XR2 Gen 2, 4K+ Infinite Display, full-color passthrough.",
    featured: true,
    visualKey: "vr",
  },
  {
    title: "Apple Vision Pro",
    category: "VR",
    brand: "Apple",
    model: "MQL83",
    condition: "Brand New",
    storage: "256GB",
    color: "Silver",
    price: 3499,
    stock: 3,
    rating: 4.5,
    reviewCount: 41,
    shortDescription: "Spatial computing, micro-OLED, M2 + R1.",
    description:
      "Apple Vision Pro spatial computer. Micro-OLED displays delivering 23 million pixels, dual-chip M2 + R1 architecture.",
    featured: false,
    visualKey: "vr",
  },
  {
    title: "Sonos Era 300",
    category: "Speakers",
    brand: "Sonos",
    model: "E30",
    condition: "Brand New",
    storage: "",
    color: "Matte Black",
    price: 449,
    originalPrice: 499,
    stock: 20,
    rating: 4.7,
    reviewCount: 98,
    shortDescription: "Spatial audio, Wi-Fi + Bluetooth.",
    description:
      "Sonos Era 300 spatial audio speaker with Dolby Atmos, six drivers, Wi-Fi 6 and Bluetooth 5.0.",
    featured: false,
    visualKey: "speaker",
  },
  {
    title: "Bose SoundLink Max",
    category: "Speakers",
    brand: "Bose",
    model: "SLM",
    condition: "Brand New",
    storage: "",
    color: "Blue Dusk",
    price: 399,
    stock: 15,
    rating: 4.6,
    reviewCount: 132,
    shortDescription: "Portable, 20-hour battery, IP67.",
    description:
      "Bose SoundLink Max portable Bluetooth speaker. 20-hour battery, IP67 dust and water resistance, USB-C charging.",
    featured: true,
    visualKey: "speaker",
  },
  {
    title: "AirPods Pro (2nd gen, USB-C)",
    category: "Accessories",
    brand: "Apple",
    model: "MTJV3",
    condition: "Brand New",
    storage: "",
    color: "White",
    price: 229,
    originalPrice: 249,
    stock: 40,
    rating: 4.9,
    reviewCount: 1244,
    shortDescription: "ANC, Adaptive Audio, USB-C case.",
    description:
      "AirPods Pro (2nd generation) with USB-C MagSafe case, Adaptive Audio, Personalized Spatial Audio.",
    featured: false,
    visualKey: "accessory",
  },
  {
    title: "Anker 65W GaN Charger",
    category: "Accessories",
    brand: "Anker",
    model: "A2664",
    condition: "Brand New",
    storage: "",
    color: "Black",
    price: 39,
    originalPrice: 49,
    stock: 80,
    rating: 4.8,
    reviewCount: 612,
    shortDescription: "Compact GaN II, fast-charges MacBooks.",
    description:
      "Compact 65W GaN II charger that fast-charges MacBook Air M2, iPhone 15 series and Galaxy flagships.",
    featured: false,
    visualKey: "accessory",
  },
];

async function seedIfEmptyInternal() {
  const rows = await sql`SELECT count(*)::int AS c FROM products`;
  if (Number(rows[0]?.c ?? 0) > 0) return;
  for (const item of SEED) {
    const q = buildInsert("products", PRODUCT_COLUMNS, item as Record<string, unknown>);
    await sql.query(q.text, q.values);
  }
  console.log(`[seed] inserted ${SEED.length} products`);
}

// Kept for compatibility with routes.ts — schema bootstrap and seeding now
// happen lazily inside ensureReady(), so this only warms things up.
export async function seedIfEmpty() {
  try {
    await ensureReady();
  } catch (err) {
    console.error("[db] bootstrap failed:", (err as Error).message);
  }
}
