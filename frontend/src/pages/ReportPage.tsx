import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { InterviewStepper } from "@components/app/InterviewStepper";
import { ButtonLink } from "@components/ui/Button";
import { CheckIcon } from "@components/ui/icons";
import { Spinner } from "@components/ui/Spinner";
import {
  readRepositoryDraft,
  readSessionDraft,
  readVacancyDraft,
  type RepositoryDraft,
  type VacancyDraft,
} from "@lib/interview-draft";
import {
  generateReport,
  getReport,
  InterviewError,
  type InterviewReport,
} from "@lib/interview-api";
import { paths } from "@routes/paths";

const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const seniorityLabels: Record<string, string> = {
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  lead: "Liderança técnica",
};

function buildEyebrow(vacancy: VacancyDraft | null, repository: RepositoryDraft | null): string {
  const profile = vacancy?.profile ?? null;
  const parts = ["Relatório"];

  const seniority = profile ? seniorityLabels[profile.seniorityLevel] : undefined;
  const stack = profile?.technologies.slice(0, 2).join(", ");

  if (seniority && stack) parts.push(`${seniority} — ${stack}`);
  else if (stack) parts.push(stack);
  else if (seniority) parts.push(seniority);

  if (repository) parts.push(`${repository.owner}/${repository.name}`);

  parts.push(
    new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  );

  return parts.join(" · ");
}

function buildHeadline(score: number): string {
  if (score >= 80) return "Você mandou muito bem.";
  if (score >= 60) return "Você está mais perto do que pensa.";
  if (score >= 40) return "Dá pra melhorar, e o caminho está claro.";
  return "Ainda há bastante chão pela frente — e está tudo bem.";
}

function buildSummary(score: number): string {
  if (score >= 80) {
    return "Desempenho forte nesta simulação. Use o relatório abaixo para afinar os últimos detalhes.";
  }
  if (score >= 60) {
    return "Desempenho acima da média. Nada aqui é veredito — é um mapa do que praticar antes da entrevista de verdade.";
  }
  return "Ainda há lacunas importantes. Veja abaixo o que fortalecer antes da próxima simulação.";
}

export function ReportPage() {
  const [vacancy] = useState(readVacancyDraft);
  const [repository] = useState(readRepositoryDraft);
  const [sessionDraft] = useState(readSessionDraft);

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<InterviewError | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!sessionDraft || requestedRef.current) return;
    requestedRef.current = true;

    (async () => {
      try {
        const existing = await getReport(sessionDraft.id);
        const result = existing ?? (await generateReport(sessionDraft.id));
        setReport(result);
      } catch (cause: unknown) {
        setError(
          cause instanceof InterviewError
            ? cause
            : new InterviewError("Não conseguimos gerar o relatório."),
        );
      }
    })();
  }, [sessionDraft]);

  if (!vacancy || !sessionDraft) {
    return <Navigate to={paths.newInterview} replace />;
  }

  if (error?.code === "respostas_pendentes") {
    return <Navigate to={paths.interview} replace />;
  }

  return (
    <div className="min-h-screen animate-rise">
      <main className="mx-auto w-full max-w-[920px] px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-18">
        <InterviewStepper current={4} className="mb-10 sm:mb-12" />

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[--alpha(var(--color-danger)/45%)] bg-[--alpha(var(--color-danger)/8%)] px-5 py-12 text-center">
            <p className="text-[15px] text-fg-2">{error.detail}</p>
            {error.hint && <p className="font-mono text-[12.5px] text-fg-muted">{error.hint}</p>}
            <ButtonLink to={paths.dashboard} variant="secondary">
              Voltar ao dashboard
            </ButtonLink>
          </div>
        )}

        {!error && !report && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Spinner label="Gerando seu relatório..." />
            <p className="text-[14.5px] text-fg-2 font-mono">
              A IA está avaliando suas respostas...
            </p>
          </div>
        )}

        {!error && report && (
          <>
            <ScoreHeader eyebrow={buildEyebrow(vacancy, repository)} report={report} />

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
              <AdherenceCard report={report} />
              <DimensionsCard report={report} />
            </div>

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
              <Card title="Pontos fortes" titleClassName="text-trail-text">
                {report.strengths.map((item) => (
                  <Note key={item.title} tone="good" {...item} />
                ))}
              </Card>

              <Card title="Lacunas identificadas" titleClassName="text-ember-text">
                {report.gaps.map((item) => (
                  <Note key={item.title} tone="gap" {...item} />
                ))}
              </Card>

              <Card title="Recomendações acionáveis">
                {report.recommendations.map((item) => (
                  <Note key={item.title} tone="action" {...item} />
                ))}
              </Card>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink to={paths.newInterview} className="max-sm:w-full">
                Nova entrevista
              </ButtonLink>
              <ButtonLink to={paths.dashboard} variant="secondary" className="max-sm:w-full">
                Voltar ao dashboard
              </ButtonLink>
            </div>

            <p className="mt-7 text-center font-mono text-xs text-fg-muted">
              Sem pressão. Só clareza.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ScoreHeader({ eyebrow, report }: { eyebrow: string; report: InterviewReport }) {
  const offset = RING_LENGTH * (1 - report.overallScore / 100);

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface p-5 text-center shadow-md sm:flex-row sm:flex-wrap sm:gap-8 sm:p-8 sm:text-left">
      <div className="relative size-[130px] flex-none sm:mx-auto sm:size-[150px]">
        <svg width="100%" height="100%" viewBox="0 0 120 120" className="-rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--color-surface-2)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke="url(#report-ring)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={offset}
            className="animate-ring-draw"
            style={{ "--ring-length": RING_LENGTH } as React.CSSProperties}
          />
          <defs>
            <linearGradient id="report-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-trail-600)" />
              <stop offset="100%" stopColor="var(--color-trail-400)" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[42px] leading-none font-bold">
            {Math.round(report.overallScore)}
          </span>
          <span className="font-mono text-xs text-fg-muted">/100</span>
        </div>
      </div>

      <div className="w-full sm:min-w-[260px] sm:flex-1">
        <span className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-trail-text uppercase">
          {eyebrow}
        </span>
        <h1 className="my-2.5 font-display text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-[-0.02em] text-pretty">
          {buildHeadline(report.overallScore)}
        </h1>
        <p className="text-[15px] text-pretty text-fg-2">{buildSummary(report.overallScore)}</p>
      </div>
    </div>
  );
}

function Card({
  title,
  titleClassName,
  children,
}: {
  title: string;
  titleClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6.5">
      <h2 className={`mb-4 font-display text-[1.1rem] font-semibold ${titleClassName ?? ""}`}>{title}</h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function AdherenceCard({ report }: { report: InterviewReport }) {
  const adherence = Math.round(report.adherenceScore);
  const topStrength = report.strengths[0];
  const topGap = report.gaps[0];

  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6.5">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.1rem] font-semibold">Aderência do portfólio à vaga</h2>
        <span className="font-display text-[1.7rem] font-bold text-trail-text">{adherence}%</span>
      </div>

      <div className="mb-4.5 h-3 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full animate-grow rounded-full bg-[linear-gradient(90deg,var(--color-trail-500),var(--color-ember-400))]"
          style={{ "--grow-to": `${adherence}%`, width: `${adherence}%` } as React.CSSProperties}
        />
      </div>

      <div className="flex flex-col gap-3">
        {topStrength && <Note tone="good" {...topStrength} />}
        {topGap && <Note tone="gap" {...topGap} />}
      </div>
    </section>
  );
}

function DimensionsCard({ report }: { report: InterviewReport }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6.5">
      <h2 className="mb-4.5 font-display text-[1.1rem] font-semibold">Desempenho por dimensão</h2>

      <div className="flex flex-col gap-3.5">
        {report.dimensionScores.map((dimension, index) => (
          <div key={dimension.label} className="flex items-center gap-3">
            <span className="w-[86px] flex-none text-[13px] text-fg-2 sm:w-[150px] sm:text-[13.5px]">
              {dimension.label}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full animate-grow rounded-full ${
                  dimension.score >= 70
                    ? "bg-[linear-gradient(90deg,var(--color-trail-600),var(--color-trail-400))]"
                    : "bg-[linear-gradient(90deg,var(--color-ember-600),var(--color-ember-400))]"
                }`}
                style={
                  {
                    "--grow-to": `${dimension.score}%`,
                    width: `${dimension.score}%`,
                    animationDelay: `${0.1 * (index + 1)}s`,
                  } as React.CSSProperties
                }
              />
            </div>
            <span className="w-[30px] text-right font-mono text-[12.5px]">
              {Math.round(dimension.score)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

type NoteTone = "good" | "gap" | "action";

function NoteIcon({ tone }: { tone: NoteTone }) {
  if (tone === "good") {
    return (
      <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-[--alpha(var(--color-trail-500)/15%)] text-trail-500">
        <CheckIcon size={10} />
      </span>
    );
  }

  if (tone === "gap") {
    return (
      <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-[--alpha(var(--color-ember-400)/16%)] font-mono text-[11px] font-semibold text-ember-text">
        !
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-surface-2">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M2 6h8M7 3l3 3-3 3"
          stroke="var(--color-trail-text)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Note({ tone, title, text }: { tone: NoteTone; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <NoteIcon tone={tone} />
      <p className="text-sm leading-[1.55] text-fg-2">
        <b className="font-semibold text-fg">{title}</b> {text}
      </p>
    </div>
  );
}
