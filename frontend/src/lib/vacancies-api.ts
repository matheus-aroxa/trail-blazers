import { readToken } from "@auth/token-storage";
import { API_URL } from "./env";

export const DESCRIPTION_MIN_LENGTH = 50;
export const DESCRIPTION_MAX_LENGTH = 10_000;

export interface ParsedVacancyProfile {
  technologies: string[];
  seniorityLevel: "junior" | "mid" | "senior" | "lead" | "unknown";
  keyCompetencies: string[];
  confidence: "high" | "low";
  outOfScope: boolean;
}

/** Estado do processo de análise no backend — responde só "já terminou?". */
export type ParseStatus = "pending" | "done" | "failed";

const PARSE_STATUSES: ParseStatus[] = ["pending", "done", "failed"];

export interface Vacancy {
  id: string;
  userId: string;
  rawDescription: string;
  parsedProfile: ParsedVacancyProfile | null;
  parseStatus: ParseStatus;
  parseFailureReason: string | null;
  parsingCompleted: boolean;
  createdAt: string;
}

export class VacancyError extends Error {
  readonly detail: string;
  readonly hint?: string;
  readonly retryable: boolean;

  constructor(detail: string, options: { hint?: string; retryable?: boolean } = {}) {
    super(detail);
    this.name = "VacancyError";
    this.detail = detail;
    this.hint = options.hint;
    this.retryable = options.retryable ?? true;
  }
}

type ErrorBody = { message?: string | string[] } | null;

/**
 * Em qual etapa o erro aconteceu. As mensagens precisam ser diferentes: durante
 * o acompanhamento da análise a vaga já foi salva, então dizer "não conseguimos
 * salvar" seria mentira.
 */
type ErrorContext = "save" | "analysis";

function firstMessage(body: ErrorBody): string | undefined {
  if (Array.isArray(body?.message)) return body.message[0];
  return body?.message;
}

function mapErrorResponse(
  status: number,
  body: ErrorBody,
  context: ErrorContext,
): VacancyError {
  const saving = context === "save";

  if (status === 400) {
    return new VacancyError(
      firstMessage(body) ?? "A descrição da vaga não foi aceita.",
      { hint: "Ajuste o texto e tente de novo.", retryable: false },
    );
  }

  if (status === 401 || status === 403) {
    return new VacancyError("Sua sessão não é mais válida.", {
      hint: "Saia e entre de novo para continuar.",
      retryable: false,
    });
  }

  if (status === 404 && !saving) {
    return new VacancyError("Não encontramos esta vaga no servidor.", {
      hint: "Ela pode ter sido removida. Cadastre a vaga de novo.",
      retryable: false,
    });
  }

  if (status >= 500) {
    return new VacancyError(
      firstMessage(body) ??
        (saving
          ? "O servidor não conseguiu salvar a vaga."
          : "O servidor não conseguiu responder sobre a análise."),
      { hint: "Costuma ser temporário." },
    );
  }

  return new VacancyError(
    firstMessage(body) ??
      (saving
        ? `Não conseguimos salvar a vaga (código ${status}).`
        : `Não conseguimos acompanhar a análise (código ${status}).`),
  );
}

function ensureVacancy(payload: unknown): Vacancy {
  const vacancy = payload as Partial<Vacancy> | null;

  if (
    typeof vacancy?.id !== "string" ||
    typeof vacancy.rawDescription !== "string"
  ) {
    throw new VacancyError(
      "O servidor respondeu num formato que não conseguimos ler.",
      {
        hint: "Se o backend acabou de ser atualizado, reinicie-o para carregar a versão nova.",
        retryable: false,
      },
    );
  }

  // Backend antigo não manda parseStatus: deduzimos do parsingCompleted.
  const parseStatus: ParseStatus = PARSE_STATUSES.includes(
    vacancy.parseStatus as ParseStatus,
  )
    ? (vacancy.parseStatus as ParseStatus)
    : vacancy.parsingCompleted
      ? "done"
      : "pending";

  return {
    ...(vacancy as Vacancy),
    parseStatus,
    parseFailureReason: vacancy.parseFailureReason ?? null,
    parsingCompleted: parseStatus !== "pending",
  };
}

export async function createVacancy(description: string): Promise<Vacancy> {
  const token = readToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/vacancies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ description }),
    });
  } catch {
    throw new VacancyError(
      "Não conseguimos falar com o servidor do InterviewTrail.",
      { hint: "Verifique sua conexão e tente de novo." },
    );
  }

  if (!response.ok) {
    throw mapErrorResponse(
      response.status,
      (await response.json().catch(() => null)) as ErrorBody,
      "save",
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new VacancyError(
      "O servidor respondeu num formato que não conseguimos ler.",
    );
  }

  return ensureVacancy(payload);
}

export async function getVacancy(id: string): Promise<Vacancy> {
  const token = readToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/vacancies/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new VacancyError(
      "Não conseguimos falar com o servidor do InterviewTrail.",
      { hint: "Verifique sua conexão e tente de novo." },
    );
  }

  if (!response.ok) {
    throw mapErrorResponse(
      response.status,
      (await response.json().catch(() => null)) as ErrorBody,
      "analysis",
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new VacancyError(
      "O servidor respondeu num formato que não conseguimos ler.",
    );
  }

  return ensureVacancy(payload);
}

/**
 * Como a análise terminou, já traduzido para o que a tela precisa mostrar.
 * "ok" cobre inclusive a vaga fora de escopo: a IA leu e respondeu, isso é
 * resultado, não falha.
 */
export type AnalysisOutcome =
  | { state: "ok" }
  | { state: "problem"; detail: string; hint: string; retryable: boolean };

const CAN_CONTINUE =
  "A vaga foi salva. Você pode seguir sem a análise, mas as perguntas serão mais genéricas.";

/**
 * Mensagem por motivo de falha. Cada uma precisa dizer de quem é o problema e
 * se adianta tentar de novo — tentar de novo com a chave errada só repete o erro.
 */
const FAILURE_MESSAGE: Record<
  string,
  { detail: string; hint: string; retryable: boolean }
> = {
  invalid_api_key: {
    detail: "A chave de acesso ao serviço de IA foi recusada.",
    hint: "Isso é configuração do servidor, não da sua vaga. Avise quem cuida do ambiente — tentar de novo só vai funcionar depois que a chave for trocada.",
    retryable: false,
  },
  timeout: {
    detail: "O serviço de IA demorou demais e a análise foi interrompida.",
    hint: `Costuma ser passageiro — vale tentar de novo. ${CAN_CONTINUE}`,
    retryable: true,
  },
  invalid_response: {
    detail: "O serviço de IA respondeu num formato que não conseguimos ler.",
    hint: `Tentar de novo costuma resolver. ${CAN_CONTINUE}`,
    retryable: true,
  },
  ai_unavailable: {
    detail: "Não conseguimos falar com o serviço de IA.",
    hint: `Costuma ser passageiro — vale tentar de novo. ${CAN_CONTINUE}`,
    retryable: true,
  },
};

export function describeAnalysis(vacancy: Vacancy): AnalysisOutcome {
  if (vacancy.parseStatus === "done") return { state: "ok" };

  if (vacancy.parseStatus === "failed") {
    const known = FAILURE_MESSAGE[vacancy.parseFailureReason ?? ""];

    return {
      state: "problem",
      ...(known ?? {
        detail: "A análise da vaga não pôde ser concluída.",
        hint: `Tentar de novo costuma resolver. ${CAN_CONTINUE}`,
        retryable: true,
      }),
    };
  }

  // Ainda pending: quem desistiu de esperar foi o polling, não o backend.
  return {
    state: "problem",
    detail: "A análise está demorando mais do que o esperado.",
    hint: `Ela pode terminar sozinha — tentar de novo recomeça a contagem. ${CAN_CONTINUE}`,
    retryable: true,
  };
}

/** Manda o backend rodar a análise de novo. Devolve a vaga já zerada em "pending". */
export async function reparseVacancy(id: string): Promise<Vacancy> {
  const token = readToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/vacancies/${id}/reparse`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new VacancyError(
      "Não conseguimos falar com o servidor do InterviewTrail.",
      { hint: "Verifique sua conexão e tente de novo." },
    );
  }

  if (response.status === 409) {
    throw new VacancyError("Esta análise já está rodando.", {
      hint: "Aguarde ela terminar antes de pedir de novo.",
      retryable: false,
    });
  }

  if (!response.ok) {
    throw mapErrorResponse(
      response.status,
      (await response.json().catch(() => null)) as ErrorBody,
      "analysis",
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new VacancyError(
      "O servidor respondeu num formato que não conseguimos ler.",
    );
  }

  return ensureVacancy(payload);
}

const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 45_000;

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

export async function waitForVacancyParsing(
  id: string,
  signal?: AbortSignal,
): Promise<Vacancy> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let latest = await getVacancy(id);

  while (!latest.parsingCompleted && Date.now() < deadline) {
    if (signal?.aborted) return latest;

    await wait(POLL_INTERVAL_MS, signal);
    if (signal?.aborted) return latest;

    latest = await getVacancy(id);
  }

  return latest;
}
