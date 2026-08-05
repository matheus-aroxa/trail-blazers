import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { MockBanner } from "@components/mock/MockBanner";
import { Button, ButtonLink } from "@components/ui/Button";
import { Logo } from "@components/ui/Logo";
import { LogoMark } from "@components/ui/Logo";
import { cn } from "@lib/cn";
import { readRepositoryDraft, readVacancyDraft } from "@lib/interview-draft";
import {
  buildSampleAnswers,
  buildSeedMessages,
  closingMessage,
  FIRST_QUESTION_INDEX,
  queuedQuestions,
  questionKinds,
  TOTAL_QUESTIONS,
  type InterviewContext,
  type MockMessage,
} from "@mocks/interview-mock";
import { paths } from "@routes/paths";

const AI_DELAY_MS = 1500;

const seniorityLabels: Record<string, string> = {
  junior: "júnior",
  mid: "pleno",
  senior: "sênior",
  lead: "de liderança técnica",
};

export function InterviewPage() {
  const navigate = useNavigate();

  const [vacancy] = useState(readVacancyDraft);
  const [repository] = useState(readRepositoryDraft);

  const context = useMemo<InterviewContext>(() => {
    const profile = vacancy?.profile ?? null;

    return {
      seniority: profile ? seniorityLabels[profile.seniorityLevel] : undefined,
      technologies: profile?.technologies ?? [],
      repositoryName: repository ? `${repository.owner}/${repository.name}` : undefined,
      excerptPath: repository?.excerptPath,
      excerpt: repository?.excerpt,
    };
  }, [vacancy, repository]);

  const [messages, setMessages] = useState<MockMessage[]>(() =>
    buildSeedMessages(context),
  );
  const [questionIndex, setQuestionIndex] = useState(FIRST_QUESTION_INDEX);
  const [typing, setTyping] = useState(false);
  const [finished, setFinished] = useState(false);
  const [draft, setDraft] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const element = chatRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, typing]);

  const send = () => {
    const answer = draft.trim();
    if (!answer || typing || finished) return;

    setMessages((current) => [...current, { from: "user", text: answer }]);
    setDraft("");
    setTyping(true);

    timer.current = window.setTimeout(() => {
      const next = questionIndex + 1;
      setTyping(false);

      if (next <= TOTAL_QUESTIONS) {
        setQuestionIndex(next);
        setMessages((current) => [
          ...current,
          queuedQuestions[next - FIRST_QUESTION_INDEX - 1],
        ]);
      } else {
        setFinished(true);
        setMessages((current) => [...current, closingMessage]);
      }
    }, AI_DELAY_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const fillSample = () => {
    const answer = buildSampleAnswers(context)[questionIndex];
    if (answer && !finished) setDraft(answer);
  };

  if (!vacancy) {
    return <Navigate to={paths.newInterview} replace />;
  }

  return (
    <div className="flex h-dvh flex-col">
      <MockBanner screen="entrevista" />

      <header className="flex-none border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5">
          <Link to={paths.dashboard} className="hover:no-underline">
            <Logo markSize={22} className="text-[17px] text-fg max-sm:sr-only" />
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-xs text-fg-2">
              {finished
                ? "Entrevista concluída"
                : `Pergunta ${questionIndex} de ${TOTAL_QUESTIONS}`}
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

      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-5 sm:py-7">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {typing && <TypingBubble />}
        </div>
      </div>

      <div className="flex-none border-t border-border bg-bg px-4 pt-3.5 pb-4.5 sm:px-5">
        <div className="mx-auto w-full max-w-[760px]">
          {finished ? (
            <div className="flex flex-wrap justify-center gap-3 py-1.5">
              <ButtonLink
                to={paths.report}
                variant="ember"
                size="lg"
                className="max-sm:w-full"
              >
                Ver meu relatório →
              </ButtonLink>
              <ButtonLink
                to={paths.dashboard}
                variant="secondary"
                size="lg"
                className="max-sm:w-full"
              >
                Voltar ao dashboard
              </ButtonLink>
            </div>
          ) : (
            <>
              <div className="mb-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={fillSample}
                  className="rounded-full border border-dashed border-border px-3 py-1.5 font-mono text-[11px] text-fg-muted transition-colors duration-200 hover:border-trail-500 hover:text-trail-text"
                >
                  preencher resposta de exemplo
                </button>
              </div>

              <div className="flex items-end gap-2.5">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Digite sua resposta — sem pressa…"
                  aria-label="Sua resposta"
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3.5 text-[15px] leading-[1.5] text-fg transition-[border-color,box-shadow] duration-200 focus:border-trail-500 focus:shadow-[0_0_0_3px_--alpha(var(--color-trail-500)/20%)] focus:outline-none"
                />
                <Button
                  onClick={send}
                  disabled={!draft.trim() || typing}
                  aria-label="Enviar resposta"
                  className="size-12 flex-none rounded-[12px]! p-0!"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
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

function ChatMessage({ message }: { message: MockMessage }) {
  if (message.from === "user") {
    return (
      <div className="flex animate-rise justify-end">
        <p className="max-w-[88%] rounded-[14px_4px_14px_14px] sm:max-w-[82%] border border-[--alpha(var(--color-trail-500)/30%)] bg-[--alpha(var(--color-trail-500)/12%)] px-4 py-3.5 text-[15px] leading-[1.6]">
          {message.text}
        </p>
      </div>
    );
  }

  const kind = message.kind ? questionKinds[message.kind] : null;

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

        {message.code && (
          <div className="overflow-hidden rounded-md border border-code-border bg-code">
            <p className="border-b border-code-border px-3.5 py-2 font-mono text-[11px] text-fg-muted">
              {message.codeFile}
            </p>
            <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.7] text-slate-300">
              {message.code}
            </pre>
          </div>
        )}

        <p className="rounded-[4px_14px_14px_14px] border border-border bg-surface px-4 py-3.5 text-[15px] leading-[1.6]">
          {message.text}
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
