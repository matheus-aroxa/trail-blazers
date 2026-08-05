import type { KeyboardEvent } from "react";

import { cn } from "@lib/cn";
import { CheckIcon } from "@components/ui/icons";
import type { RepoSummary } from "@lib/repositories-api";

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  Ruby: "#701516",
  "C++": "#f34b7d",
  PHP: "#4F5D95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

function languageColor(language: string) {
  return languageColors[language] ?? "var(--color-slate-400)";
}

interface RepositoryCardProps {
  repository: RepoSummary;
  selected?: boolean;
  locked?: boolean;
  onToggle?: (repository: RepoSummary) => void;
  className?: string;
}

export function RepositoryCard({
  repository,
  selected = false,
  locked = false,
  onToggle,
  className,
}: RepositoryCardProps) {
  const toggle = () => {
    if (!locked) onToggle?.(repository);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        "h-full transition-opacity duration-200",
        locked ? "cursor-not-allowed opacity-45" : "cursor-pointer",
        className,
      )}
    >
      <div
        role="checkbox"
        aria-checked={selected}
        aria-disabled={locked || undefined}
        aria-label={`${repository.owner}/${repository.name}`}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex h-full items-start gap-3.5 rounded-lg border border-border bg-surface p-[18px]",
          "transition-colors duration-200",
          !locked && "hover:border-trail-600",
        )}
      >
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg border-2 border-trail-500"
          />
        )}

        {selected ? (
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-sm bg-trail-500 text-on-trail"
          >
            <CheckIcon size={12} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="mt-0.5 size-5 flex-none rounded-sm border-2 border-fg-muted"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span
              title={repository.name}
              className="min-w-0 truncate font-mono text-[14.5px] font-semibold"
            >
              {repository.name}
            </span>
            <span className="flex-none rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] text-fg-muted">
              {repository.visibility === "private" ? "Privado" : "Público"}
            </span>
          </div>

          <p
            title={repository.description ?? undefined}
            className="mt-1.5 mb-2.5 line-clamp-3 min-h-[calc(3*1.5*13.5px)] text-[13.5px] leading-[1.5] text-fg-2"
          >
            {repository.description ?? "Sem descrição no GitHub."}
          </p>

          <span className="mt-auto inline-flex max-w-full items-center gap-[7px] self-start truncate rounded-full border border-border bg-surface-2 px-[11px] py-1 font-mono text-[12px] font-medium">
            <i
              aria-hidden="true"
              className="inline-block size-[9px] flex-none rounded-full"
              style={{
                background: repository.language
                  ? languageColor(repository.language)
                  : "var(--color-fg-muted)",
              }}
            />
            {repository.language ?? "Sem linguagem"}
          </span>
        </div>
      </div>
    </div>
  );
}
