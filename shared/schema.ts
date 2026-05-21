import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const PRODUCT_CATEGORIES = [
  "iPhone",
  "Android",
  "Mac",
  "iPad",
  "VR",
  "Speakers",
  "Accessories",
] as const;

export const PRODUCT_CONDITIONS = [
  "Brand New",
  "Like New",
  "Excellent",
  "Good",
  "Fair",
  "Refurbished",
] as const;

export const ORDER_STATUSES = [
  "New",
  "Processing",
  "Ready for dispatch",
  "Dispatched",
  "Completed",
  "Cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "Payment pending",
  "Paid",
  "Failed",
  "Refunded",
] as const;

export const USER_ROLES = ["customer", "team"] as const;

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  condition: text("condition").notNull(),
  storage: text("storage").notNull().default(""),
  color: text("color").notNull().default(""),
  price: real("price").notNull(),
  originalPrice: real("original_price"),
  stock: integer("stock").notNull().default(0),
  rating: real("rating").notNull().default(4.8),
  reviewCount: integer("review_count").notNull().default(0),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  imageUrl: text("image_url").notNull().default(""),
  // Visual hint key for the SVG placeholder renderer (phone, tablet, laptop, vr, speaker, accessory)
  visualKey: text("visual_key").notNull().default("phone"),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  deliveryMethod: text("delivery_method").notNull(),
  address: text("address").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  subtotal: real("subtotal").notNull(),
  shipping: real("shipping").notNull(),
  total: real("total").notNull(),
  paymentStatus: text("payment_status").notNull().default("Payment pending"),
  orderStatus: text("order_status").notNull().default("New"),
  paymentProvider: text("payment_provider").notNull().default("Not connected"),
  createdAt: text("created_at").notNull().default(""),
});

export const insertProductSchema = createInsertSchema(products, {
  title: (s) => s.min(2, "Title is required"),
  brand: (s) => s.min(1, "Brand is required"),
  model: (s) => s.min(1, "Model is required"),
  category: z.enum(PRODUCT_CATEGORIES),
  condition: z.enum(PRODUCT_CONDITIONS),
  price: z.number().positive("Price must be greater than zero"),
  originalPrice: z.number().positive().optional().nullable(),
  stock: z.number().int().nonnegative("Stock must be 0 or more"),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  shortDescription: z.string().max(280).optional(),
  description: z.string().optional(),
  featured: z.boolean().optional(),
  imageUrl: z.string().optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  visualKey: z.string().optional(),
}).omit({ id: true });

export const updateProductSchema = insertProductSchema.partial();

export const insertOrderSchema = createInsertSchema(orders, {
  orderNumber: (s) => s.min(3),
  customerName: (s) => s.min(2, "Customer name is required"),
  customerEmail: (s) => s.email("Valid customer email is required"),
  deliveryMethod: z.enum(["delivery", "collection"]),
  itemsJson: (s) => s.min(2),
  subtotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
}).omit({ id: true, createdAt: true });

export const updateOrderSchema = createInsertSchema(orders, {
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
}).partial().pick({
  paymentStatus: true,
  orderStatus: true,
});

export const createOrderRequestSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  customerPhone: z.string().optional().default(""),
  deliveryMethod: z.enum(["delivery", "collection"]),
  address: z.string().optional().default(""),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Order must include at least one item"),
});

export const requestOtpSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().optional().default(""),
  role: z.enum(USER_ROLES).default("customer"),
  mode: z.enum(["login", "signup"]).default("login"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Valid email is required"),
  otp: z.string().min(4).max(8),
  role: z.enum(USER_ROLES).default("customer"),
  name: z.string().optional().default(""),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UpdateOrder = z.infer<typeof updateOrderSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type Order = typeof orders.$inferSelect;
export type UserRole = (typeof USER_ROLES)[number];
export type RequestOtp = z.infer<typeof requestOtpSchema>;
export type VerifyOtp = z.infer<typeof verifyOtpSchema>;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
