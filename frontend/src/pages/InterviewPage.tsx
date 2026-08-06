import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button, ButtonLink } from "@components/ui/Button";
import { Logo, LogoMark } from "@components/ui/Logo";
import { Spinner } from "@components/ui/Spinner";
import { cn } from "@lib/cn";
import { readSessionDraft, readVacancyDraft } from "@lib/interview-draft";
import {
  getSession,
  submitAnswer,
  InterviewError,
  type InterviewQuestion,
  type InterviewSession,
} from "@lib/interview-api";
import { questionKinds } from "@components/interview/question-kinds";
import { paths } from "@routes/paths";

interface ChatEntry {
  from: "ai" | "user";
  question?: InterviewQuestion;
  text: string;
}

const CLOSING_TEXT =
  "É isso — entrevista concluída! Analisei suas respostas contra a vaga e seu relatório está pronto. Spoiler: você foi melhor do que imagina.";

export function InterviewPage() {
  const navigate = useNavigate();

  const [sessionDraft] = useState(readSessionDraft);
  const [vacancy] = useState(readVacancyDraft);

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loadError, setLoadError] = useState<InterviewError | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<InterviewError | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionDraft) return;
    let cancelled = false;

    getSession(sessionDraft.id)
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setLoadError(
          cause instanceof InterviewError
            ? cause
            : new InterviewError("Não foi possível carregar a entrevista."),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [sessionDraft]);

  const questions = session?.questions ?? [];
  const currentIndex = questions.findIndex((q) => !q.answer);
  const finished = questions.length > 0 && currentIndex === -1;
  const currentQuestion = finished ? undefined : questions[currentIndex];
  const totalQuestions = questions.length;

  const entries = useMemo<ChatEntry[]>(() => {
    const result: ChatEntry[] = [];

    questions.forEach((question, index) => {
      if (finished || index <= currentIndex) {
        result.push({ from: "ai", question, text: question.content });
      }
      if (question.answer) {
        result.push({ from: "user", text: question.answer.content });
      }
    });

    if (finished) {
      result.push({ from: "ai", text: CLOSING_TEXT });
    }

    return result;
  }, [questions, currentIndex, finished]);

  useEffect(() => {
    const element = chatRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [entries, submitting]);

  const send = async () => {
    const answer = draft.trim();
    if (!answer || submitting || !session || !currentQuestion) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitAnswer(session.id, currentQuestion.id, answer);
      setDraft("");
      setSession((current) => {
        if (!current) return current;
        return {
          ...current,
          questions: current.questions.map((q) =>
            q.id === currentQuestion.id
              ? { ...q, answer: { content: answer, createdAt: new Date().toISOString() } }
              : q,
          ),
        };
      });
    } catch (cause: unknown) {
      setSubmitError(
        cause instanceof InterviewError
          ? cause
          : new InterviewError("Não conseguimos enviar sua resposta."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  if (!vacancy || !sessionDraft) {
    return <Navigate to={paths.newInterview} replace />;
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex-none border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
          <Link to={paths.dashboard} className="hover:no-underline">
            <Logo markSize={22} className="text-[17px] text-fg max-sm:sr-only" />
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg-2">
              {finished
                ? "Entrevista concluída"
                : totalQuestions > 0
                  ? `Pergunta ${currentIndex + 1} de ${totalQuestions}`
                  : "Preparando..."}
            </span>
            <button
              type="button"
              onClick={() => navigate(paths.dashboard)}
              className="rounded-md px-3 py-2 text-sm font-medium text-fg-2 transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-[15px] text-fg-2">{loadError.detail}</p>
          {loadError.hint && <p className="font-mono text-[12.5px] text-fg-muted">{loadError.hint}</p>}
          <ButtonLink to={paths.repoChooser} variant="secondary">
            Voltar
          </ButtonLink>
        </div>
      )}

      {!loadError && !session && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Carregando entrevista..." />
        </div>
      )}

      {!loadError && session && (
        <>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-5 sm:py-7">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
              {entries.map((entry, index) => (
                <ChatMessage key={index} entry={entry} />
              ))}
              {submitting && <TypingBubble />}
            </div>
          </div>

          <div className="flex-none border-t border-border bg-bg px-4 pt-3.5 pb-4.5 sm:px-5">
            <div className="mx-auto w-full max-w-[760px]">
              {finished ? (
                <div className="flex flex-wrap justify-center gap-3 py-1.5">
                  <ButtonLink to={paths.report} variant="ember" size="lg" className="max-sm:w-full">
                    Ver meu relatório →
                  </ButtonLink>
                  <ButtonLink to={paths.dashboard} variant="secondary" size="lg" className="max-sm:w-full">
                    Voltar ao dashboard
                  </ButtonLink>
                </div>
              ) : (
                <>
                  {submitError && (
                    <p className="mb-2.5 text-[13px] text-danger">
                      {submitError.detail}
                      {submitError.hint ? ` ${submitError.hint}` : ""}
                    </p>
                  )}

                  <div className="flex items-end gap-2.5">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Digite sua resposta — sem pressa…"
                      aria-label="Sua resposta"
                      rows={2}
                      disabled={submitting}
                      className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3.5 text-[15px] leading-[1.5] text-fg transition-[border-color,box-shadow] duration-200 focus:border-trail-500 focus:shadow-[0_0_0_3px_--alpha(var(--color-trail-500)/20%)] focus:outline-none"
                    />
                    <Button
                      onClick={() => void send()}
                      disabled={!draft.trim() || submitting}
                      aria-label="Enviar resposta"
                      className="size-12 flex-none rounded-[12px]! p-0!"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path
                          d="M9 14V4M5 8l4-4 4 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Button>
                  </div>

                  <p className="mt-2 px-0.5 font-mono text-[10.5px] text-fg-muted">
                    enter envia · shift+enter quebra linha
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InterviewerAvatar() {
  return (
    <span
      aria-label="Entrevistador IA"
      className="mt-0.5 flex size-[30px] flex-none items-center justify-center rounded-full border border-[--alpha(var(--color-trail-500)/40%)] bg-surface"
    >
      <LogoMark size={15} />
    </span>
  );
}

function ChatMessage({ entry }: { entry: ChatEntry }) {
  if (entry.from === "user") {
    return (
      <div className="flex animate-rise justify-end">
        <p className="max-w-[88%] rounded-[14px_4px_14px_14px] sm:max-w-[82%] border border-[--alpha(var(--color-trail-500)/30%)] bg-[--alpha(var(--color-trail-500)/12%)] px-4 py-3.5 text-[15px] leading-[1.6]">
          {entry.text}
        </p>
      </div>
    );
  }

  const kind = entry.question ? questionKinds[entry.question.type] : null;
  const metadata = entry.question?.metadata;

  return (
    <div className="flex animate-rise items-start gap-3">
      <InterviewerAvatar />

      <div className="flex min-w-0 max-w-[calc(100%-42px)] flex-col gap-2 sm:max-w-[82%]">
        {kind && (
          <span
            className="self-start rounded-sm px-2.5 py-1 font-mono text-[11px] font-medium tracking-[0.06em] uppercase"
            style={{ color: kind.color, background: kind.background }}
          >
            {kind.label}
          </span>
        )}

        {metadata?.codeExcerpt && (
          <div className="overflow-hidden rounded-md border border-code-border bg-code">
            {metadata.codeFile && (
              <p className="border-b border-code-border px-3.5 py-2 font-mono text-[11px] text-fg-muted">
                {metadata.codeFile}
              </p>
            )}
            <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.7] text-slate-300">
              {metadata.codeExcerpt}
            </pre>
          </div>
        )}

        <p className="rounded-[4px_14px_14px_14px] border border-border bg-surface px-4 py-3.5 text-[15px] leading-[1.6]">
          {entry.text}
        </p>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex animate-rise items-start gap-3">
      <InterviewerAvatar />
      <div
        aria-label="A IA está preparando a próxima pergunta"
        className="flex items-center gap-1.5 rounded-[4px_14px_14px_14px] border border-border bg-surface px-4.5 py-4"
      >
        {[0, 0.2, 0.4].map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: `${delay}s` }}
            className={cn("size-[7px] animate-blink rounded-full bg-fg-2")}
          />
        ))}
      </div>
    </div>
  );
}
