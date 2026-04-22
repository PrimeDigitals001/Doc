"use client";

import Image from "next/image";

type WatermarkProps = {
  position?: "br" | "bl";
};

/**
 * Bottom-corner watermark at 15% opacity. Clipped by parent's overflow:hidden
 * (the .pd-page container).
 */
export function Watermark({ position = "br" }: WatermarkProps) {
  return (
    <Image
      src="/brand/watermark.png"
      alt=""
      aria-hidden
      width={720}
      height={720}
      className={`pd-watermark pd-watermark--${position}`}
      priority={false}
    />
  );
}
