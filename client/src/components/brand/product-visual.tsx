import type { Product } from "@shared/schema";

// Refined SVG placeholders that suggest each product class without using
// stock photography. Each visual scales fluidly and respects dark mode.

type Props = {
  product: Pick<Product, "visualKey" | "category" | "color" | "title"> & { imageUrl?: string };
  className?: string;
  ratio?: "square" | "tall";
};

export function ProductVisual({ product, className = "", ratio = "square" }: Props) {
  const key = (product.visualKey || inferVisualKey(product.category)).toLowerCase();
  const hue = hueForCategory(product.category);

  const aspect = ratio === "tall" ? "aspect-[4/5]" : "aspect-square";

  if (product.imageUrl) {
    return (
      <div
        className={`${aspect} relative overflow-hidden rounded-xl bg-secondary border border-card-border ${className}`}
        data-testid={`visual-image-${product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      >
        <img
          src={product.imageUrl}
          alt={product.title}
          className="h-full w-full object-contain p-3"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${aspect} relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-muted border border-card-border ${className}`}
      data-testid={`visual-${key}`}
      aria-hidden
    >
      {/* Soft radial accent */}
      <div
        className="absolute -top-1/3 -right-1/4 h-[140%] w-[120%] rounded-full opacity-40 blur-3xl"
        style={{ background: `hsl(${hue} 70% 60% / 0.25)` }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        {key === "phone" && <PhoneArt color={product.color} />}
        {key === "laptop" && <LaptopArt />}
        {key === "tablet" && <TabletArt />}
        {key === "vr" && <VRArt />}
        {key === "speaker" && <SpeakerArt />}
        {key === "accessory" && <AccessoryArt />}
      </div>
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.4)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30 pointer-events-none" />
    </div>
  );
}

function inferVisualKey(category: string) {
  switch (category) {
    case "iPhone":
    case "Android":
      return "phone";
    case "Mac":
      return "laptop";
    case "iPad":
      return "tablet";
    case "VR":
      return "vr";
    case "Speakers":
      return "speaker";
    default:
      return "accessory";
  }
}

function hueForCategory(category: string) {
  switch (category) {
    case "iPhone": return 220;
    case "Android": return 174;
    case "Mac": return 262;
    case "iPad": return 200;
    case "VR": return 290;
    case "Speakers": return 38;
    default: return 174;
  }
}

function PhoneArt({ color }: { color?: string }) {
  const tone = color?.toLowerCase().includes("white") ? "#f3f4f6" : "#1a1d23";
  return (
    <svg viewBox="0 0 200 280" className="h-full w-auto" fill="none">
      <rect x="40" y="10" width="120" height="260" rx="22" fill={tone} stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="48" y="22" width="104" height="236" rx="16" fill="hsl(var(--background))" />
      <rect x="84" y="26" width="32" height="6" rx="3" fill={tone} />
      {/* Screen content abstract */}
      <rect x="58" y="48" width="84" height="10" rx="2" fill="hsl(var(--brand-accent) / 0.6)" />
      <rect x="58" y="66" width="64" height="6" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
      <rect x="58" y="80" width="84" height="60" rx="6" fill="hsl(var(--muted) / 0.8)" />
      <rect x="58" y="150" width="40" height="40" rx="6" fill="hsl(var(--brand-accent) / 0.25)" />
      <rect x="104" y="150" width="38" height="40" rx="6" fill="hsl(var(--muted) / 0.8)" />
      <rect x="58" y="200" width="84" height="40" rx="6" fill="hsl(var(--muted) / 0.6)" />
    </svg>
  );
}

function LaptopArt() {
  return (
    <svg viewBox="0 0 280 200" className="w-full h-auto" fill="none">
      <path d="M40 30 H240 V160 H40 Z" fill="#1a1d23" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="48" y="38" width="184" height="114" rx="4" fill="hsl(var(--background))" />
      {/* Code-window like content */}
      <circle cx="58" cy="50" r="3" fill="#ef4444" />
      <circle cx="68" cy="50" r="3" fill="#f59e0b" />
      <circle cx="78" cy="50" r="3" fill="#10b981" />
      <rect x="58" y="62" width="100" height="4" rx="2" fill="hsl(var(--brand-accent))" />
      <rect x="58" y="72" width="140" height="4" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
      <rect x="58" y="82" width="80" height="4" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
      <rect x="58" y="100" width="60" height="40" rx="4" fill="hsl(var(--brand-accent) / 0.25)" />
      <rect x="124" y="100" width="100" height="40" rx="4" fill="hsl(var(--muted) / 0.8)" />
      {/* Base */}
      <path d="M20 160 H260 L250 178 H30 Z" fill="#0a0c10" />
      <rect x="120" y="160" width="40" height="6" rx="2" fill="hsl(var(--border))" />
    </svg>
  );
}

function TabletArt() {
  return (
    <svg viewBox="0 0 220 280" className="h-full w-auto" fill="none">
      <rect x="20" y="20" width="180" height="240" rx="14" fill="#1a1d23" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <rect x="30" y="30" width="160" height="220" rx="6" fill="hsl(var(--background))" />
      <rect x="42" y="44" width="80" height="8" rx="2" fill="hsl(var(--brand-accent))" />
      <rect x="42" y="60" width="120" height="6" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
      <rect x="42" y="80" width="136" height="80" rx="6" fill="hsl(var(--muted))" />
      <rect x="42" y="170" width="64" height="64" rx="6" fill="hsl(var(--brand-accent) / 0.25)" />
      <rect x="114" y="170" width="64" height="64" rx="6" fill="hsl(var(--muted))" />
    </svg>
  );
}

function VRArt() {
  return (
    <svg viewBox="0 0 280 200" className="w-full h-auto" fill="none">
      <path
        d="M30 70 Q30 40 70 40 H210 Q250 40 250 70 V130 Q250 160 210 160 H180 Q160 160 150 144 Q140 130 130 130 Q120 130 110 144 Q100 160 80 160 H70 Q30 160 30 130 Z"
        fill="#1a1d23"
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
      />
      <ellipse cx="90" cy="100" rx="32" ry="22" fill="hsl(var(--brand-accent) / 0.4)" />
      <ellipse cx="190" cy="100" rx="32" ry="22" fill="hsl(var(--brand-accent) / 0.4)" />
      <ellipse cx="90" cy="100" rx="14" ry="14" fill="hsl(var(--background))" />
      <ellipse cx="190" cy="100" rx="14" ry="14" fill="hsl(var(--background))" />
      <rect x="20" y="80" width="14" height="40" rx="4" fill="#0a0c10" />
      <rect x="246" y="80" width="14" height="40" rx="4" fill="#0a0c10" />
    </svg>
  );
}

function SpeakerArt() {
  return (
    <svg viewBox="0 0 200 260" className="h-full w-auto" fill="none">
      <rect x="40" y="20" width="120" height="220" rx="20" fill="#1a1d23" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="100" cy="90" r="34" fill="hsl(var(--background))" />
      <circle cx="100" cy="90" r="22" fill="hsl(var(--brand-accent) / 0.5)" />
      <circle cx="100" cy="90" r="10" fill="#0a0c10" />
      <circle cx="100" cy="170" r="44" fill="hsl(var(--background))" />
      <circle cx="100" cy="170" r="32" fill="hsl(var(--muted))" />
      <circle cx="100" cy="170" r="14" fill="#0a0c10" />
      <rect x="58" y="220" width="84" height="6" rx="3" fill="hsl(var(--brand-accent))" />
    </svg>
  );
}

function AccessoryArt() {
  return (
    <svg viewBox="0 0 240 240" className="h-full w-auto" fill="none">
      <rect x="40" y="40" width="160" height="160" rx="18" fill="#1a1d23" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <circle cx="120" cy="120" r="56" fill="hsl(var(--background))" />
      <circle cx="120" cy="120" r="36" fill="hsl(var(--brand-accent) / 0.35)" />
      <circle cx="120" cy="120" r="14" fill="#0a0c10" />
      <rect x="56" y="56" width="20" height="6" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
      <rect x="164" y="178" width="20" height="6" rx="2" fill="hsl(var(--muted-foreground) / 0.5)" />
    </svg>
  );
}
