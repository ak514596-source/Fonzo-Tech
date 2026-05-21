import { Link } from "wouter";
import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  ExternalLink,
  ListPlus,
  PackageCheck,
  PackageSearch,
  PoundSterling,
  ReceiptText,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";

type OrderItem = {
  productId: number;
  title: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export default function TeamPortalPage() {
  const { toast } = useToast();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });

  const updateOrder = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Order> }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}`, patch);
      return (await res.json()) as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order updated", description: "Team portal has the latest status." });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const stats = useMemo(() => {
    const stockUnits = products.reduce((sum, item) => sum + item.stock, 0);
    const stockValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);
    const lowStock = products.filter((item) => item.stock <= 3).length;
    const orderValue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingPayments = orders.filter((order) => order.paymentStatus === "Payment pending").length;
    return { stockUnits, stockValue, lowStock, orderValue, pendingPayments };
  }, [orders, products]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid="page-team-portal">
      <header className="rounded-2xl border border-card-border bg-card p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Team website · Fonzo Tech</p>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight" data-testid="text-team-title">
              Team portal for listings, stock, orders and payments
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              This is the internal side of Fonzo Tech. Products listed here reflect on the customer
              website, checkout orders appear below, and payment status can be tracked until Stripe
              or PayPal is connected.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/team/listings" data-testid="link-team-listings">
              <Button>
                <ListPlus className="h-4 w-4 mr-1.5" /> List products
              </Button>
            </Link>
            <Link href="/" data-testid="link-team-customer-site">
              <Button variant="outline">
                Customer website <ExternalLink className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <TeamStat icon={PackageCheck} label="Stock units" value={stats.stockUnits.toString()} testid="stat-team-stock-units" />
        <TeamStat icon={PoundSterling} label="Stock value" value={formatPrice(stats.stockValue)} testid="stat-team-stock-value" />
        <TeamStat icon={ShieldAlert} label="Low/out stock" value={stats.lowStock.toString()} testid="stat-team-low-stock" tone={stats.lowStock ? "destructive" : undefined} />
        <TeamStat icon={ShoppingBag} label="Orders" value={orders.length.toString()} testid="stat-team-orders" />
        <TeamStat icon={CreditCard} label="Pending payments" value={stats.pendingPayments.toString()} testid="stat-team-payments" tone={stats.pendingPayments ? "destructive" : undefined} />
      </div>

      <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-4 mb-6">
        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <PackageSearch className="h-4 w-4 text-brand-accent" />
            <h2 className="font-display text-lg font-semibold">Product workflow</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use the listing manager to add new products, prices, categories and stock. As soon as
              the product is saved, it is available on the customer shop.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/team/listings" data-testid="button-team-open-listings">
                <Button size="sm">Add or edit products</Button>
              </Link>
              <Link href="/team/stock" data-testid="button-team-open-stock">
                <Button size="sm" variant="outline">Manage stock</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ReceiptText className="h-4 w-4 text-brand-accent" />
            <h2 className="font-display text-lg font-semibold">Payment setup status</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-card-border p-3">
              <p className="font-semibold">Current mode</p>
              <p className="text-muted-foreground mt-1">Orders are saved, but live payments are not connected yet.</p>
            </div>
            <div className="rounded-lg border border-card-border p-3">
              <p className="font-semibold">Next payment step</p>
              <p className="text-muted-foreground mt-1">Connect Stripe or PayPal to collect card payments, Apple Pay and Google Pay.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-card-border bg-card overflow-hidden" data-testid="section-team-orders">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Orders and payments</h2>
            <p className="text-xs text-muted-foreground">
              Customer checkout submissions appear here with order and payment status controls.
            </p>
          </div>
          <Badge variant="outline" data-testid="badge-team-order-value">
            {formatPrice(stats.orderValue)} total order value
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Order status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading orders…</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground" data-testid="state-no-orders">
                    No customer orders yet. Place a checkout order from the customer site to see it here.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onPatch={(patch) => updateOrder.mutate({ id: order.id, patch })}
                    disabled={updateOrder.isPending}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function OrderRow({ order, onPatch, disabled }: { order: Order; onPatch: (patch: Partial<Order>) => void; disabled: boolean }) {
  const parsed = parseItems(order.itemsJson);
  return (
    <TableRow data-testid={`row-order-${order.id}`}>
      <TableCell>
        <p className="font-mono text-sm font-semibold" data-testid={`text-order-number-${order.id}`}>{order.orderNumber}</p>
        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("en-GB")}</p>
      </TableCell>
      <TableCell>
        <p className="font-medium">{order.customerName}</p>
        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
        <p className="text-xs text-muted-foreground">{order.deliveryMethod === "delivery" ? "UK delivery" : "Collection"}</p>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {parsed.map((item) => (
            <p key={`${order.id}-${item.productId}`} className="text-xs">
              {item.quantity}x {item.title}
            </p>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{formatPrice(order.total)}</TableCell>
      <TableCell>
        <Select
          value={order.paymentStatus}
          onValueChange={(value) => onPatch({ paymentStatus: value as PaymentStatus })}
          disabled={disabled}
        >
          <SelectTrigger className="w-44" data-testid={`select-payment-${order.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={order.orderStatus}
          onValueChange={(value) => onPatch({ orderStatus: value as OrderStatus })}
          disabled={disabled}
        >
          <SelectTrigger className="w-48" data-testid={`select-order-status-${order.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

function parseItems(itemsJson: string): OrderItem[] {
  try {
    return JSON.parse(itemsJson) as OrderItem[];
  } catch {
    return [];
  }
}

function TeamStat({
  icon: Icon,
  label,
  value,
  tone,
  testid,
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "destructive";
  testid: string;
}) {
  const colorClass = tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-brand-accent/10 text-brand-accent";
  return (
    <div className="rounded-xl border border-card-border bg-card p-4 flex items-center gap-3" data-testid={testid}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}
