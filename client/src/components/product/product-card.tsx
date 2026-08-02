import { Link } from "wouter";
import type { Product } from "@shared/schema";
import { ProductVisual } from "@/components/brand/product-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck } from "lucide-react";
import { formatPrice, discountPct } from "@/lib/format";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const off = discountPct(product.price, product.originalPrice);
  const inStock = product.stock > 0;
  const lowStock = inStock && product.stock <= 3;

  return (
    <article
      className="group relative flex flex-col rounded-xl border border-card-border bg-card overflow-hidden hover-elevate transition-all hover:border-brand-accent/40 hover:shadow-lg"
      data-testid={`card-product-${product.id}`}
    >
      <Link href={`/product/${product.id}`} data-testid={`link-product-${product.id}`}>
        <div className="relative cursor-pointer overflow-hidden">
          <div className="transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <ProductVisual product={product} />
          </div>
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {off !== null && (
              <Badge className="bg-brand-accent text-[hsl(var(--brand-accent-foreground))] border-transparent hover:bg-brand-accent" data-testid={`badge-discount-${product.id}`}>
                −{off}%
              </Badge>
            )}
            {product.featured && (
              <Badge variant="outline" className="bg-background/80 backdrop-blur" data-testid={`badge-featured-${product.id}`}>
                Featured
              </Badge>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur text-[10px] font-medium" data-testid={`badge-condition-${product.id}`}>
              {product.condition}
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
          <span data-testid={`text-brand-${product.id}`}>{product.brand}</span>
          <span className="opacity-50">·</span>
          <span>{product.category}</span>
        </div>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display font-semibold text-base leading-tight cursor-pointer group-hover:text-brand-accent transition-colors line-clamp-2 min-h-[2.5rem]" data-testid={`text-title-${product.id}`}>
            {product.title}
          </h3>
        </Link>
        {(product.storage || product.color) && (
          <p className="text-xs text-muted-foreground -mt-1">
            {[product.storage, product.color].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-foreground" data-testid={`text-rating-${product.id}`}>
            {product.rating.toFixed(1)}
          </span>
          <span>· {product.reviewCount} reviews</span>
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          <div>
            <p className="text-lg font-bold tabular-nums leading-none" data-testid={`text-price-${product.id}`}>
              {formatPrice(product.price)}
            </p>
            {product.originalPrice && product.originalPrice > product.price && (
              <p className="text-xs text-muted-foreground line-through tabular-nums mt-1" data-testid={`text-original-price-${product.id}`}>
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>
          <div className="text-right">
            {inStock ? (
              lowStock ? (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400" data-testid={`status-stock-${product.id}`}>
                  Only {product.stock} left
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400" data-testid={`status-stock-${product.id}`}>
                  In stock
                </span>
              )
            ) : (
              <span className="text-[11px] font-medium text-destructive" data-testid={`status-stock-${product.id}`}>
                Sold out
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-accent" />
          12-month Fonzo warranty
        </div>

        <Button
          size="sm"
          className="w-full mt-1"
          disabled={!inStock}
          onClick={(e) => {
            e.preventDefault();
            add(product, 1);
          }}
          data-testid={`button-add-cart-${product.id}`}
        >
          {inStock ? "Add to cart" : "Sold out"}
        </Button>
      </div>
    </article>
  );
}
