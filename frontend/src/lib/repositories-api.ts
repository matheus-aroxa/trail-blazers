import { readToken } from '@auth/token-storage';
import { API_URL } from './env';

export interface RepoSummary {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  visibility: "public" | "private";
}

export class RepositoriesError extends Error {
  readonly detail: string;
  readonly hint?: string;
  readonly retryable: boolean;

  constructor(detail: string, options: { hint?: string; retryable?: boolean } = {}) {
    super(detail);
    this.name = 'RepositoriesError';
    this.detail = detail;
    this.hint = options.hint;
    this.retryable = options.retryable ?? true;
  }
}

function describeRetryAfter(seconds?: number): string | undefined {
  if (typeof seconds !== 'number' || seconds <= 0) return undefined;

  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1
    ? 'Tente de novo em cerca de um minuto.'
    : `Tente de novo em cerca de ${minutes} minutos.`;
}

function mapErrorResponse(
  status: number,
  body: { message?: string; code?: string; retryAfterSeconds?: number } | null,
): RepositoriesError {
  if (status === 401 || status === 403) {
    return new RepositoriesError(
      'Sua sessão com o GitHub não é mais válida.',
      { hint: 'Saia e entre de novo para renovar o acesso.', retryable: false },
    );
  }

  if (status === 429 || body?.code === 'limite_github_atingido') {
    return new RepositoriesError(
      'O GitHub limitou nossas requisições por agora.',
      {
        hint:
          describeRetryAfter(body?.retryAfterSeconds) ??
          'Tente de novo em alguns instantes.',
      },
    );
  }

  if (status >= 500) {
    return new RepositoriesError(
      body?.message ?? 'O servidor não conseguiu responder à busca no GitHub.',
      { hint: 'Costuma ser temporário.' },
    );
  }

  return new RepositoriesError(
    body?.message ?? `A busca falhou com o código ${status}.`,
  );
}

export async function fetchRepos(): Promise<RepoSummary[]> {
  const token = readToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/repositories`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new RepositoriesError(
      'Não conseguimos falar com o servidor do InterviewTrail.',
      { hint: 'Verifique sua conexão e tente de novo.' },
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; code?: string; retryAfterSeconds?: number }
      | null;

    throw mapErrorResponse(response.status, body);
  }

  try {
    return (await response.json()) as RepoSummary[];
  } catch {
    throw new RepositoriesError(
      'O servidor respondeu num formato que não conseguimos ler.',
    );
  }

}

export interface AnalyzedFile {
  path: string;
  content: string;
}

export interface RepositoryAnalysis {
  relevantFiles: AnalyzedFile[];
  omittedFiles: string[];
  totalTokensEstimative: number;
}

export async function analyzeRepo(
  owner: string,
  name: string,
): Promise<RepositoryAnalysis> {
  const token = readToken();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/repositories/${owner}/${name}/analyze`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new RepositoriesError(
      'Não conseguimos falar com o servidor do InterviewTrail.',
      { hint: 'Verifique sua conexão e tente de novo.' },
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;

    if (body?.code === 'repo_vazio') {
      throw new RepositoriesError(body.message || 'Repositório vazio.', {
        hint: 'Escolha outro repositório para a entrevista.',
        retryable: false
      });
    }
    throw mapErrorResponse(response.status, body);
  }

  try {
    return (await response.json()) as RepositoryAnalysis;
  } catch {
    throw new RepositoriesError(
      'O servidor respondeu num formato que não conseguimos ler.',
    );
  }
}
