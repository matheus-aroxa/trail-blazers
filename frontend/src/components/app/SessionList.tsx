import { useState } from "react";

import { SessionCard } from "@components/app/SessionCard";
import { Pagination } from "@components/ui/Pagination";
import type { InterviewSessionSummary } from "@lib/interview-api";

const PAGE_SIZE = 6;

interface SessionListProps {
  sessions: InterviewSessionSummary[];
  className?: string;
}

export function SessionList({ sessions, className }: SessionListProps) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleSessions = sessions.slice(start, start + PAGE_SIZE);

  return (
    <div className={className}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
        {visibleSessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>

      {pageCount > 1 && (
        <Pagination
          ariaLabel="Paginação das entrevistas"
          page={currentPage}
          pageCount={pageCount}
          total={sessions.length}
          rangeStart={start + 1}
          rangeEnd={start + visibleSessions.length}
          onChange={setPage}
        />
      )}
    </div>
  );
}
