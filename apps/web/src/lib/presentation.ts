import type { DimensionDiff } from "../types";

export function initiallyExpanded(dimensions: DimensionDiff[]): Set<string> {
  return new Set(
    dimensions
      .filter((dimension) => dimension.drives_verdict)
      .slice(0, 3)
      .map((dimension) => dimension.key),
  );
}

export function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

