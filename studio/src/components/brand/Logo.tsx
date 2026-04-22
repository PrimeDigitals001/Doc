import Image from "next/image";

type Variant = "bar" | "emblem-block" | "plain";

type LogoProps = {
  variant?: Variant;
  className?: string;
  height?: number;
};

/**
 * Logo always sits on a navy container because the SVG is white-on-transparent.
 * - bar: full-width navy strip, logo left-aligned with padding
 * - emblem-block: compact navy square for corner placement (agreement/tnc headers)
 * - plain: raw logo (only use when caller already provides navy bg)
 */
export function Logo({ variant = "bar", className = "", height = 64 }: LogoProps) {
  if (variant === "plain") {
    return (
      <Image
        src="/brand/logo-horizontal.svg"
        alt="Prime Digitals"
        width={Math.round(height * (2500 / 1100.67))}
        height={height}
        priority
        className={className}
      />
    );
  }

  if (variant === "emblem-block") {
    return (
      <div className={`pd-logobar ${className}`} style={{ padding: "12px 16px" }}>
        <Image
          src="/brand/logo-horizontal.svg"
          alt="Prime Digitals"
          width={Math.round(height * (2500 / 1100.67))}
          height={height}
          priority
        />
      </div>
    );
  }

  // bar
  return (
    <div className={`pd-logobar ${className}`} style={{ padding: "14px 28px" }}>
      <Image
        src="/brand/logo-horizontal.svg"
        alt="Prime Digitals"
        width={Math.round(height * (2500 / 1100.67))}
        height={height}
        priority
      />
    </div>
  );
}
