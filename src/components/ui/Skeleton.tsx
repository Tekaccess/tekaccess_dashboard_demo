import React from 'react';

/**
 * Base shimmering block. Use as a building block for higher-level skeletons.
 * Tailwind's `animate-pulse` provides the shimmer; we layer it over the
 * theme's surface color so it sits naturally inside cards and tables.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-surface/80 dark:bg-surface rounded ${className}`}
    />
  );
}

/**
 * Table skeleton — N rows × M columns of shimmering cells. Pass widths to
 * vary cell sizes (defaults to a sensible mix). Renders inside an existing
 * `<tbody>` so it matches the column layout of the real table exactly.
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  cellWidths,
}: {
  rows?: number;
  columns?: number;
  cellWidths?: string[];
}) {
  const widths = cellWidths
    || Array.from({ length: columns }).map((_, i) => {
      // Vary widths so the rows don't look like uniform bricks.
      const cycle = ['w-20', 'w-32', 'w-24', 'w-16', 'w-28', 'w-12'];
      return cycle[i % cycle.length];
    });

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-border">
          {Array.from({ length: columns }).map((__, cIdx) => (
            <td key={cIdx} className="px-4 py-3.5">
              <Skeleton className={`h-4 ${widths[cIdx] || 'w-24'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * KPI card skeleton — N cards laid out in a responsive grid. Matches the
 * shape used across the dashboard summary panels (icon box + 2 text lines).
 */
export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Card-grid skeleton — useful for the crushing-sites grid view or any
 * uniform card list. Renders N placeholder cards with a header bar +
 * a few text lines + a small footer chip.
 */
export function CardGridSkeleton({
  count = 4,
  columns = 3,
}: { count?: number; columns?: number }) {
  const gridCols =
    columns === 2 ? 'sm:grid-cols-2'
    : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4'
    : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
