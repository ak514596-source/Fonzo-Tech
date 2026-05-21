import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { Product, ProductCategory } from "@shared/schema";
import { PRODUCT_CATEGORIES, PRODUCT_CONDITIONS } from "@shared/schema";
import { ProductCard } from "@/components/product/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

export default function ShopPage() {
  const [, params] = useRoute<{ category?: string }>("/shop/:category");
  const [location] = useLocation();
  const category = params?.category as ProductCategory | undefined;

  const initialQuery = useMemo(() => {
    const search = location.includes("?") ? location.split("?")[1] : "";
    const sp = new URLSearchParams(search);
    return sp.get("q") ?? "";
  }, [location]);

  const [query, setQuery] = useState(initialQuery);
  const [conditions, setConditions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("featured");
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filtered = useMemo(() => {
    let list = products;
    if (category) list = list.filter((p) => p.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.model.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q),
      );
    }
    if (conditions.length) list = list.filter((p) => conditions.includes(p.condition));
    if (brands.length) list = list.filter((p) => brands.includes(p.brand));
    if (maxPrice) list = list.filter((p) => p.price <= maxPrice);

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      default:
        list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [products, category, query, conditions, brands, sort, maxPrice]);

  const allBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (!category || p.category === category) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products, category]);

  const title = category ? `${category}` : "Shop all devices";
  const subtitle = category
    ? subtitleForCategory(category)
    : "Verified iPhones, Android phones, Macs, iPads, VR, speakers and accessories — all engineer-checked.";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12" data-testid="page-shop">
      <header className="mb-8">
        <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">
          {category ? "Category" : "Catalog"}
        </p>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight" data-testid="text-shop-title">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Desktop filters */}
        <aside className="hidden lg:block">
          <FiltersPanel
            allBrands={allBrands}
            conditions={conditions}
            setConditions={setConditions}
            brands={brands}
            setBrands={setBrands}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
          />
        </aside>

        <section>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this catalog…"
                className="pl-9"
                data-testid="input-shop-search"
                type="search"
              />
            </div>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden" data-testid="button-mobile-filters">
                    <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <FiltersPanel
                      allBrands={allBrands}
                      conditions={conditions}
                      setConditions={setConditions}
                      brands={brands}
                      setBrands={setBrands}
                      maxPrice={maxPrice}
                      setMaxPrice={setMaxPrice}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-44" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                  <SelectItem value="rating">Top rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4" data-testid="text-result-count">
            {isLoading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "device" : "devices"}`}
          </p>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onClear={() => { setQuery(""); setConditions([]); setBrands([]); setMaxPrice(undefined); }} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FiltersPanel({
  allBrands,
  conditions,
  setConditions,
  brands,
  setBrands,
  maxPrice,
  setMaxPrice,
}: {
  allBrands: string[];
  conditions: string[];
  setConditions: (v: string[]) => void;
  brands: string[];
  setBrands: (v: string[]) => void;
  maxPrice: number | undefined;
  setMaxPrice: (v: number | undefined) => void;
}) {
  const togglePresence = (arr: string[], setArr: (v: string[]) => void, value: string) => {
    setArr(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  return (
    <div className="space-y-6 text-sm">
      <FilterGroup title="Condition">
        {PRODUCT_CONDITIONS.map((c) => (
          <label key={c} className="flex items-center gap-2 py-1 cursor-pointer hover-elevate rounded px-1">
            <Checkbox
              checked={conditions.includes(c)}
              onCheckedChange={() => togglePresence(conditions, setConditions, c)}
              data-testid={`checkbox-condition-${c.toLowerCase().replace(/\s+/g, "-")}`}
            />
            <span>{c}</span>
          </label>
        ))}
      </FilterGroup>

      {allBrands.length > 1 && (
        <FilterGroup title="Brand">
          {allBrands.map((b) => (
            <label key={b} className="flex items-center gap-2 py-1 cursor-pointer hover-elevate rounded px-1">
              <Checkbox
                checked={brands.includes(b)}
                onCheckedChange={() => togglePresence(brands, setBrands, b)}
                data-testid={`checkbox-brand-${b.toLowerCase()}`}
              />
              <span>{b}</span>
            </label>
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Max price">
        <div className="flex flex-wrap gap-2">
          {[300, 600, 1000, 2000].map((p) => (
            <Button
              key={p}
              variant={maxPrice === p ? "default" : "outline"}
              size="sm"
              onClick={() => setMaxPrice(maxPrice === p ? undefined : p)}
              data-testid={`button-max-price-${p}`}
              className="text-xs"
            >
              £{p}
            </Button>
          ))}
        </div>
      </FilterGroup>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setConditions([]); setBrands([]); setMaxPrice(undefined); }}
        className="text-xs"
        data-testid="button-clear-filters"
      >
        <X className="h-3.5 w-3.5 mr-1" /> Clear filters
      </Button>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-card-border p-12 text-center" data-testid="state-empty">
      <p className="font-display text-lg font-semibold">No matching devices</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Try adjusting your filters or check another category.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

function subtitleForCategory(c: ProductCategory) {
  switch (c) {
    case "iPhone": return "Latest iPhones and certified pre-owned models — fully unlocked, ready to use.";
    case "Android": return "Flagship Android phones from Samsung, Google and more, verified and unlocked.";
    case "Mac": return "MacBook Air, MacBook Pro and Mac desktops — sealed or refurbished, all engineer-checked.";
    case "iPad": return "iPads and premium Android tablets, Wi-Fi and cellular options.";
    case "VR": return "Mixed reality and VR headsets from Meta, Apple, PlayStation and more.";
    case "Speakers": return "Smart speakers, portable Bluetooth and home audio from leading audio brands.";
    case "Accessories": return "Charging, audio and protection — sourced from trusted accessory brands.";
    default: return "";
  }
}

// Unused but kept for type assertions in case PRODUCT_CATEGORIES export changes.
void PRODUCT_CATEGORIES;
