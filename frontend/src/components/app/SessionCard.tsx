import { Link } from "react-router-dom";

import type { MockSession } from "@mocks/interview-mock";
import { paths } from "@routes/paths";

function scoreColor(score: number) {
  if (score >= 75) return "var(--color-trail-text)";
  if (score >= 60) return "var(--color-ember-text)";
  return "var(--color-danger)";
}

export function SessionCard({ session }: { session: MockSession }) {
  return (
    <Link
      to={paths.report}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-trail-600 hover:no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[16.5px] leading-[1.3] font-semibold text-fg">
            {session.title}
          </h3>
          <p className="mt-1.5 font-mono text-xs text-fg-muted">
            {session.subtitle}
          </p>
        </div>

        <p
          className="flex-none font-display text-[26px] leading-none font-bold"
          style={{ color: scoreColor(session.score) }}
        >
          {session.score}
          <span className="text-[13px] font-normal text-fg-muted">/100</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[--alpha(var(--color-trail-500)/30%)] bg-[--alpha(var(--color-trail-500)/13%)] px-3 py-1 text-[12.5px] font-semibold text-trail-text">
          Aderência <span className="font-mono">{session.adherence}%</span>
        </span>
        <span className="font-mono text-[11.5px] text-fg-muted">
          ver relatório →
        </span>
      </div>
    </Link>
  );
}
