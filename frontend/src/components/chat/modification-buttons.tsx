"use client";

import { memo } from "react";

const MODIFICATIONS = [
  {
    label: "Shorter",
    instruction: "Make your response shorter and more concise.",
  },
  {
    label: "Longer",
    instruction: "Make your response longer with more detail and examples.",
  },
  {
    label: "Simpler",
    instruction:
      "Make your response simpler and easier to understand. Use plain language.",
  },
  {
    label: "More detailed",
    instruction:
      "Make your response more detailed with technical depth and thoroughness.",
  },
] as const;

interface ModificationButtonsProps {
  onRegenerate: (instruction: string) => void;
}

export const ModificationButtons = memo(function ModificationButtons({
  onRegenerate,
}: ModificationButtonsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {MODIFICATIONS.map(({ label, instruction }) => (
        <button
          key={label}
          onClick={() => onRegenerate(instruction)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-hover"
        >
          {label}
        </button>
      ))}
    </div>
  );
});
