import { Link, useLocation } from "wouter";
import { FonzoLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { isPortalHost } from "@/lib/portal";
import {
  ShoppingBag,
  Menu,
  Sun,
  Moon,
  Search,
  ShieldCheck,
  Truck,
  Headphones,
  RotateCcw,
  Mail,
  MapPin,
  Phone,
  ArrowRight,
} from "lucide-react";
import { ProductVisual } from "@/components/brand/product-visual";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop/iPhone", label: "iPhone" },
  { href: "/shop/Android", label: "Android" },
  { href: "/shop/Mac", label: "Mac" },
  { href: "/shop/iPad", label: "iPad" },
  { href: "/shop/VR", label: "VR" },
  { href: "/shop/Speakers", label: "Speakers" },
  { href: "/shop/Accessories", label: "Accessories" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  // The team portal subdomain gets its own minimal, private-looking chrome.
  if (isPortalHost()) {
    return <PortalShell>{children}</PortalShell>;
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portal chrome — shown only on portal.fonzotech.co.uk. No shop navigation,
// no cart, no marketing footer: just what staff need.
// ---------------------------------------------------------------------------
function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" data-testid="link-portal-home">
                <FonzoLogo size={26} />
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent/10 text-brand-accent px-2 py-1 text-xs font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" /> Team Portal
              </span>
            </div>
            <div className="flex items-center gap-1">
              {user && (
                <nav className="hidden sm:flex items-center gap-1 mr-1" aria-label="Portal">
                  <PortalNavLink href="/team" label="Dashboard" />
                  <PortalNavLink href="/team/listings" label="Listings" />
                  <PortalNavLink href="/team/stock" label="Stock" />
                </nav>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Toggle dark mode"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium"
                  onClick={signOut}
                  data-testid="button-sign-out"
                >
                  Sign out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card/40 mt-16" data-testid="portal-footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Fonzo Tech — Team Portal</p>
          <p>Internal use only · Authorised staff access</p>
        </div>
      </footer>
    </div>
  );
}

function PortalNavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const active = location === href;
  return (
    <Link href={href} data-testid={`portal-nav-${label.toLowerCase()}`}>
      <span
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover-elevate cursor-pointer ${
          active ? "text-foreground bg-accent" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground text-xs sm:text-[13px] py-2 px-4 text-center" data-testid="announcement-bar">
      <span className="font-medium">Free UK delivery on orders over £100</span>
      <span className="opacity-60 mx-2">·</span>
      <span className="opacity-90">12-month Fonzo warranty on every device</span>
      <span className="opacity-60 mx-2 hidden sm:inline">·</span>
      <span className="opacity-90 hidden sm:inline">fonzotech.co.uk</span>
    </div>
  );
}

function SiteHeader() {
  const { count } = useCart();
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link href="/" data-testid="link-home">
              <FonzoLogo size={28} />
            </Link>
          </div>

          <form onSubmit={onSearch} className="hidden md:flex items-center gap-2 flex-1 max-w-xl" role="search">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search iPhone, MacBook, Quest 3…"
                className="pl-9 h-10 bg-muted/50 border-border"
                data-testid="input-search-header"
                type="search"
              />
            </div>
          </form>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              data-testid="button-theme-toggle"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <Button variant="ghost" size="sm" className="hidden md:inline-flex font-medium" onClick={signOut} data-testid="button-sign-out">
                Sign out
              </Button>
            ) : (
              <Link href="/login" data-testid="link-login-desktop">
                <Button variant="ghost" size="sm" className="hidden md:inline-flex font-medium">
                  Login
                </Button>
              </Link>
            )}
            <CartButton count={count} />
            <MobileMenu />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 h-10 -mx-2 overflow-x-auto" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const [location] = useLocation();
  const active = location === href || (href !== "/shop" && location.startsWith(href));
  return (
    <Link href={href} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <span
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover-elevate cursor-pointer ${
          active ? "text-foreground bg-accent" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>
            <FonzoLogo size={24} />
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} data-testid={`mobile-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <span className="block px-3 py-2.5 rounded-md text-sm font-medium hover-elevate cursor-pointer">
                {l.label}
              </span>
            </Link>
          ))}
          <div className="h-px bg-border my-2" />
          {user ? (
            <button
              onClick={() => {
                signOut();
                setOpen(false);
              }}
              className="text-left block px-3 py-2.5 rounded-md text-sm font-medium hover-elevate cursor-pointer"
              data-testid="mobile-button-sign-out"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} data-testid="mobile-nav-login">
              <span className="block px-3 py-2.5 rounded-md text-sm font-medium hover-elevate cursor-pointer">
                Login / sign up
              </span>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartButton({ count }: { count: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-open-cart" aria-label="Open cart">
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-brand-accent text-[hsl(var(--brand-accent-foreground))] text-[10px] font-bold flex items-center justify-center"
              data-testid="badge-cart-count"
            >
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        <CartDrawerBody />
      </SheetContent>
    </Sheet>
  );
}

function CartDrawerBody() {
  const { items, subtotal, setQty, remove } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Your cart is empty</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Add a verified Fonzo Tech device to get started. All orders are warranty-backed.
        </p>
        <Link href="/shop">
          <Button size="sm" className="mt-2" data-testid="button-empty-cart-shop">
            Browse devices
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4 space-y-4">
        {items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex gap-3 pb-4 border-b border-border last:border-0"
            data-testid={`cart-row-${product.id}`}
          >
            <div className="w-20 shrink-0">
              <ProductVisual product={product} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{product.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {product.condition} · {product.storage || product.color || product.brand}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 border border-border rounded-md">
                  <button
                    className="h-7 w-7 text-sm hover-elevate"
                    onClick={() => setQty(product.id, quantity - 1)}
                    data-testid={`button-qty-decrement-${product.id}`}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="text-xs font-mono w-6 text-center" data-testid={`text-cart-qty-${product.id}`}>
                    {quantity}
                  </span>
                  <button
                    className="h-7 w-7 text-sm hover-elevate"
                    onClick={() => setQty(product.id, quantity + 1)}
                    data-testid={`button-qty-increment-${product.id}`}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-semibold tabular-nums" data-testid={`text-line-total-${product.id}`}>
                  {formatPrice(product.price * quantity)}
                </span>
              </div>
              <button
                onClick={() => remove(product.id)}
                className="text-[11px] text-muted-foreground hover:text-destructive mt-1"
                data-testid={`button-remove-${product.id}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-semibold tabular-nums" data-testid="text-cart-subtotal">
            {formatPrice(subtotal)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Shipping, taxes and any discounts are calculated at checkout.
        </p>
        <Link href="/checkout">
          <Button className="w-full" data-testid="button-go-checkout">
            Checkout <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40 mt-16" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2">
            <FonzoLogo size={28} />
            <p className="text-sm text-muted-foreground mt-3 max-w-xs">
              Fonzo Tech is an independent UK retailer of verified consumer
              electronics. Every device is engineer-checked and warranty-backed.
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-3">fonzotech.co.uk</p>
          </div>
          <FooterCol title="Shop">
            <FooterLink href="/shop/iPhone">iPhone</FooterLink>
            <FooterLink href="/shop/Android">Android</FooterLink>
            <FooterLink href="/shop/Mac">Mac</FooterLink>
            <FooterLink href="/shop/iPad">iPad &amp; Tablets</FooterLink>
            <FooterLink href="/shop/VR">VR</FooterLink>
            <FooterLink href="/shop/Speakers">Speakers</FooterLink>
            <FooterLink href="/shop/Accessories">Accessories</FooterLink>
          </FooterCol>
          <FooterCol title="Help">
            <FooterLink href="/about">About Fonzo Tech</FooterLink>
            <FooterLink href="/about#warranty">Warranty &amp; returns</FooterLink>
            <FooterLink href="/about#delivery">Delivery &amp; collection</FooterLink>
            <FooterLink href="/about#contact">Contact support</FooterLink>
          </FooterCol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-8 border-b border-border">
          <TrustChip icon={<ShieldCheck className="h-4 w-4" />} title="12-month warranty" sub="On every device" />
          <TrustChip icon={<Truck className="h-4 w-4" />} title="Free UK delivery" sub="On orders over £100" />
          <TrustChip icon={<RotateCcw className="h-4 w-4" />} title="14-day returns" sub="Hassle-free, no fees" />
          <TrustChip icon={<Headphones className="h-4 w-4" />} title="Real human support" sub="UK-based, 7 days" />
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Fonzo Tech · fonzotech.co.uk · All trademarks belong to their respective owners.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> support@fonzotech.co.uk</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> United Kingdom</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-display font-semibold text-sm mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href}>
        <span className="hover:text-foreground cursor-pointer transition-colors">{children}</span>
      </Link>
    </li>
  );
}

function TrustChip({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-card-border bg-card">
      <div className="h-8 w-8 rounded-md bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
