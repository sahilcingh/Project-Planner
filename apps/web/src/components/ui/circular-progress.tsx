"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import StatsCounter from "./stats-counter";

/**
 * Adapted from Skiper UI's skiper89 (circular scroll-progress indicator) —
 * same SVG ring + framer-motion stroke technique, but driven by a `percent`
 * prop instead of scroll position, with the demo-only scroll/drag/lorem
 * chrome stripped out.
 */
export function CircularProgress({
  percent,
  size = 48,
  strokeWidth = 3,
  className,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center text-foreground", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="opacity-20"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ rotate: -90, transformOrigin: "50% 50%" }}
        />
      </svg>
      <span className="absolute text-[10px] font-medium">
        <StatsCounter value={clamped} duration={0.8} suffix="%" decimals={0} />
      </span>
    </div>
  );
}
