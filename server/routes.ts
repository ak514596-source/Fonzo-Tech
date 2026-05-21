import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage, seedIfEmpty } from "./storage";
import {
  createOrderRequestSchema,
  insertProductSchema,
  requestOtpSchema,
  updateOrderSchema,
  updateProductSchema,
  verifyOtpSchema,
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

// Pull the bearer token out of the Authorization header, if present.
function getToken(req: Request): string | null {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// Gate: only requests carrying a valid staff (role = "team") session may pass.
// This is the real security boundary — the customer site never reaches these
// routes, and hiding the portal UI behind another URL would not be enough.
async function requireTeam(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  const session = token ? await storage.getSession(token) : undefined;
  if (!session) {
    return res.status(401).json({ error: "Sign in to the team portal to continue." });
  }
  if (session.role !== "team") {
    return res.status(403).json({ error: "Staff access only." });
  }
  (req as Request & { session?: typeof session }).session = session;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedIfEmpty();

  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const parsed = requestOtpSchema.parse(req.body);
      const result = await storage.requestOtp(parsed);
      res.json({
        email: result.email,
        role: result.role,
        expiresAt: result.expiresAt,
        // Preview-only: in production this code would be sent by email/SMS instead of returned.
        previewOtp: result.otp,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const parsed = verifyOtpSchema.parse(req.body);
      const user = await storage.verifyOtp(parsed);
      if (!user) return res.status(401).json({ error: "Invalid or expired OTP" });
      const token = await storage.createSession(user);
      res.json({ user, token });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = getToken(req);
    if (token) await storage.deleteSession(token);
    res.json({ ok: true });
  });

  // Public: the customer storefront reads products without signing in.
  app.get("/api/products", async (_req, res) => {
    const items = await storage.listProducts();
    res.json(items);
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const item = await storage.getProduct(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  // Staff only: creating, editing and deleting products.
  app.post("/api/products", requireTeam, async (req, res) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const created = await storage.createProduct(parsed);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/products/:id", requireTeam, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateProductSchema.parse(req.body);
      const updated = await storage.updateProduct(id, parsed);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/products/:id", requireTeam, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const ok = await storage.deleteProduct(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  });

  // Staff only: order visibility belongs to the team portal, not customers.
  app.get("/api/orders", requireTeam, async (_req, res) => {
    const items = await storage.listOrders();
    res.json(items);
  });

  app.get("/api/orders/:id", requireTeam, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const item = await storage.getOrder(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const parsed = createOrderRequestSchema.parse(req.body);
      const productRows = await Promise.all(parsed.items.map((item) => storage.getProduct(item.productId)));
      const missing = productRows.findIndex((product) => !product);
      if (missing >= 0) return res.status(400).json({ error: "One or more products are unavailable" });

      const snapshot = parsed.items.map((item, index) => {
        const product = productRows[index]!;
        if (product.stock < item.quantity) {
          throw new Error(`${product.title} only has ${product.stock} in stock`);
        }
        return {
          productId: product.id,
          title: product.title,
          brand: product.brand,
          model: product.model,
          condition: product.condition,
          price: product.price,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        };
      });

      const subtotal = snapshot.reduce((sum, item) => sum + item.lineTotal, 0);
      const shipping = parsed.deliveryMethod === "delivery" ? (subtotal >= 100 ? 0 : 7.95) : 0;
      const total = subtotal + shipping;

      const created = await storage.createOrder({
        orderNumber: `FZ-${Date.now().toString().slice(-8)}`,
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerPhone: parsed.customerPhone ?? "",
        deliveryMethod: parsed.deliveryMethod,
        address: parsed.address ?? "",
        itemsJson: JSON.stringify(snapshot),
        subtotal,
        shipping,
        total,
        paymentStatus: "Payment pending",
        orderStatus: "New",
        paymentProvider: "Not connected",
      });

      await Promise.all(
        parsed.items.map(async (item, index) => {
          const product = productRows[index]!;
          await storage.updateProduct(product.id, { stock: Math.max(0, product.stock - item.quantity) });
        }),
      );

      res.status(201).json(created);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/orders/:id", requireTeam, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateOrderSchema.parse(req.body);
      const updated = await storage.updateOrder(id, parsed);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(err).toString() });
      }
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return httpServer;
}
