import { cn } from "@lib/cn";

const PAGE_WINDOW = 3;

function pageWindow(page: number, pageCount: number): number[] {
  const size = Math.min(PAGE_WINDOW, pageCount);
  const first = Math.min(
    Math.max(1, page - Math.floor(size / 2)),
    pageCount - size + 1,
  );

  return Array.from({ length: size }, (_, index) => first + index);
}

const pageButton =
  "flex size-8 flex-none items-center justify-center rounded-md border font-mono text-[12.5px] " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const stepButton = cn(
  pageButton,
  "border-border text-fg-2",
  "enabled:hover:border-trail-500 enabled:hover:text-trail-text",
);

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onChange: (page: number) => void;
  ariaLabel: string;
  className?: string;
}

export function Pagination({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  onChange,
  ariaLabel,
  className,
}: PaginationProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("mt-6 flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p aria-live="polite" className="font-mono text-[11.5px] text-fg-muted">
        {rangeStart}–{rangeEnd} de {total} · página {page} de {pageCount}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
          className={stepButton}
        >
          ←
        </button>

        {pageWindow(page, pageCount).map((number) => {
          const current = number === page;

          return (
            <button
              key={number}
              type="button"
              onClick={() => onChange(number)}
              aria-label={`Página ${number}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                pageButton,
                current
                  ? "border-trail-500 bg-trail-500 font-semibold text-on-trail"
                  : "border-border text-fg-2 hover:border-trail-500 hover:text-trail-text",
              )}
            >
              {number}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === pageCount}
          aria-label="Próxima página"
          className={stepButton}
        >
          →
        </button>
      </div>
    </nav>
  );
}
