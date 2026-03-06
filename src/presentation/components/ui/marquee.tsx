"use client";

import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  gap?: string;
  duration?: string;
}

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
  repeat = 4,
  gap = "1rem",
  duration = "40s",
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [--gap:1rem]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
      style={
        {
          "--gap": gap,
          "--duration": duration,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: repeat }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "flex shrink-0 justify-around gap-[var(--gap)]",
            vertical ? "flex-col" : "flex-row",
            vertical
              ? reverse
                ? "animate-marquee-vertical"
                : "animate-marquee-vertical [animation-direction:reverse]"
              : reverse
              ? "animate-marquee [animation-direction:reverse]"
              : "animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
