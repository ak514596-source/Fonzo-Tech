// Inline SVG mark for Fonzo Tech.
// Recreated from the brand reference: a square tile with a stylized
// "F" wing inside. Uses currentColor so it inverts cleanly in dark mode.

type LogoProps = {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  variant?: "default" | "mono-light" | "mono-dark";
};

export function FonzoLogo({
  className = "",
  size = 32,
  showWordmark = true,
  variant = "default",
}: LogoProps) {
  // The mark itself is always a dark tile + light F.
  // We render directly with our brand colors so it stays consistent across themes.
  const tileFill = variant === "mono-light" ? "#ffffff" : "#0f1115";
  const fStroke = variant === "mono-light" ? "#0f1115" : "#ffffff";

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      data-testid="brand-logo"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Fonzo Tech"
        role="img"
      >
        <rect width="64" height="64" rx="10" fill={tileFill} />
        {/* Stylized F as a wing-like stroke */}
        <path
          d="M22 14 V50 M22 14 C 36 14 46 22 46 32 C 46 40 38 44 28 44 H 22"
          stroke={fStroke}
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span className="font-display font-bold tracking-tight text-foreground leading-none">
          <span className="text-foreground">Fonzo</span>
          <span className="text-muted-foreground/80 ml-1 text-[0.7em] font-medium tracking-wider uppercase align-middle">
            Tech
          </span>
        </span>
      )}
    </span>
  );
}
