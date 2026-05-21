import type { Product, InsertProduct, UpdateProduct, Order, InsertOrder, UpdateOrder } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Shared Supabase database.
//
// Both the customer website and the team portal read and write THIS database,
// which is what keeps them in sync: there is only ever one product list and
// one order list. The service-role key is used because this code runs only on
// the server — it must never be shipped to the browser.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // staff stay logged in for 7 days
const OTP_TTL_MS = 10 * 60 * 1000; // login codes are valid for 10 minutes

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "in your environment (see .env.example and SUPABASE_SETUP.md).",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Emails allowed to sign in to the team portal. Override with the TEAM_EMAILS
// environment variable (comma-separated) without touching the code.
const TEAM_ALLOW_LIST = (
  process.env.TEAM_EMAILS ||
  "ak514596@gmail.com,team@fonzotech.co.uk,admin@fonzotech.co.uk"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function fail(message: string): never {
  throw new Error(message);
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
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });
    if (error) fail(error.message);
    return (data ?? []) as Product[];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return (data ?? undefined) as Product | undefined;
  }

  async createProduct(input: InsertProduct): Promise<Product> {
    const { data, error } = await supabase
      .from("products")
      .insert(input)
      .select()
      .single();
    if (error) fail(error.message);
    return data as Product;
  }

  async updateProduct(id: number, input: UpdateProduct): Promise<Product | undefined> {
    const existing = await this.getProduct(id);
    if (!existing) return undefined;
    const { data, error } = await supabase
      .from("products")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error.message);
    return data as Product;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const existing = await this.getProduct(id);
    if (!existing) return false;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) fail(error.message);
    return true;
  }

  async countProducts(): Promise<number> {
    const { count, error } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    if (error) fail(error.message);
    return count ?? 0;
  }

  async listOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });
    if (error) fail(error.message);
    return (data ?? []) as Order[];
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return (data ?? undefined) as Order | undefined;
  }

  async createOrder(input: InsertOrder): Promise<Order> {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...input, createdAt: new Date().toISOString() })
      .select()
      .single();
    if (error) fail(error.message);
    return data as Order;
  }

  async updateOrder(id: number, input: UpdateOrder): Promise<Order | undefined> {
    const existing = await this.getOrder(id);
    if (!existing) return undefined;
    const { data, error } = await supabase
      .from("orders")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) fail(error.message);
    return data as Order;
  }

  async requestOtp(input: { email: string; name?: string; role: string; mode: string }) {
    const email = input.email.trim().toLowerCase();
    if (input.role === "team" && !TEAM_ALLOW_LIST.includes(email)) {
      throw new Error("This email is not allowed for team portal access.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    const { error } = await supabase.from("otp_codes").insert({
      email,
      role: input.role,
      code: otp,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    });
    if (error) fail(error.message);

    if (input.mode === "signup") {
      await supabase.from("users").upsert(
        { email, name: input.name || "", role: input.role, createdAt: new Date().toISOString() },
        { onConflict: "email", ignoreDuplicates: true },
      );
    }

    return { email, role: input.role, otp, expiresAt };
  }

  async verifyOtp(input: { email: string; otp: string; role: string; name?: string }) {
    const email = input.email.trim().toLowerCase();
    const { data: rows, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("role", input.role)
      .eq("code", input.otp)
      .eq("used", false)
      .order("id", { ascending: false })
      .limit(1);
    if (error) fail(error.message);

    const row = rows?.[0];
    if (!row || new Date(row.expiresAt).getTime() < Date.now()) return undefined;
    await supabase.from("otp_codes").update({ used: true }).eq("id", row.id);

    await supabase.from("users").upsert(
      { email, name: input.name || "", role: input.role, createdAt: new Date().toISOString() },
      { onConflict: "email", ignoreDuplicates: true },
    );
    if (input.name) {
      await supabase.from("users").update({ name: input.name }).eq("email", email);
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("email", email)
      .single();
    if (userError) fail(userError.message);
    return user as { id: number; email: string; name: string; role: string };
  }

  async createSession(user: { id: number; email: string; role: string }): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const { error } = await supabase.from("sessions").insert({
      token,
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    });
    if (error) fail(error.message);
    return token;
  }

  async getSession(token: string): Promise<{ userId: number; email: string; role: string } | undefined> {
    if (!token) return undefined;
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) fail(error.message);
    if (!data) return undefined;
    if (new Date(data.expiresAt).getTime() < Date.now()) {
      await supabase.from("sessions").delete().eq("token", token);
      return undefined;
    }
    return { userId: data.userId, email: data.email, role: data.role };
  }

  async deleteSession(token: string): Promise<void> {
    if (!token) return;
    await supabase.from("sessions").delete().eq("token", token);
  }
}

export const storage = new DatabaseStorage();

// ---------------------------------------------------------------------------
// Seed sample tech retail data.
//
// The supabase-setup.sql script already seeds the catalogue, so this normally
// does nothing. It stays as a safety net: if the products table is somehow
// empty on boot, the starter catalogue is inserted.
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

export async function seedIfEmpty() {
  const count = await storage.countProducts();
  if (count > 0) return;
  for (const item of SEED) {
    await storage.createProduct(item);
  }
  console.log(`[seed] inserted ${SEED.length} products`);
}
