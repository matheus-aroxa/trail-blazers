import { readToken } from "@auth/token-storage";
import { API_URL } from "./env";

/**
 * Limites da descrição, iguais aos do `CreateVacancyDto` no backend. Ficam
 * aqui para a tela avisar antes de gastar uma requisição — a validação que
 * vale continua sendo a do servidor.
 */
export const DESCRIPTION_MIN_LENGTH = 50;
export const DESCRIPTION_MAX_LENGTH = 5000;

/** Vaga como o backend devolve no POST /vacancies (tabela `vacancies`). */
export interface Vacancy {
  id: string;
  userId: string;
  rawDescription: string;
  /** Campos do parse da vaga; nulos até o épico de análise existir. */
  parsedStack: unknown;
  parsedSeniority: string | null;
  parsedSkills: unknown;
  parseConfidence: number | null;
  createdAt: string;
}

/**
 * Falha ao salvar a vaga, já traduzida para a tela: `detail` diz o que
 * aconteceu e `hint` sugere o que fazer. Mesmo contrato do `RepositoriesError`.
 */
export class VacancyError extends Error {
  readonly detail: string;
  readonly hint?: string;
  /** Tentar de novo só ajuda em falhas transitórias. */
  readonly retryable: boolean;

  constructor(detail: string, options: { hint?: string; retryable?: boolean } = {}) {
    super(detail);
    this.name = "VacancyError";
    this.detail = detail;
    this.hint = options.hint;
    this.retryable = options.retryable ?? true;
  }
}

/** O ValidationPipe global responde com `message` em array; as outras, string. */
type ErrorBody = { message?: string | string[] } | null;

function firstMessage(body: ErrorBody): string | undefined {
  if (Array.isArray(body?.message)) return body.message[0];
  return body?.message;
}

function mapErrorResponse(status: number, body: ErrorBody): VacancyError {
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

  if (status >= 500) {
    return new VacancyError(
      firstMessage(body) ?? "O servidor não conseguiu salvar a vaga.",
      { hint: "Costuma ser temporário." },
    );
  }

  return new VacancyError(
    firstMessage(body) ?? `Não conseguimos salvar a vaga (código ${status}).`,
  );
}

/** RF-2.1: grava a descrição da vaga do usuário autenticado. */
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
    // fetch só rejeita quando a requisição nem chegou a ser respondida.
    throw new VacancyError(
      "Não conseguimos falar com o servidor do InterviewTrail.",
      { hint: "Verifique sua conexão e tente de novo." },
    );
  }

  if (!response.ok) {
    throw mapErrorResponse(
      response.status,
      (await response.json().catch(() => null)) as ErrorBody,
    );
  }

  try {
    return (await response.json()) as Vacancy;
  } catch {
    throw new VacancyError(
      "O servidor respondeu num formato que não conseguimos ler.",
    );
  }
}
