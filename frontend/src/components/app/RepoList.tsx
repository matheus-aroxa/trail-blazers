import { useState } from "react";

import type { RepoSummary } from "@lib/repositories-api";
import { RepositoryCard } from "@components/app/RepoCard";
import { Pagination } from "@components/ui/Pagination";

const PAGE_SIZE = 6;

interface RepositoryListProps {
  repositories: RepoSummary[];
  selectedIds: number[];
  limit: number;
  onToggle: (repository: RepoSummary) => void;
  className?: string;
}

export function RepositoryList({
  repositories,
  selectedIds,
  limit,
  onToggle,
  className,
}: RepositoryListProps) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(repositories.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const full = selectedIds.length >= limit;
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleRepositories = repositories.slice(start, start + PAGE_SIZE);

  return (
    <div className={className}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-3.5">
        {visibleRepositories.map((repository) => {
          const selected = selectedIds.includes(repository.id);

          return (
            <RepositoryCard
              key={repository.id}
              repository={repository}
              selected={selected}
              locked={full && !selected}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      {pageCount > 1 && (
        <Pagination
          ariaLabel="Paginação dos repositórios"
          page={currentPage}
          pageCount={pageCount}
          total={repositories.length}
          rangeStart={start + 1}
          rangeEnd={start + visibleRepositories.length}
          onChange={setPage}
        />
      )}
    </div>
  );
}
