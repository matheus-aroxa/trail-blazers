import { useEffect, useState } from "react";

import { useAuth } from "@auth/useAuth";
import { AppHeader } from "@components/app/AppHeader";
import { EmptyTrail } from "@components/app/EmptyTrail";
import { SessionList } from "@components/app/SessionList";
import { ButtonLink } from "@components/ui/Button";
import { Container } from "@components/ui/Container";
import { PlusIcon } from "@components/ui/icons";
import { Spinner } from "@components/ui/Spinner";
import {
  InterviewError,
  listSessions,
  type InterviewSessionSummary,
} from "@lib/interview-api";
import { paths } from "@routes/paths";

function buildSummary(sessions: InterviewSessionSummary[]): string {
  const scored = sessions
    .map((session) => session.report?.overallScore)
    .filter((score): score is number => typeof score === "number");

  const count = sessions.length;
  const parts = [`${count} ${count === 1 ? "entrevista" : "entrevistas"}`];

  if (scored.length > 0) {
    const average = Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
    const best = Math.round(Math.max(...scored));
    parts.push(`média ${average}/100`, `melhor ${best}`);
  }

  return parts.join(" · ");
}

export function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<InterviewSessionSummary[] | null>(null);
  const [error, setError] = useState<InterviewError | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await listSessions();
        const sorted = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        if (!cancelled) setSessions(sorted);
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof InterviewError
              ? cause
              : new InterviewError("Não conseguimos carregar suas entrevistas."),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen animate-rise">
      <div className="sticky top-0 z-30">
        <AppHeader />
      </div>

      <main>
        <Container className="max-w-[1080px] px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-16">
          <div className="mb-3 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-5">
            <div>
              <h1 className="font-display text-[clamp(1.7rem,3.5vw,2.2rem)] font-semibold tracking-[-0.02em]">
                Olá, {user?.username}
              </h1>
              <p className="mt-2 text-[15px] text-fg-2">
                Continue sua preparação — cada entrevista te deixa mais perto do
                sim.
              </p>
            </div>

            <ButtonLink to={paths.newInterview} className="max-sm:w-full">
              <PlusIcon />
              Nova entrevista
            </ButtonLink>
          </div>

          {error && (
            <p className="mt-8 text-center text-[14.5px] text-fg-2">{error.detail}</p>
          )}

          {!error && sessions === null && (
            <div className="mt-14 flex justify-center">
              <Spinner label="Carregando suas entrevistas..." />
            </div>
          )}

          {!error && sessions !== null && (
            <>
              {sessions.length > 0 ? (
                <>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <p className="font-mono text-[12.5px] text-fg-muted">
                      {buildSummary(sessions)}
                    </p>
                  </div>

                  <SessionList sessions={sessions} />
                </>
              ) : (
                <EmptyTrail />
              )}
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
