import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductVisual } from "@/components/brand/product-visual";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Sparkles,
  Star,
  Quote,
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@shared/schema";

export default function HomePage() {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const featured = products.filter((p) => p.featured).slice(0, 4);
  const newest = [...products].slice(-8).reverse();

  return (
    <div>
      <Hero />
      <StatsBand />
      <CategoryStrip />
      <FeaturedSection products={featured} loading={isLoading} />
      <ValueProps />
      <NewArrivals products={newest} loading={isLoading} />
      <ReviewsBand />
      <PromoBand />
    </div>
  );
}

function StatsBand() {
  const stats = [
    { value: "12,000+", label: "verified reviews" },
    { value: "4.9 / 5", label: "average rating" },
    { value: "30-point", label: "engineer inspection" },
    { value: "12 months", label: "warranty included" },
  ];
  return (
    <section className="border-b border-border bg-secondary/30" data-testid="section-stats">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-left sm:flex sm:items-baseline sm:gap-2">
            <p className="font-display text-lg sm:text-xl font-bold tabular-nums text-brand-accent">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewsBand() {
  const reviews = [
    {
      name: "Aisha M.",
      city: "Manchester",
      product: "iPhone 14 · 128GB",
      body: "Arrived next day, sealed and properly tested. Battery health was even better than listed. Best price I could find anywhere in the UK.",
    },
    {
      name: "Daniel R.",
      city: "London",
      product: "MacBook Air M2",
      body: "Refurb looked brand new — no marks, fresh battery. Saved nearly £300 vs. Apple. Fonzo answered my question on a Sunday afternoon.",
    },
    {
      name: "Priya S.",
      city: "Birmingham",
      product: "Meta Quest 3",
      body: "Great price and the warranty gave me confidence. Picked it up from the verification hub and watched them test it in front of me.",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-border" data-testid="section-reviews">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Trusted by UK shoppers</p>
          <h2 className="font-display text-xl font-bold tracking-tight">Rated 4.9 / 5 from over 12,000 verified reviews</h2>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-0.5" aria-label="4.9 out of 5 stars">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="font-semibold tabular-nums">4.9</span>
          <span className="text-muted-foreground">· 12,418 reviews</span>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <figure
            key={i}
            className="rounded-xl border border-card-border bg-card p-5 flex flex-col gap-3"
            data-testid={`review-card-${i}`}
          >
            <Quote className="h-5 w-5 text-brand-accent" />
            <blockquote className="text-sm leading-relaxed text-foreground/90">
              “{r.body}”
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-auto pt-3 border-t border-border">
              <div className="h-8 w-8 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center text-xs font-semibold">
                {r.name.split(" ").map((s) => s[0]).join("")}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-sm leading-tight">{r.name}</p>
                <p className="text-muted-foreground">{r.city} · {r.product}</p>
              </div>
              <div className="ml-auto flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border" data-testid="section-hero">
      <div className="absolute inset-0 bg-grid opacity-30 mask-fade-bottom pointer-events-none" />
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-brand-accent/10 blur-3xl pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-12 gap-10 items-center relative">
        <div className="lg:col-span-7 space-y-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-accent/5 px-3 py-1 text-xs font-medium" data-testid="badge-hero">
            <Sparkles className="h-3.5 w-3.5 text-brand-accent" />
            <span>Engineer-verified · 12-month warranty</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Premium tech.<br />
            <span className="text-gradient-accent">Without the premium.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            Fonzo Tech sells verified iPhones, Android phones, MacBooks, iPads,
            VR headsets and audio. Every device is checked by our engineers and
            backed by a 12-month warranty — shipped fast across the UK from{" "}
            <span className="font-mono text-foreground">fonzotech.co.uk</span>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/shop">
              <Button size="lg" className="font-medium" data-testid="button-hero-shop">
                Shop all devices <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="font-medium" data-testid="button-hero-about">
                How verification works
              </Button>
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl">
            {[
              "30-point inspection",
              "Sealed or refurbished",
              "UK delivery & collection",
              "Real human support",
            ].map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-xs sm:text-[13px] text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-brand-accent shrink-0 mt-px" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hero visual stack */}
        <div className="lg:col-span-5 relative animate-fade-up-slow">
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div className="rotate-[-3deg] animate-float">
              <ProductVisual
                product={{ visualKey: "phone", category: "iPhone", color: "Natural Titanium", title: "iPhone" }}
                ratio="tall"
              />
            </div>
            <div className="space-y-3 mt-8 animate-float-delayed">
              <ProductVisual
                product={{ visualKey: "vr", category: "VR", color: "White", title: "Quest 3" }}
              />
              <ProductVisual
                product={{ visualKey: "speaker", category: "Speakers", color: "Black", title: "Speaker" }}
                ratio="tall"
              />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1.5 text-xs font-medium shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-accent" />
            <span>Verified by Fonzo</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" data-testid="section-categories">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Shop by category</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All seven categories, expertly curated.</p>
        </div>
        <Link href="/shop">
          <Button variant="ghost" size="sm" data-testid="button-view-all-categories">
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {PRODUCT_CATEGORIES.map((cat) => (
          <Link key={cat} href={`/shop/${cat}`} data-testid={`tile-category-${cat.toLowerCase()}`}>
            <div className="group rounded-xl border border-card-border bg-card hover-elevate cursor-pointer flex flex-col aspect-[4/5] overflow-hidden transition-colors hover:border-brand-accent/40">
              <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-secondary/40 to-muted/40">
                <div className="transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-accent">
                  <CategoryIcon kind={visualForCategory(cat)} />
                </div>
              </div>
              <div className="px-3 py-2.5 border-t border-border text-center">
                <span className="text-sm font-semibold group-hover:text-brand-accent transition-colors">{cat}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoryIcon({ kind }: { kind: string }) {
  // Lightweight monochrome glyph per category — uses currentColor.
  const common = "h-12 w-12 text-foreground/85";
  switch (kind) {
    case "phone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M10 18h4" strokeLinecap="round" />
        </svg>
      );
    case "laptop":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="4" y="4" width="16" height="11" rx="1.5" />
          <path d="M2 19h20l-1 2H3z" strokeLinejoin="round" />
        </svg>
      );
    case "tablet":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="18" r="0.6" fill="currentColor" />
        </svg>
      );
    case "vr":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <path d="M3 9.5C3 8 4 7 5.5 7h13C20 7 21 8 21 9.5v5C21 16 20 17 18.5 17H17c-.7 0-1.2-.3-1.6-.9L14 14c-.6-1-2.4-1-3 0l-1.4 2.1c-.4.6-.9.9-1.6.9H5.5C4 17 3 16 3 14.5z" strokeLinejoin="round" />
          <circle cx="8" cy="12" r="1.4" />
          <circle cx="16" cy="12" r="1.4" />
        </svg>
      );
    case "speaker":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <rect x="6" y="2.5" width="12" height="19" rx="2" />
          <circle cx="12" cy="8" r="2" />
          <circle cx="12" cy="15" r="3.2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}

function visualForCategory(c: string) {
  switch (c) {
    case "iPhone":
    case "Android": return "phone";
    case "Mac": return "laptop";
    case "iPad": return "tablet";
    case "VR": return "vr";
    case "Speakers": return "speaker";
    default: return "accessory";
  }
}

function FeaturedSection({ products, loading }: { products: Product[]; loading: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-border" data-testid="section-featured">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Featured</p>
          <h2 className="font-display text-xl font-bold tracking-tight">Handpicked by Fonzo engineers</h2>
        </div>
        <Link href="/shop">
          <Button variant="outline" size="sm" data-testid="button-view-all-featured">
            View all
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
          : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-xl border border-card-border bg-card overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-1/2 mt-2" />
      </div>
    </div>
  );
}

function ValueProps() {
  const props = [
    { icon: ShieldCheck, title: "Verified devices", body: "Every unit passes a 30-point engineer inspection before listing." },
    { icon: Truck, title: "Fast UK delivery", body: "Free over £100, plus tracked collection from our verification hub." },
    { icon: RotateCcw, title: "14-day returns", body: "Change your mind, no fees. Pre-paid return label included." },
    { icon: Headphones, title: "Real human support", body: "UK-based humans, 7 days a week, by email or phone." },
  ];
  return (
    <section className="bg-secondary/40 border-y border-border py-12" data-testid="section-value">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {props.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NewArrivals({ products, loading }: { products: Product[]; loading: boolean }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12" data-testid="section-new-arrivals">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-brand-accent mb-1">Just in</p>
          <h2 className="font-display text-xl font-bold tracking-tight">New arrivals</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
          : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function PromoBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-2xl bg-primary text-primary-foreground p-8 lg:p-12 grid lg:grid-cols-2 items-center gap-6 relative overflow-hidden" data-testid="section-promo">
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-brand-accent/30 blur-3xl pointer-events-none" />
        <div className="space-y-4 relative">
          <p className="text-xs font-mono uppercase tracking-wider opacity-70">Trade-in programme</p>
          <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight">
            Trade in your old device. Get instant credit toward your next.
          </h2>
          <p className="text-sm opacity-80 max-w-md">
            Send us your old phone, tablet or laptop. We test it, give you a fair quote and apply
            the credit to your Fonzo Tech order — usually within 48 hours.
          </p>
          <div className="flex gap-3 pt-2">
            <Link href="/about#contact">
              <Button variant="secondary" data-testid="button-promo-trade">
                Get a trade-in quote
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 relative">
          <div className="rotate-[-4deg]">
            <ProductVisual product={{ visualKey: "phone", category: "iPhone", color: "Black", title: "Phone" }} />
          </div>
          <div className="mt-6">
            <ProductVisual product={{ visualKey: "laptop", category: "Mac", color: "", title: "Laptop" }} />
          </div>
          <div className="rotate-[4deg]">
            <ProductVisual product={{ visualKey: "tablet", category: "iPad", color: "", title: "Tablet" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
