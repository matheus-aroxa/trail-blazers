import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiError, AiErrorKind, AiProviderPort } from '../vacancies/vacancy-parser.service';
import { ParsedVacancyProfile } from '../vacancies/schemas/vacancy.schema';

const MAX_PATHS_SENT_TO_AI = 300;
const DESCRIPTION_EXCERPT_CHARS = 2000;

const FileSelectionResponseSchema = z.object({
  relevantFiles: z.array(z.string()).min(1).max(80),
});

const SYSTEM_PROMPT = `
Você é um recrutador técnico que vai entrevistar um candidato com base no código dele.
Você recebe: a descrição da vaga (texto original, pode estar truncado), o perfil técnico já extraído da vaga (tecnologias, senioridade, competências-chave) e a lista completa de arquivos existentes no repositório do candidato (paths).

Sua tarefa: escolher, entre os arquivos listados, aqueles mais úteis para preparar perguntas de entrevista técnica — ou seja, arquivos que revelem decisões de arquitetura, lógica de negócio, uso das tecnologias da vaga, testes ou pontos discutíveis de design.

Regras:
- Não escolha arquivos só porque são "convencionais" (README, package.json, docker-compose). Só inclua-os se, para ESTA vaga, eles realmente ajudam a avaliar o candidato (ex.: se a vaga pede Docker/infra, docker-compose pode ser relevante; se não pede, ignore).
- Priorize diversidade: não devolva só arquivos de configuração.
- Use exclusivamente paths que estejam na lista recebida, nunca invente paths.
- Ordene do mais para o menos relevante.
- Escolha entre 5 e 20 arquivos, ajustando ao tamanho do repositório.

Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional, no formato:
{ "relevantFiles": string[] }
`.trim();

export type FileSelectionFailureReason =
  | 'invalid_api_key'
  | 'timeout'
  | 'ai_unavailable'
  | 'invalid_response'
  | 'rate_limited'
  | 'payment_required';

const AI_ERROR_TO_REASON: Record<AiErrorKind, FileSelectionFailureReason> = {
  invalid_api_key: 'invalid_api_key',
  timeout: 'timeout',
  unavailable: 'ai_unavailable',
  rate_limited: 'rate_limited',
  payment_required: 'payment_required',
};

export class FileSelectionError extends Error {
  constructor(
    readonly reason: FileSelectionFailureReason,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'FileSelectionError';
  }
}

export interface VacancyContext {
  rawDescription: string;
  profile: ParsedVacancyProfile;
}

@Injectable()
export class RepoFileSelectorService {
  private readonly logger = new Logger(RepoFileSelectorService.name);

  constructor(private readonly ai: AiProviderPort) {}

  async selectRelevantFiles(paths: string[], vacancy: VacancyContext): Promise<string[]> {
    const candidates = paths.slice(0, MAX_PATHS_SENT_TO_AI);
    const userMessage = JSON.stringify({
      vacancy: {
        descriptionExcerpt: vacancy.rawDescription.slice(0, DESCRIPTION_EXCERPT_CHARS),
        technologies: vacancy.profile.technologies,
        seniorityLevel: vacancy.profile.seniorityLevel,
        keyCompetencies: vacancy.profile.keyCompetencies,
      },
      files: candidates,
    });

    let raw: string;
    try {
      raw = await this.ai.complete(SYSTEM_PROMPT, userMessage);
    } catch (err) {
      const reason = err instanceof AiError ? AI_ERROR_TO_REASON[err.kind] : 'ai_unavailable';
      const message =
        err instanceof AiError ? err.message : 'A chamada à IA não foi concluída.';
      this.logger.warn(`Falha ao consultar a IA para seleção de arquivos: ${message}`);
      throw new FileSelectionError(reason, message, err);
    }

    let json: unknown;
    try {
      json = JSON.parse(this.stripMarkdownFence(raw));
    } catch {
      this.logger.warn('Resposta da IA de seleção de arquivos não é JSON válido.');
      throw new FileSelectionError('invalid_response', 'A IA não devolveu um JSON válido.');
    }

    const result = FileSelectionResponseSchema.safeParse(json);
    if (!result.success) {
      this.logger.warn('Resposta da IA de seleção de arquivos não bate com o schema esperado.');
      throw new FileSelectionError(
        'invalid_response',
        'A resposta da IA não bate com o formato esperado.',
        result.error.flatten(),
      );
    }

    const validPaths = new Set(paths);
    const seenOrdered = new Set<string>();
    const ordered: string[] = [];

    for (const path of result.data.relevantFiles) {
      if (validPaths.has(path) && !seenOrdered.has(path)) {
        ordered.push(path);
        seenOrdered.add(path);
      }
    }

    if (ordered.length === 0) {
      throw new FileSelectionError(
        'invalid_response',
        'A IA não escolheu nenhum arquivo válido da lista recebida.',
      );
    }

    return ordered;
  }

  private stripMarkdownFence(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
}
