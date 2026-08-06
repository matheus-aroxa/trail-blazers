import { Injectable, Logger } from '@nestjs/common';
import { AiError, AiErrorKind, AiProviderPort } from '../vacancies/vacancy-parser.service';
import { ParsedVacancyProfile } from '../vacancies/schemas/vacancy.schema';
import { AiReport, AiReportSchema } from './schemas/interview.schema';

const DESCRIPTION_EXCERPT_CHARS = 3000;
/** Prompt inclui todas as perguntas e respostas — pode ficar grande, então usamos
 * o mesmo timeout estendido da geração de perguntas em vez do padrão de 30s. */
const REQUEST_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = `
Você é um recrutador técnico sênior produzindo o relatório final de uma entrevista técnica simulada.
Você recebe: o perfil da vaga (tecnologias, senioridade, competências-chave, trecho da descrição) e a lista de perguntas feitas com as respectivas respostas do candidato.

Avalie o desempenho do candidato de forma honesta e construtiva, como faria um recrutador experiente escrevendo um feedback pós-entrevista. Considere:
- overallScore (0-100): desempenho geral nas perguntas.
- adherenceScore (0-100): o quanto o perfil do candidato (visível nas respostas) adere aos requisitos da vaga.
- dimensionScores: avalie de 2 a 5 dimensões relevantes para ESTA vaga (ex.: "Lógica", "Domínio da stack", "Qualidade das decisões", "Comunicação") com nota 0-100 cada.
- strengths: pontos fortes concretos, citando o que o candidato disse.
- gaps: lacunas concretas, incluindo tecnologias da vaga que não apareceram nas respostas.
- recommendations: ações práticas e específicas para o candidato evoluir.

Seja específico — cite trechos das respostas quando relevante. Não invente informação que não esteja nas respostas.

Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional, no formato:
{
  "overallScore": number, "adherenceScore": number,
  "dimensionScores": [{ "label": string, "score": number }],
  "strengths": [{ "title": string, "text": string }],
  "gaps": [{ "title": string, "text": string }],
  "recommendations": [{ "title": string, "text": string }]
}
`.trim();

export type ReportGenerationFailureReason =
  | 'invalid_api_key'
  | 'timeout'
  | 'ai_unavailable'
  | 'invalid_response'
  | 'rate_limited'
  | 'payment_required';

const AI_ERROR_TO_REASON: Record<AiErrorKind, ReportGenerationFailureReason> = {
  invalid_api_key: 'invalid_api_key',
  timeout: 'timeout',
  unavailable: 'ai_unavailable',
  rate_limited: 'rate_limited',
  payment_required: 'payment_required',
};

export class ReportGenerationError extends Error {
  constructor(
    readonly reason: ReportGenerationFailureReason,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ReportGenerationError';
  }
}

export interface GenerateReportInput {
  rawDescription: string;
  profile: ParsedVacancyProfile;
  answeredQuestions: { type: string; content: string; answer: string }[];
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);

  constructor(private readonly ai: AiProviderPort) {}

  async generate(input: GenerateReportInput): Promise<AiReport> {
    const userMessage = JSON.stringify({
      vacancy: {
        descriptionExcerpt: input.rawDescription.slice(0, DESCRIPTION_EXCERPT_CHARS),
        technologies: input.profile.technologies,
        seniorityLevel: input.profile.seniorityLevel,
        keyCompetencies: input.profile.keyCompetencies,
      },
      answeredQuestions: input.answeredQuestions,
    });

    let raw: string;
    try {
      raw = await this.ai.complete(SYSTEM_PROMPT, userMessage, REQUEST_TIMEOUT_MS);
    } catch (err) {
      const reason = err instanceof AiError ? AI_ERROR_TO_REASON[err.kind] : 'ai_unavailable';
      const message = err instanceof AiError ? err.message : 'A chamada à IA não foi concluída.';
      this.logger.error(`Falha ao gerar relatório de entrevista: ${message}`, err);
      throw new ReportGenerationError(reason, message, err);
    }

    let json: unknown;
    try {
      json = JSON.parse(this.stripMarkdownFence(raw));
    } catch {
      this.logger.error('Resposta da IA de relatório não é JSON válido.');
      throw new ReportGenerationError('invalid_response', 'A IA não devolveu um JSON válido.');
    }

    const result = AiReportSchema.safeParse(json);
    if (!result.success) {
      this.logger.error(
        'Resposta da IA de relatório não bate com o schema esperado.',
        result.error.flatten(),
      );
      throw new ReportGenerationError(
        'invalid_response',
        'A resposta da IA não bate com o formato esperado.',
        result.error.flatten(),
      );
    }

    return result.data;
  }

  private stripMarkdownFence(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
}
