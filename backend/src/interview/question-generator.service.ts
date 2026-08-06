import { Injectable, Logger } from '@nestjs/common';
import { AiError, AiErrorKind, AiProviderPort } from '../vacancies/vacancy-parser.service';
import { ParsedVacancyProfile } from '../vacancies/schemas/vacancy.schema';
import { AiQuestion, AiQuestionsResponseSchema } from './schemas/interview.schema';

const DESCRIPTION_EXCERPT_CHARS = 3000;
const MAX_CHARS_PER_FILE = 6000;
/** Prompt bem maior que o de parsing de vaga (arquivos de código inteiros) — o
 * modelo demora mais para responder, então o timeout padrão de 30s não basta. */
const REQUEST_TIMEOUT_MS = 60_000;

const SYSTEM_PROMPT = `
Você é um recrutador técnico sênior conduzindo uma entrevista técnica com um candidato.
Você recebe: o perfil da vaga (tecnologias, senioridade, competências-chave, trecho da descrição original) e uma seleção de arquivos de código do repositório do candidato (path + conteúdo).

Gere exatamente {count} perguntas de entrevista, no ponto de vista de um recrutador avaliando adequação técnica à vaga. Distribua entre os tipos:
- "logic": raciocínio técnico geral, não depende do código do candidato.
- "scenario": situação hipotética de trabalho (ex.: incidente em produção, priorização, deadline).
- "project": pergunta sobre decisões reais tomadas no repositório (arquitetura, motivação de uma escolha visível no código).
- "code_analysis": aponta um trecho específico de código (cite o path e cole um trecho curto do conteúdo fornecido) e pergunta sobre ele — problema, decisão de design, ou como o candidato o melhoraria.

Regras:
- Pelo menos 1 pergunta "code_analysis" deve citar um trecho REAL do conteúdo de arquivo fornecido (não invente código).
- As perguntas devem refletir a senioridade e as competências-chave da vaga.
- Evite perguntas genéricas de "decoreba"; prefira perguntas que revelem raciocínio.
- A primeira pergunta deve ser de aquecimento (tipo "logic", mais simples).

Responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional, no formato:
{
  "questions": [
    { "type": "logic"|"scenario"|"project"|"code_analysis", "content": string, "codeFile"?: string, "codeExcerpt"?: string }
  ]
}
`.trim();

export type QuestionGenerationFailureReason =
  | 'invalid_api_key'
  | 'timeout'
  | 'ai_unavailable'
  | 'invalid_response'
  | 'rate_limited'
  | 'payment_required';

const AI_ERROR_TO_REASON: Record<AiErrorKind, QuestionGenerationFailureReason> = {
  invalid_api_key: 'invalid_api_key',
  timeout: 'timeout',
  unavailable: 'ai_unavailable',
  rate_limited: 'rate_limited',
  payment_required: 'payment_required',
};

export class QuestionGenerationError extends Error {
  constructor(
    readonly reason: QuestionGenerationFailureReason,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'QuestionGenerationError';
  }
}

export interface GenerateQuestionsInput {
  rawDescription: string;
  profile: ParsedVacancyProfile;
  files: { path: string; content: string }[];
  count: number;
}

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  constructor(private readonly ai: AiProviderPort) {}

  async generate(input: GenerateQuestionsInput): Promise<AiQuestion[]> {
    const systemPrompt = SYSTEM_PROMPT.replace('{count}', String(input.count));

    const userMessage = JSON.stringify({
      vacancy: {
        descriptionExcerpt: input.rawDescription.slice(0, DESCRIPTION_EXCERPT_CHARS),
        technologies: input.profile.technologies,
        seniorityLevel: input.profile.seniorityLevel,
        keyCompetencies: input.profile.keyCompetencies,
      },
      questionCount: input.count,
      files: input.files.map((file) => ({
        path: file.path,
        content: file.content.slice(0, MAX_CHARS_PER_FILE),
      })),
    });

    let raw: string;
    try {
      raw = await this.ai.complete(systemPrompt, userMessage, REQUEST_TIMEOUT_MS);
    } catch (err) {
      const reason = err instanceof AiError ? AI_ERROR_TO_REASON[err.kind] : 'ai_unavailable';
      const message = err instanceof AiError ? err.message : 'A chamada à IA não foi concluída.';
      this.logger.error(`Falha ao gerar perguntas de entrevista: ${message}`, err);
      throw new QuestionGenerationError(reason, message, err);
    }

    let json: unknown;
    try {
      json = JSON.parse(this.stripMarkdownFence(raw));
    } catch {
      this.logger.error('Resposta da IA de geração de perguntas não é JSON válido.');
      throw new QuestionGenerationError('invalid_response', 'A IA não devolveu um JSON válido.');
    }

    const result = AiQuestionsResponseSchema.safeParse(json);
    if (!result.success) {
      this.logger.error(
        'Resposta da IA de geração de perguntas não bate com o schema esperado.',
        result.error.flatten(),
      );
      throw new QuestionGenerationError(
        'invalid_response',
        'A resposta da IA não bate com o formato esperado.',
        result.error.flatten(),
      );
    }

    return result.data.questions;
  }

  private stripMarkdownFence(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
}
