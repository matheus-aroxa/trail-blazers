import type { ReactNode } from "react";

import { InterviewStepper } from "@components/app/InterviewStepper";
import { MockScreenHeader } from "@components/mock/MockBanner";
import { ButtonLink } from "@components/ui/Button";
import { CheckIcon } from "@components/ui/icons";
import {
  readRepositoryDraft,
  readVacancyDraft,
  type RepositoryDraft,
  type VacancyDraft,
} from "@lib/interview-draft";
import { mockReport } from "@mocks/interview-mock";
import { paths } from "@routes/paths";

const RING_RADIUS = 54;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const seniorityLabels: Record<string, string> = {
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  lead: "Liderança técnica",
};

function buildEyebrow(
  vacancy: VacancyDraft | null,
  repository: RepositoryDraft | null,
): string {
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

export function ReportPage() {
  const vacancy = readVacancyDraft();
  const repository = readRepositoryDraft();

  return (
    <div className="min-h-screen animate-rise">
      <MockScreenHeader screen="relatório da entrevista" label="Relatório" />

      <main className="mx-auto w-full max-w-[920px] px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-18">
        <InterviewStepper current={4} className="mb-10 sm:mb-12" />

        <ScoreHeader eyebrow={buildEyebrow(vacancy, repository)} />

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
          <AdherenceCard vacancy={vacancy} repository={repository} />
          <DimensionsCard />
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
          <Card title="Pontos fortes" titleClassName="text-trail-text">
            {mockReport.strengths.map((item) => (
              <Note key={item.title} tone="good" {...item} />
            ))}
          </Card>

          <Card title="Lacunas identificadas" titleClassName="text-ember-text">
            {mockReport.gaps.map((item) => (
              <Note key={item.title} tone="gap" {...item} />
            ))}
          </Card>

          <Card title="Recomendações acionáveis">
            {mockReport.recommendations.map((item) => (
              <Note key={item.title} tone="action" {...item} />
            ))}
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink to={paths.newInterview} className="max-sm:w-full">
            Nova entrevista
          </ButtonLink>
          <ButtonLink
            to={paths.dashboard}
            variant="secondary"
            className="max-sm:w-full"
          >
            Voltar ao dashboard
          </ButtonLink>
        </div>

        <p className="mt-7 text-center font-mono text-xs text-fg-muted">
          Sem pressão. Só clareza.
        </p>
      </main>
    </div>
  );
}

function ScoreHeader({ eyebrow }: { eyebrow: string }) {
  const offset = RING_LENGTH * (1 - mockReport.score / 100);

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface p-5 text-center shadow-md sm:flex-row sm:flex-wrap sm:gap-8 sm:p-8 sm:text-left">
      <div className="relative size-[130px] flex-none sm:mx-auto sm:size-[150px]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 120 120"
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth="9"
          />
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
            {mockReport.score}
          </span>
          <span className="font-mono text-xs text-fg-muted">/100</span>
        </div>
      </div>

      <div className="w-full sm:min-w-[260px] sm:flex-1">
        <span className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-trail-text uppercase">
          {eyebrow}
        </span>
        <h1 className="my-2.5 font-display text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-[-0.02em] text-pretty">
          {mockReport.headline}
        </h1>
        <p className="text-[15px] text-pretty text-fg-2">
          {mockReport.summary}
        </p>
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
      <h2
        className={`mb-4 font-display text-[1.1rem] font-semibold ${titleClassName ?? ""}`}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

function buildAdherenceNotes(
  vacancy: VacancyDraft | null,
  repository: RepositoryDraft | null,
): typeof mockReport.adherenceNotes {
  const technologies = vacancy?.profile?.technologies ?? [];
  if (technologies.length === 0) return mockReport.adherenceNotes;

  const language = repository?.language ?? null;
  const covered = language
    ? technologies.filter((technology) =>
        technology.toLowerCase().includes(language.toLowerCase()),
      )
    : [];
  const missing = technologies.filter(
    (technology) => !covered.includes(technology),
  );

  const notes: typeof mockReport.adherenceNotes = [];

  if (repository && language) {
    notes.push({
      tone: "good",
      title: "Aproxima:",
      text: `${language} é a linguagem principal de ${repository.name}, e a vaga pede ${covered.length > 0 ? covered.join(", ") : "essa base"}.`,
    });
  }

  if (missing.length > 0) {
    notes.push({
      tone: "gap",
      title: "Falta:",
      text: `${missing.slice(0, 4).join(", ")} — a vaga cita e o repositório analisado não evidencia.`,
    });
  }

  return notes.length > 0 ? notes : mockReport.adherenceNotes;
}

function AdherenceCard({
  vacancy,
  repository,
}: {
  vacancy: VacancyDraft | null;
  repository: RepositoryDraft | null;
}) {
  const notes = buildAdherenceNotes(vacancy, repository);

  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6.5">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.1rem] font-semibold">
          Aderência do portfólio à vaga
        </h2>
        <span className="font-display text-[1.7rem] font-bold text-trail-text">
          {mockReport.adherence}%
        </span>
      </div>

      <div className="mb-4.5 h-3 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full animate-grow rounded-full bg-[linear-gradient(90deg,var(--color-trail-500),var(--color-ember-400))]"
          style={
            {
              "--grow-to": `${mockReport.adherence}%`,
              width: `${mockReport.adherence}%`,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <Note key={note.title} {...note} />
        ))}
      </div>
    </section>
  );
}

function DimensionsCard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6.5">
      <h2 className="mb-4.5 font-display text-[1.1rem] font-semibold">
        Desempenho por dimensão
      </h2>

      <div className="flex flex-col gap-3.5">
        {mockReport.dimensions.map((dimension, index) => (
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
              {dimension.score}
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

function Note({
  tone,
  title,
  text,
}: {
  tone: NoteTone;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <NoteIcon tone={tone} />
      <p className="text-sm leading-[1.55] text-fg-2">
        <b className="font-semibold text-fg">{title}</b> {text}
      </p>
    </div>
  );
}
