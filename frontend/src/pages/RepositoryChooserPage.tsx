import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { AppHeader } from "@components/app/AppHeader";
import { InterviewStepper } from "@components/app/InterviewStepper";
import { RepositoryList } from "@components/app/RepoList";
import { ButtonLink, Button } from "@components/ui/Button";
import { Spinner } from "@components/ui/Spinner";
import { cn } from "@lib/cn";
import { readVacancyDraft } from "@lib/interview-draft";
import {
  fetchRepos,
  RepositoriesError,
  type RepoSummary,
} from "@lib/repositories-api";
import { paths } from "@routes/paths";

type Status = "loading" | "error" | "success";

/**
 * Teto de repositórios por entrevista. Hoje vale 1 por simplicidade; a tela já
 * é multisseleção, então ampliar é só mexer nesta constante.
 */
const SELECTION_LIMIT = 1;

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="flex-none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 7.5v3.5M8 5.2v.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RepositoryChooserPage() {
  // A etapa analisa repositórios *contra uma vaga*; sem a vaga salva na etapa 1
  // (acesso direto pela URL, ou reload em outra aba) não há o que analisar.
  const [vacancy] = useState(readVacancyDraft);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<RepositoriesError | null>(null);
  const [repositories, setRepositories] = useState<RepoSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!vacancy) return;

    let cancelled = false;

    fetchRepos()
      .then((repos) => {
        if (cancelled) return;
        setRepositories(repos);
        setStatus("success");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof RepositoriesError
            ? cause
            : new RepositoriesError("Ocorreu uma falha inesperada na busca."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, vacancy]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    setAttempt((count) => count + 1);
  }, []);

  const toggle = useCallback((repository: RepoSummary) => {
    setSelectedIds((current) => {
      if (current.includes(repository.id)) {
        return current.filter((id) => id !== repository.id);
      }
      return current.length < SELECTION_LIMIT
        ? [...current, repository.id]
        : current;
    });
  }, []);

  const hasRepositories = status === "success" && repositories.length > 0;
  const canStart = hasRepositories && selectedIds.length > 0;
  // Sem lista utilizável, seguir sem repositório é a única saída da etapa.
  const offerSkip = status === "error" || (status === "success" && !hasRepositories);

  if (!vacancy) {
    return <Navigate to={paths.newInterview} replace />;
  }

  return (
    <div className="min-h-screen animate-rise">
      <AppHeader label="Nova entrevista" />

      <main className="mx-auto w-full max-w-[860px] px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-18">
        <InterviewStepper current={2} className="mb-12" />

        <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <h1 className="mb-2 font-display text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-[-0.02em]">
              Quais projetos entram na análise?
            </h1>
            <p className="flex items-center gap-2 text-[15px] text-fg-2">
              <InfoIcon />
              Selecione até {SELECTION_LIMIT}{" "}
              {SELECTION_LIMIT === 1 ? "repositório" : "repositórios"} para uma
              análise mais focada.
            </p>
            <p className="mt-2 max-w-[62ch] truncate font-mono text-[11.5px] text-fg-muted">
              Vaga #{vacancy.id.slice(0, 8)} · {vacancy.description}
            </p>
          </div>

          {hasRepositories && (
            <span
              aria-live="polite"
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-mono text-xs text-fg-2"
            >
              {selectedIds.length}/{SELECTION_LIMIT}{" "}
              {SELECTION_LIMIT === 1 ? "selecionado" : "selecionados"}
            </span>
          )}
        </div>

        {status === "loading" && (
          <div className="flex justify-center py-16">
            <Spinner label="Carregando seus repositórios" />
          </div>
        )}

        {status === "error" && error && (
          <FallbackPanel
            tone="danger"
            title="Não conseguimos buscar seus repositórios"
            detail={error.detail}
            hint={error.hint}
            action={
              error.retryable ? (
                <Button variant="secondary" onClick={retry}>
                  Tentar novamente
                </Button>
              ) : null
            }
          />
        )}

        {status === "success" && !hasRepositories && (
          <FallbackPanel
            title="Nenhum repositório encontrado"
            detail="Não achamos repositórios nesta conta do GitHub."
            hint="Se você acabou de criar algum, atualize a lista."
            action={
              <Button variant="secondary" onClick={retry}>
                Atualizar lista
              </Button>
            }
          />
        )}

        {status === "success" && hasRepositories && (
          <RepositoryList
            repositories={repositories}
            selectedIds={selectedIds}
            limit={SELECTION_LIMIT}
            onToggle={toggle}
          />
        )}

        <div className="mt-9 flex flex-wrap justify-between gap-3">
          <ButtonLink to={paths.newInterview} variant="ghost">
            ← Voltar
          </ButtonLink>

          <ButtonLink
            to={paths.interview}
            variant="ember"
            disabled={!offerSkip && !canStart}
            className="max-sm:w-full"
          >
            {offerSkip ? "Seguir sem repositórios →" : "Iniciar entrevista →"}
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}

interface FallbackPanelProps {
  title: string;
  detail: string;
  hint?: string;
  tone?: "neutral" | "danger";
  action?: ReactNode;
}

/**
 * Estado sem lista para escolher — erro na busca ou conta sem repositórios.
 * Diz o que aconteceu, e a saída para seguir mesmo assim fica no rodapé da
 * etapa, junto com o "Voltar".
 */
function FallbackPanel({
  title,
  detail,
  hint,
  tone = "neutral",
  action,
}: FallbackPanelProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed px-5 py-12 text-center sm:px-6 sm:py-14",
        tone === "danger"
          ? "border-[--alpha(var(--color-danger)/45%)] bg-[--alpha(var(--color-danger)/8%)]"
          : "border-border bg-surface",
      )}
    >
      <h2
        className={cn(
          "font-display text-[1.15rem] font-semibold",
          tone === "danger" && "text-danger",
        )}
      >
        {title}
      </h2>

      <p className="max-w-[46ch] text-[14.5px] leading-[1.55] text-fg-2">
        {detail}
      </p>

      {hint && (
        <p className="max-w-[46ch] font-mono text-[11.5px] text-fg-muted">
          {hint}
        </p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
