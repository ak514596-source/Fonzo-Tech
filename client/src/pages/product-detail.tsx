import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { ProductVisual } from "@/components/brand/product-visual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  Headphones,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice, discountPct } from "@/lib/format";

export default function ProductDetailPage() {
  const [, params] = useRoute<{ id: string }>("/product/:id");
  const id = params ? Number(params.id) : NaN;

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: Number.isFinite(id),
  });

  if (isLoading) return <DetailSkeleton />;
  if (!product) return <NotFoundState />;

  return <DetailView product={product} />;
}

function DetailView({ product }: { product: Product }) {
  const { add } = useCart();
  const off = discountPct(product.price, product.originalPrice);
  const inStock = product.stock > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid={`page-product-${product.id}`}>
      <Link href={`/shop/${product.category}`}>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" data-testid="link-back-shop">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to {product.category}
        </Button>
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Visual stack */}
        <div className="space-y-3">
          <ProductVisual product={product} ratio="square" />
          <div className="grid grid-cols-3 gap-3">
            <ProductVisual product={product} />
            <ProductVisual product={product} />
            <ProductVisual product={product} />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
              <span>{product.brand}</span>
              <span>·</span>
              <span>{product.category}</span>
              <span>·</span>
              <span className="font-mono">{product.model}</span>
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight" data-testid="text-product-title">
              {product.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" data-testid="badge-product-condition">{product.condition}</Badge>
              {product.storage && <Badge variant="secondary">{product.storage}</Badge>}
              {product.color && <Badge variant="secondary">{product.color}</Badge>}
              {product.featured && (
                <Badge className="bg-brand-accent text-[hsl(var(--brand-accent-foreground))] border-transparent hover:bg-brand-accent">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
              <span>· {product.reviewCount} verified reviews</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 pt-2 border-t border-border">
            <p className="text-3xl font-bold tabular-nums" data-testid="text-product-price">
              {formatPrice(product.price)}
            </p>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <p className="text-base text-muted-foreground line-through tabular-nums">
                  {formatPrice(product.originalPrice)}
                </p>
                {off !== null && (
                  <Badge className="bg-brand-accent text-[hsl(var(--brand-accent-foreground))] border-transparent hover:bg-brand-accent">
                    Save {off}%
                  </Badge>
                )}
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-product-description">
            {product.description || product.shortDescription}
          </p>

          <div className="flex items-center gap-2">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400" data-testid="status-product-stock">
                <CheckCircle2 className="h-4 w-4" />
                In stock — {product.stock} available, ships next business day
              </span>
            ) : (
              <span className="text-sm font-medium text-destructive">Sold out</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={!inStock}
              onClick={() => add(product, 1)}
              data-testid="button-product-add-cart"
            >
              {inStock ? "Add to cart" : "Sold out"}
            </Button>
            <Link href="/checkout" className="flex-1">
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                disabled={!inStock}
                onClick={() => add(product, 1)}
                data-testid="button-product-buy-now"
              >
                Buy now
              </Button>
            </Link>
          </div>

          {/* Trust grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <TrustItem icon={ShieldCheck} title="12-month warranty" sub="Backed by Fonzo Tech" />
            <TrustItem icon={PackageCheck} title="30-point inspection" sub="Engineer-verified" />
            <TrustItem icon={Truck} title="Free UK delivery" sub="Orders over £100" />
            <TrustItem icon={RotateCcw} title="14-day returns" sub="No questions asked" />
          </div>

          <div className="rounded-lg border border-card-border bg-card p-4 flex gap-3">
            <Headphones className="h-5 w-5 text-brand-accent shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-sm">Need help choosing?</p>
              <p className="text-muted-foreground mt-1">
                Email <span className="font-mono text-foreground">support@fonzotech.co.uk</span> — our UK team replies within a few hours, 7 days a week.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Specs section */}
      <section className="mt-12 grid lg:grid-cols-2 gap-8 border-t border-border pt-10" data-testid="section-product-specs">
        <div>
          <h2 className="font-display text-lg font-bold mb-4">Specifications</h2>
          <dl className="text-sm divide-y divide-border border border-card-border rounded-lg overflow-hidden">
            {[
              ["Brand", product.brand],
              ["Model", product.model],
              ["Category", product.category],
              ["Condition", product.condition],
              ["Storage / Spec", product.storage || "—"],
              ["Colour", product.color || "—"],
              ["SKU", `FNZ-${String(product.id).padStart(5, "0")}`],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 px-4 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="col-span-2 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold mb-4">What's in the box</h2>
          <ul className="space-y-2 text-sm">
            {[
              `${product.brand} ${product.title}`,
              "Manufacturer-spec charge cable",
              "Fonzo Tech verification certificate",
              "12-month warranty document",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg bg-secondary/50 border border-card-border p-4 text-xs text-muted-foreground">
            All Fonzo Tech devices are sourced through verified channels and pass a 30-point inspection
            before they're listed at <span className="font-mono">fonzotech.co.uk</span>.
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg border border-card-border bg-card">
      <Icon className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-2 gap-12">
      <Skeleton className="aspect-square rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full mt-6" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Device not found</h1>
      <p className="text-sm text-muted-foreground mt-2">It may have sold out or been delisted.</p>
      <Link href="/shop">
        <Button className="mt-6">Back to shop</Button>
      </Link>
    </div>
  );
}
