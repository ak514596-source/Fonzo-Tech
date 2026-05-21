import { Link } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ProductVisual } from "@/components/brand/product-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@shared/schema";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  CircleAlert,
} from "lucide-react";

export default function CheckoutPage() {
  const { toast } = useToast();
  const { items, subtotal, count, clear } = useCart();
  const [delivery, setDelivery] = useState<"delivery" | "collection">("delivery");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  const orderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/orders", payload);
      return (await res.json()) as Order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      clear();
      setSubmittedOrder(order);
    },
    onError: (e: any) => toast({ title: "Order could not be saved", description: e.message, variant: "destructive" }),
  });

  if (count === 0 && !submittedOrder) return <EmptyCart />;
  if (submittedOrder) return <SuccessState order={submittedOrder} />;

  const shipping = delivery === "delivery" ? (subtotal >= 100 ? 0 : 7.95) : 0;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid="page-checkout">
      <div className="mb-8">
        <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Checkout</p>
        <h1 className="font-display text-2xl lg:text-3xl font-bold">Secure checkout</h1>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
          <Lock className="h-3.5 w-3.5" />
          <span>Encrypted via TLS · fonzotech.co.uk</span>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 rounded-lg p-4 flex gap-3 mb-8" data-testid="banner-payment-stub">
        <CircleAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Payment integration is coming soon</p>
          <p className="text-xs mt-1 opacity-90">
            This is a preview checkout. No card data is collected and no charges are made.
            Submitting will simulate an order so you can validate the flow.
          </p>
        </div>
      </div>

      <form
        className="grid lg:grid-cols-[1fr_360px] gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const address =
            delivery === "collection"
              ? "Customer selected local collection"
              : [
                  form.get("line1"),
                  form.get("line2"),
                  form.get("city"),
                  form.get("postcode"),
                  form.get("country"),
                ]
                  .filter(Boolean)
                  .join(", ");

          orderMutation.mutate({
            customerName: String(form.get("name") || ""),
            customerEmail: String(form.get("email") || ""),
            customerPhone: String(form.get("phone") || ""),
            deliveryMethod: delivery,
            address,
            items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          });
        }}
      >
        {/* Left: forms */}
        <div className="space-y-8">
          <Section title="Contact">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone" name="phone" type="tel" />
            </div>
          </Section>

          <Section title="Delivery method">
            <RadioGroup value={delivery} onValueChange={(v) => setDelivery(v as any)} className="grid sm:grid-cols-2 gap-3">
              <DeliveryOption
                value="delivery"
                title="UK delivery"
                sub={subtotal >= 100 ? "Free — over £100" : "£7.95 tracked"}
                checked={delivery === "delivery"}
              />
              <DeliveryOption
                value="collection"
                title="Local collection"
                sub="Free · Verified at our hub"
                checked={delivery === "collection"}
              />
            </RadioGroup>
          </Section>

          {delivery === "delivery" && (
            <Section title="Delivery address">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Address line 1" name="line1" required className="sm:col-span-2" />
                <Field label="Address line 2" name="line2" />
                <Field label="City" name="city" required />
                <Field label="Postcode" name="postcode" required />
                <Field label="Country" name="country" defaultValue="United Kingdom" required />
              </div>
            </Section>
          )}

          <Section title="Payment">
            <div className="rounded-lg border border-dashed border-card-border p-6 text-center bg-secondary/30">
              <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="font-semibold mt-2 text-sm">Payment processing not yet enabled</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Stripe / Apple Pay / Google Pay will be integrated here. For now, click "Place order"
                below to simulate the order confirmation step.
              </p>
            </div>
          </Section>

          <Button
            type="submit"
            size="lg"
            className="w-full lg:hidden"
            disabled={orderMutation.isPending}
            data-testid="button-place-order-mobile"
          >
            {orderMutation.isPending ? "Saving order…" : `Place order — ${formatPrice(total)}`}
          </Button>
        </div>

        {/* Right: summary */}
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border border-card-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Order summary</h3>
              <Badge variant="outline" data-testid="badge-cart-item-count">{count} items</Badge>
            </div>
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 p-3" data-testid={`summary-row-${product.id}`}>
                  <div className="w-14 shrink-0">
                    <ProductVisual product={product} />
                  </div>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium leading-tight truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.condition} · Qty {quantity}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatPrice(product.price * quantity)}</p>
                </div>
              ))}
            </div>
            <div className="p-4 space-y-2 text-sm border-t border-border">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              <Row label={delivery === "delivery" ? "Delivery" : "Collection"} value={shipping === 0 ? "Free" : formatPrice(shipping)} />
              <Row label="VAT" value="Included" muted />
              <div className="h-px bg-border my-1" />
              <Row label="Total" value={formatPrice(total)} bold />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full hidden lg:flex" disabled={orderMutation.isPending} data-testid="button-place-order">
            {orderMutation.isPending ? "Saving order…" : "Place order"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="rounded-lg border border-card-border bg-card p-3 flex gap-2.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              All Fonzo Tech orders are protected by a 12-month warranty and 14-day no-fee returns.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, name, type = "text", required, defaultValue, className = "" }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string; className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name} className="text-xs">
        {label} {required && <span className="text-muted-foreground">*</span>}
      </Label>
      <Input id={name} name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1" data-testid={`input-${name}`} />
    </div>
  );
}

function DeliveryOption({ value, title, sub, checked }: {
  value: string; title: string; sub: string; checked: boolean;
}) {
  return (
    <Label
      htmlFor={`delivery-${value}`}
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
        checked ? "border-brand-accent bg-brand-accent/5" : "border-card-border bg-card"
      }`}
      data-testid={`option-delivery-${value}`}
    >
      <RadioGroupItem value={value} id={`delivery-${value}`} className="mt-0.5" />
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </Label>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" data-testid="state-checkout-empty">
      <div className="h-14 w-14 rounded-full bg-muted mx-auto flex items-center justify-center">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="font-display text-2xl font-bold mt-4">Your cart is empty</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Add a verified Fonzo Tech device to start checkout.
      </p>
      <Link href="/shop">
        <Button className="mt-6" data-testid="button-empty-checkout-shop">Browse devices</Button>
      </Link>
    </div>
  );
}

function SuccessState({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" data-testid="state-checkout-success">
      <div className="h-14 w-14 rounded-full bg-brand-accent/15 text-brand-accent mx-auto flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-bold mt-4">Order saved</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your order has been created as <span className="font-mono text-foreground" data-testid="text-success-order-number">{order.orderNumber}</span>.
        Our team has received it and will process it shortly.
      </p>
      <div className="rounded-lg border border-card-border bg-card p-3 mt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment</span>
          <span>{order.paymentStatus}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">{formatPrice(order.total)}</span>
        </div>
      </div>
      <div className="flex gap-2 justify-center mt-6">
        <Link href="/shop">
          <Button data-testid="button-keep-shopping">Keep shopping</Button>
        </Link>
      </div>
    </div>
  );
}
