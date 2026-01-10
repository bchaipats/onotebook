import type { NotebookAccentColor } from "./colors";
import { oklchToHex } from "./colors";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const APP_NAME = "ONotebook";
export const APP_VERSION = "0.1.0";

export const NOTEBOOK_ACCENT_COLORS: NotebookAccentColor[] = [
  { name: "Indigo", hue: 265, chroma: 0.18 },
  { name: "Sage", hue: 145, chroma: 0.12 },
  { name: "Terracotta", hue: 35, chroma: 0.14 },
  { name: "Ocean", hue: 220, chroma: 0.16 },
  { name: "Plum", hue: 310, chroma: 0.15 },
  { name: "Slate", hue: 230, chroma: 0.06 },
  { name: "Moss", hue: 120, chroma: 0.1 },
  { name: "Rust", hue: 25, chroma: 0.15 },
];

export const PRESET_COLORS = NOTEBOOK_ACCENT_COLORS.map((c) =>
  oklchToHex(50, c.chroma, c.hue),
);
