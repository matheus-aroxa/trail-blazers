import { readToken } from "@auth/token-storage";
import { API_URL } from "./env";

export type QuestionType = "logic" | "scenario" | "project" | "code_analysis";

export interface InterviewQuestion {
  id: string;
  orderIndex: number;
  type: QuestionType;
  content: string;
  metadata: { codeFile?: string; codeExcerpt?: string } | null;
  answer: { content: string; createdAt: string } | null;
}

export type SessionStatus = "preparing" | "in_progress" | "evaluating" | "completed";

export interface InterviewSession {
  id: string;
  status: SessionStatus;
  vacancyId: string;
  repo: { fullName: string; url: string; primaryLanguage: string | null } | null;
  repoAnalysis?: { fileCount: number; omittedCount: number; topFiles: string[] };
  questions: InterviewQuestion[];
}

export interface InterviewReport {
  sessionId: string;
  overallScore: number;
  adherenceScore: number;
  dimensionScores: { label: string; score: number }[];
  strengths: { title: string; text: string }[];
  gaps: { title: string; text: string }[];
  recommendations: { title: string; text: string }[];
  createdAt: string;
}

export class InterviewError extends Error {
  readonly detail: string;
  readonly hint?: string;
  readonly retryable: boolean;
  readonly code?: string;

  constructor(
    detail: string,
    options: { hint?: string; retryable?: boolean; code?: string } = {},
  ) {
    super(detail);
    this.name = "InterviewError";
    this.detail = detail;
    this.hint = options.hint;
    this.retryable = options.retryable ?? true;
    this.code = options.code;
  }
}

type ErrorBody = { message?: string | string[]; code?: string; retryable?: boolean } | null;

function firstMessage(body: ErrorBody): string | undefined {
  if (Array.isArray(body?.message)) return body.message[0];
  return body?.message;
}

function mapErrorResponse(status: number, body: ErrorBody): InterviewError {
  if (body?.code === "vaga_ainda_analisando") {
    return new InterviewError(
      firstMessage(body) ?? "A análise da vaga ainda não terminou.",
      { hint: "Aguarde a análise da vaga terminar e tente de novo.", retryable: true, code: body.code },
    );
  }

  if (body?.code === "vaga_sem_perfil") {
    return new InterviewError(
      firstMessage(body) ?? "Não foi possível extrair um perfil técnico desta vaga.",
      { hint: "Reanalise a vaga ou edite a descrição antes de continuar.", retryable: false, code: body.code },
    );
  }

  if (body?.code === "repo_vazio") {
    return new InterviewError(firstMessage(body) ?? "Repositório vazio.", {
      hint: "Escolha outro repositório para a entrevista.",
      retryable: false,
      code: body.code,
    });
  }

  if (body?.code?.startsWith("ia_indisponivel")) {
    return new InterviewError(
      firstMessage(body) ?? "Não conseguimos falar com o serviço de IA agora.",
      { hint: "Costuma ser passageiro — tente de novo em instantes.", retryable: body.retryable ?? true, code: body.code },
    );
  }

  if (body?.code === "respostas_pendentes") {
    return new InterviewError(
      firstMessage(body) ?? "Responda todas as perguntas antes de gerar o relatório.",
      { retryable: false, code: body.code },
    );
  }

  if (status === 401 || status === 403) {
    return new InterviewError("Sua sessão não é mais válida.", {
      hint: "Saia e entre de novo para continuar.",
      retryable: false,
    });
  }

  if (status === 404) {
    return new InterviewError("Não encontramos esta sessão de entrevista.", {
      hint: "Ela pode ter sido removida. Comece uma nova entrevista.",
      retryable: false,
    });
  }

  if (status >= 500) {
    return new InterviewError(firstMessage(body) ?? "O servidor não conseguiu responder agora.", {
      hint: "Costuma ser temporário.",
    });
  }

  return new InterviewError(firstMessage(body) ?? `A requisição falhou com o código ${status}.`);
}

function authHeaders(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new InterviewError("Não conseguimos falar com o servidor do InterviewTrail.", {
      hint: "Verifique sua conexão e tente de novo.",
    });
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody;
    throw mapErrorResponse(response.status, body);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new InterviewError("O servidor respondeu num formato que não conseguimos ler.");
  }
}

export async function createSession(params: {
  vacancyId: string;
  owner: string;
  repo: string;
  questionCount?: number;
}): Promise<InterviewSession> {
  return request<InterviewSession>("/interview/sessions", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getSession(id: string): Promise<InterviewSession> {
  return request<InterviewSession>(`/interview/sessions/${id}`);
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  content: string,
): Promise<{ answer: { id: string; questionId: string; content: string }; allAnswered: boolean }> {
  return request(`/interview/sessions/${sessionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ questionId, content }),
  });
}

export async function generateReport(sessionId: string): Promise<InterviewReport> {
  return request<InterviewReport>(`/interview/sessions/${sessionId}/report`, {
    method: "POST",
  });
}

export async function getReport(sessionId: string): Promise<InterviewReport | null> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/interview/sessions/${sessionId}/report`, {
      headers: authHeaders(),
    });
  } catch {
    throw new InterviewError("Não conseguimos falar com o servidor do InterviewTrail.", {
      hint: "Verifique sua conexão e tente de novo.",
    });
  }

  if (response.status === 404) return null;

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody;
    throw mapErrorResponse(response.status, body);
  }

  try {
    return (await response.json()) as InterviewReport;
  } catch {
    throw new InterviewError("O servidor respondeu num formato que não conseguimos ler.");
  }
}
