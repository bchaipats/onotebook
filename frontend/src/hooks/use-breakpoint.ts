"use client";

import { useState, useEffect } from "react";

type Breakpoint = "sm" | "md" | "lg";

const BREAKPOINTS = {
  md: 768,
  lg: 1024,
} as const;

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "lg";
  if (window.innerWidth >= BREAKPOINTS.lg) return "lg";
  if (window.innerWidth >= BREAKPOINTS.md) return "md";
  return "sm";
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    getBreakpoint(),
  );

  useEffect(() => {
    function handleResize() {
      setBreakpoint(getBreakpoint());
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}
