// ---------------------------------------------------------------------------
// Fonzo Tech — Vercel API function (the deployed production backend).
//
// This reads and writes the shared Supabase database. The customer website and
// the team portal both go through here, so a change made in the portal (price,
// stock, new product, order status) is immediately live on the storefront —
// there is only ever one database.
// ---------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// The service-role key is used because this runs only on the server. It must
// never be exposed to the browser.
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    : null;

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
  if (!token || !supabase) return null;
  const { data } = await supabase.from("sessions").select("*").eq("token", token).maybeSingle();
  if (!data) return null;
  if (new Date(data.expiresAt).getTime() < Date.now()) {
    await supabase.from("sessions").delete().eq("token", token);
    return null;
  }
  return data;
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

export default async function handler(req: any, res: any) {
  try {
    if (!supabase) {
      return send(res, 500, {
        error:
          "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
          "in the Vercel project environment variables.",
      });
    }

    const url = new URL(req.url || "/", "https://fonzotech.co.uk");
    const path = url.pathname;
    const method = req.method || "GET";

    // ---- Products: public reads ------------------------------------------
    if (method === "GET" && path === "/api/products") {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, data ?? []);
    }

    if (method === "GET" && path.startsWith("/api/products/")) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", idFrom(path, "/api/products/"))
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      return data ? send(res, 200, data) : send(res, 404, { error: "Not found" });
    }

    // ---- Products: staff-only writes -------------------------------------
    if (method === "POST" && path === "/api/products") {
      if (!(await requireTeam(req, res))) return;
      const input = await readBody(req);
      if (!input.title || !input.category || !input.brand || !input.model) {
        return send(res, 400, { error: "Missing product fields" });
      }
      const { id: _ignored, ...record } = input;
      const { data, error } = await supabase.from("products").insert(record).select().single();
      if (error) return send(res, 500, { error: error.message });
      return send(res, 201, data);
    }

    if (method === "PATCH" && path.startsWith("/api/products/")) {
      if (!(await requireTeam(req, res))) return;
      const { id: _ignored, ...patch } = await readBody(req);
      const { data, error } = await supabase
        .from("products")
        .update(patch)
        .eq("id", idFrom(path, "/api/products/"))
        .select()
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      return data ? send(res, 200, data) : send(res, 404, { error: "Not found" });
    }

    if (method === "DELETE" && path.startsWith("/api/products/")) {
      if (!(await requireTeam(req, res))) return;
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", idFrom(path, "/api/products/"));
      if (error) return send(res, 500, { error: error.message });
      return send(res, 204);
    }

    // ---- Orders: staff-only list -----------------------------------------
    if (method === "GET" && path === "/api/orders") {
      if (!(await requireTeam(req, res))) return;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, data ?? []);
    }

    // ---- Orders: customers place orders (public) -------------------------
    if (method === "POST" && path === "/api/orders") {
      const input = await readBody(req);
      const items: any[] = input.items || [];
      if (!items.length) return send(res, 400, { error: "Order must include at least one item" });

      const ids = items.map((line) => line.productId);
      const { data: productRows, error: productError } = await supabase
        .from("products")
        .select("*")
        .in("id", ids);
      if (productError) return send(res, 500, { error: productError.message });

      const snapshot = items.map((line) => {
        const product = (productRows || []).find((row: any) => row.id === line.productId);
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

      const { data: created, error: orderError } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();
      if (orderError) return send(res, 500, { error: orderError.message });

      // Reduce stock for each ordered item.
      for (const line of items) {
        const product = (productRows || []).find((row: any) => row.id === line.productId);
        if (product) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - line.quantity) })
            .eq("id", product.id);
        }
      }

      return send(res, 201, created);
    }

    // ---- Orders: staff-only status updates -------------------------------
    if (method === "PATCH" && path.startsWith("/api/orders/")) {
      if (!(await requireTeam(req, res))) return;
      const { id: _ignored, ...patch } = await readBody(req);
      const { data, error } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", idFrom(path, "/api/orders/"))
        .select()
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      return data ? send(res, 200, data) : send(res, 404, { error: "Not found" });
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
      const { error } = await supabase.from("otp_codes").insert({
        email,
        role,
        code: previewOtp,
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
      });
      if (error) return send(res, 500, { error: error.message });

      if (input.mode === "signup") {
        await supabase.from("users").upsert(
          { email, name: input.name || "", role, createdAt: new Date().toISOString() },
          { onConflict: "email", ignoreDuplicates: true },
        );
      }
      // Preview-only: in production this code would be sent by email/SMS instead.
      return send(res, 200, { email, role, expiresAt, previewOtp });
    }

    if (method === "POST" && path === "/api/auth/verify-otp") {
      const input = await readBody(req);
      const email = String(input.email || "").trim().toLowerCase();
      const role = input.role || "customer";

      const { data: rows } = await supabase
        .from("otp_codes")
        .select("*")
        .eq("email", email)
        .eq("role", role)
        .eq("code", input.otp)
        .eq("used", false)
        .order("id", { ascending: false })
        .limit(1);
      const row = rows?.[0];
      if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
        return send(res, 401, { error: "Invalid or expired OTP" });
      }
      await supabase.from("otp_codes").update({ used: true }).eq("id", row.id);

      await supabase.from("users").upsert(
        { email, name: input.name || "", role, createdAt: new Date().toISOString() },
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
      if (userError || !user) return send(res, 500, { error: "Could not load user account" });

      const token = randomBytes(32).toString("hex");
      await supabase.from("sessions").insert({
        token,
        userId: user.id,
        email,
        role,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      });
      return send(res, 200, { user, token });
    }

    if (method === "POST" && path === "/api/auth/logout") {
      const token = getToken(req);
      if (token) await supabase.from("sessions").delete().eq("token", token);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    return send(res, 400, { error: (err as Error).message });
  }
}
