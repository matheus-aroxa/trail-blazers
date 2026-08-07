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
Você recebe: o perfil da vaga (tecnologias, senioridade, competências-chave, trecho da descrição), dados do repositório do candidato (nome, arquivos selecionados e trechos de código usados na entrevista) e a lista de perguntas feitas com as respectivas respostas do candidato.

Você deve calcular DOIS scores com critérios completamente independentes — não misture um no outro:

1. overallScore (0-100) e dimensionScores: desempenho do candidato NAS RESPOSTAS da entrevista.
   - dimensionScores: avalie de 2 a 5 dimensões relevantes para ESTA vaga (ex.: "Lógica", "Domínio da stack", "Qualidade das decisões", "Comunicação") com nota 0-100 cada.
   - strengths: pontos fortes concretos, citando o que o candidato disse.
   - gaps: lacunas concretas nas respostas, incluindo tecnologias da vaga que não apareceram.
   - recommendations: ações práticas e específicas para o candidato evoluir.
   - Seja específico — cite trechos das respostas quando relevante. Não invente informação que não esteja nas respostas.

2. adherenceScore (0-100) e adherenceNotes: o QUÃO RELEVANTE é o REPOSITÓRIO/PROJETO do candidato para o ESCOPO da vaga. Isto é sobre o projeto em si, NÃO sobre a qualidade das respostas dadas na entrevista. Avalie:
   - Aderência de stack: as tecnologias, linguagens e frameworks usados no repositório (visíveis nos paths dos arquivos, extensões e trechos de código) batem com as tecnologias exigidas pela vaga?
   - Aderência de domínio/escopo: o propósito do projeto (inferido pelo nome do repositório, estrutura de pastas e código) tem relação com o tipo de sistema, indústria ou atividades descritas na vaga?
   - Um projeto tecnicamente bem construído mas em domínio/stack completamente diferente do pedido pela vaga deve receber adherenceScore BAIXO (ex.: um projeto de análise de dados em Python para uma vaga de desenvolvedor web Java tem pouca ou nenhuma aderência, mesmo que o código seja de qualidade). Adherência alta exige convergência real de stack e/ou domínio, não apenas "é um projeto de programação".
   - adherenceNotes: 1 a 3 notas curtas e concretas explicando o veredito — cite tecnologias/arquivos que bateram ou não bateram, e se o domínio do projeto se relaciona ou não com a vaga.

Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional, no formato:
{
  "overallScore": number, "adherenceScore": number,
  "adherenceNotes": [{ "title": string, "text": string }],
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
  repo: {
    fullName: string;
    filePaths: string[];
    codeSamples: { file: string; excerpt: string }[];
  };
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
      repo: input.repo,
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
