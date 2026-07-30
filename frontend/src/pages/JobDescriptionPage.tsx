import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppHeader } from "@components/app/AppHeader";
import { InterviewStepper } from "@components/app/InterviewStepper";
import { Button, ButtonLink } from "@components/ui/Button";
import { Spinner } from "@components/ui/Spinner";
import { CheckIcon } from "@components/ui/icons";
import { sampleVacancy } from "@content/sample-vacancy";
import { cn } from "@lib/cn";
import {
  clearVacancyDraft,
  readVacancyDraft,
  writeVacancyDraft,
  type VacancyDraft,
} from "@lib/interview-draft";
import {
  createVacancy,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  VacancyError,
} from "@lib/vacancies-api";
import { paths } from "@routes/paths";

type Status = "idle" | "saving" | "saved";

/** Mesma checagem do backend (RF-2.1), para avisar antes de enviar. */
function describeLengthProblem(text: string): string | null {
  const length = text.trim().length;

  if (length === 0) return "Cole a descrição da vaga para continuar.";

  if (length < DESCRIPTION_MIN_LENGTH) {
    const missing = DESCRIPTION_MIN_LENGTH - length;
    return `A descrição precisa ter no mínimo ${DESCRIPTION_MIN_LENGTH} caracteres — faltam ${missing}.`;
  }

  if (length > DESCRIPTION_MAX_LENGTH) {
    const excess = length - DESCRIPTION_MAX_LENGTH;
    return `A descrição excede o limite de ${DESCRIPTION_MAX_LENGTH} caracteres — remova ${excess}.`;
  }

  return null;
}

export function JobDescriptionPage() {
  const navigate = useNavigate();
  // Voltar da etapa 2 (ou recarregar a página) reencontra a vaga já salva, em
  // vez de pedir o texto de novo e gravar uma segunda vaga igual.
  const [draft] = useState(readVacancyDraft);
  const [text, setText] = useState(draft?.description ?? "");
  const [saved, setSaved] = useState<VacancyDraft | null>(draft);
  const [status, setStatus] = useState<Status>(draft ? "saved" : "idle");
  const [error, setError] = useState<VacancyError | null>(null);

  const lengthProblem = describeLengthProblem(text);
  const tooLong = text.trim().length > DESCRIPTION_MAX_LENGTH;

  const onChange = (next: string) => {
    setText(next);
    // Editar a vaga invalida o que já foi salvo: a etapa precisa salvar de novo.
    if (status !== "idle") {
      setStatus("idle");
      setSaved(null);
      clearVacancyDraft();
    }
    setError(null);
  };

  const save = async () => {
    const description = text.trim();
    if (describeLengthProblem(description) || status === "saving") return;

    setStatus("saving");
    setError(null);

    try {
      const created = await createVacancy(description);
      const next = { id: created.id, description: created.rawDescription };

      setSaved(next);
      // O id segue para as próximas etapas do fluxo.
      writeVacancyDraft(next);
      setStatus("saved");
    } catch (cause) {
      setError(
        cause instanceof VacancyError
          ? cause
          : new VacancyError("Ocorreu uma falha inesperada ao salvar a vaga."),
      );
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen animate-rise">
      <AppHeader label="Nova entrevista" />

      <main className="mx-auto w-full max-w-[760px] px-4 pt-8 pb-14 sm:px-6 sm:pt-10 sm:pb-18">
        <InterviewStepper current={1} className="mb-12" />

        <h1 className="mb-2 font-display text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-[-0.02em]">
          Sobre qual vaga vamos treinar?
        </h1>
        <p className="mb-6 text-[15px] text-fg-2">
          Cole a descrição completa — quanto mais contexto, melhor a entrevista.
        </p>

        <textarea
          value={text}
          onChange={(event) => onChange(event.target.value)}
          disabled={status === "saving"}
          placeholder="Cole aqui a descrição da vaga…"
          aria-label="Descrição da vaga"
          aria-invalid={tooLong}
          aria-describedby="contador-descricao"
          className="min-h-[220px] w-full resize-y rounded-xl border border-border bg-surface px-4.5 py-4 text-[14.5px] leading-[1.6] text-fg transition-[border-color,box-shadow] duration-200 focus:border-trail-500 focus:shadow-[0_0_0_3px_--alpha(var(--color-trail-500)/20%)] focus:outline-none disabled:opacity-60"
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
          <span
            id="contador-descricao"
            className={cn(
              "font-mono text-[11.5px]",
              tooLong ? "text-danger" : "text-fg-muted",
            )}
          >
            {text.length > 0
              ? `${text.length}/${DESCRIPTION_MAX_LENGTH} caracteres`
              : ""}
          </span>
          <button
            type="button"
            onClick={() => onChange(sampleVacancy)}
            disabled={status === "saving"}
            className="rounded-full border border-dashed border-border px-3.5 py-1.5 font-mono text-[11.5px] text-fg-2 transition-colors duration-200 hover:border-trail-500 hover:text-trail-text disabled:opacity-60"
          >
            Usar vaga de exemplo
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-[--alpha(var(--color-danger)/45%)] bg-[--alpha(var(--color-danger)/8%)] px-4.5 py-4"
          >
            <p className="text-[14.5px] leading-[1.55] text-danger">
              {error.detail}
            </p>
            {error.hint && (
              <p className="mt-1 font-mono text-[11.5px] text-fg-muted">
                {error.hint}
              </p>
            )}
            {error.retryable && (
              <Button variant="secondary" onClick={save} className="mt-3">
                Tentar novamente
              </Button>
            )}
          </div>
        )}

        {status === "idle" && text.trim().length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={lengthProblem !== null}>
              Salvar vaga
            </Button>
            {lengthProblem && (
              <span className="font-mono text-[11.5px] text-fg-muted">
                {lengthProblem}
              </span>
            )}
          </div>
        )}

        {status === "saving" && (
          <div
            aria-live="polite"
            className="mt-7 flex items-center gap-2.5 rounded-lg border border-border bg-surface p-5.5"
          >
            <Spinner size={16} label="Salvando a vaga" />
            <span className="font-mono text-xs text-fg-2">
              Salvando a vaga…
            </span>
          </div>
        )}

        {status === "saved" && saved && <SavedCard vacancy={saved} />}

        <div className="mt-9 flex flex-wrap justify-between gap-3">
          <ButtonLink to={paths.dashboard} variant="ghost">
            ← Voltar
          </ButtonLink>

          <Button
            onClick={() => navigate(paths.repoChooser)}
            disabled={status !== "saved"}
            className="max-sm:w-full"
          >
            Continuar →
          </Button>
        </div>
      </main>
    </div>
  );
}

/**
 * Confirmação do que o backend guardou. A leitura da vaga (stack, senioridade,
 * competências-chave) depende do épico de análise; enquanto esses campos vierem
 * nulos, a tela mostra o que existe de verdade em vez de inventar.
 */
function SavedCard({ vacancy }: { vacancy: VacancyDraft }) {
  return (
    <div className="mt-7 animate-rise rounded-lg border border-border bg-surface p-5.5">
      <div className="mb-4 flex items-center gap-2 text-trail-text">
        <CheckIcon size={14} />
        <span className="font-mono text-xs tracking-[0.08em] uppercase">
          Vaga salva
        </span>
      </div>

      <p className="text-[14.5px] leading-[1.55] text-fg-2">
        Guardamos a descrição desta vaga na sua conta. Agora escolha os
        repositórios que entram na análise.
      </p>

      <p className="mt-4 font-mono text-[11.5px] text-fg-muted">
        {vacancy.description.length} caracteres · vaga #{vacancy.id.slice(0, 8)}
      </p>
    </div>
  );
}
