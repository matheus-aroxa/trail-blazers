import { useState } from "react";

import { useAuth } from "@auth/useAuth";
import { AppHeader } from "@components/app/AppHeader";
import { EmptyTrail } from "@components/app/EmptyTrail";
import { SessionCard } from "@components/app/SessionCard";
import { MockBanner, MockTag } from "@components/mock/MockBanner";
import { ButtonLink } from "@components/ui/Button";
import { Container } from "@components/ui/Container";
import { PlusIcon } from "@components/ui/icons";
import { mockSessions, mockSessionsSummary } from "@mocks/interview-mock";
import { paths } from "@routes/paths";

export function DashboardPage() {
  const { user } = useAuth();
  const [showHistory, setShowHistory] = useState(true);

  return (
    <div className="min-h-screen animate-rise">
      <div className="sticky top-0 z-30">
        <MockBanner screen="histórico de entrevistas" />
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

          {showHistory ? (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <p className="font-mono text-[12.5px] text-fg-muted">
                  {mockSessionsSummary}
                </p>
                <MockTag />
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
                {mockSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            </>
          ) : (
            <EmptyTrail />
          )}

          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowHistory((current) => !current)}
              className="rounded-full border border-dashed border-border px-3.5 py-1.5 font-mono text-[11px] tracking-[0.05em] text-fg-muted transition-colors duration-200 hover:border-fg-muted hover:text-fg-2"
            >
              {showHistory
                ? "demo: ver estado vazio"
                : "demo: ver com entrevistas"}
            </button>
          </div>
        </Container>
      </main>
    </div>
  );
}
