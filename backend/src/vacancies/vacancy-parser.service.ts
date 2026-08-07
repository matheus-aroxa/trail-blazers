import { Injectable, Logger } from '@nestjs/common';
import { AiResponseSchema, ParsedVacancyProfile } from './schemas/vacancy.schema';

export abstract class AiProviderPort {
  abstract complete(systemPrompt: string, userMessage: string, timeoutMs?: number): Promise<string>;
}

/** O que deu errado na conversa com o provedor de IA. */
export type AiErrorKind =
  'invalid_api_key' | 'timeout' | 'unavailable' | 'rate_limited' | 'payment_required';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/**
 * Motivo pelo qual a análise não pôde ser feita. Não confundir com um resultado
 * pobre: uma vaga vaga demais gera um perfil vazio, mas a análise deu certo.
 */
export type ParseFailureReason =
  | 'invalid_api_key'
  | 'timeout'
  | 'ai_unavailable'
  | 'invalid_response'
  | 'rate_limited'
  | 'payment_required';

const AI_ERROR_TO_REASON: Record<AiErrorKind, ParseFailureReason> = {
  invalid_api_key: 'invalid_api_key',
  timeout: 'timeout',
  unavailable: 'ai_unavailable',
  rate_limited: 'rate_limited',
  payment_required: 'payment_required',
};

export class VacancyParseError extends Error {
  constructor(
    readonly reason: ParseFailureReason,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'VacancyParseError';
  }
}

const PARSE_SYSTEM_PROMPT = `
Você é um especialista em análise de vagas de tecnologia.
Analise a descrição de vaga fornecida e responda APENAS com um objeto JSON válido, sem markdown, sem texto adicional.

Schema obrigatório:
{
  "technologies": string[],        // linguagens, frameworks e ferramentas (máx. 15)
  "seniorityLevel": "intern" | "trainee" | "junior" | "mid" | "senior" | "lead" | "unknown",
  "keyCompetencies": string[],     // habilidades e requisitos-chave (máx. 10)
  "confidence": "high" | "low",   // "low" se a stack não ficou clara
  "outOfScope": boolean            // true se a vaga não for de tecnologia
}

Regras:
- Normalize nomes: "nodejs" → "Node.js", "reactjs" → "React".
- Use "intern" para vagas de estágio ("estagiário", "internship") — vínculo de estágio durante a graduação, geralmente com carga horária reduzida.
- Use "trainee" para programas de trainee — contratação efetiva/CLT recém-formado, dentro de um programa estruturado de formação, distinto de estágio e de "junior" comum.
- NÃO confunda "intern" ou "trainee" com "junior", que é para o primeiro emprego efetivo em nível pleno-iniciante fora de um programa de formação.
- Se não houver tecnologias claras, use [] e "confidence": "low".
- Se a vaga não for de tecnologia, retorne "outOfScope": true.
`.trim();

const OUT_OF_SCOPE_PROFILE: ParsedVacancyProfile = {
  technologies: [],
  seniorityLevel: 'unknown',
  keyCompetencies: [],
  confidence: 'low',
  outOfScope: true,
};

@Injectable()
export class VacancyParserService {
  private readonly logger = new Logger(VacancyParserService.name);

  constructor(private readonly ai: AiProviderPort) {}

  async parse(description: string): Promise<ParsedVacancyProfile> {
    let raw: string;
    try {
      raw = await this.ai.complete(PARSE_SYSTEM_PROMPT, description);
    } catch (err) {
      this.logger.error('Falha na chamada à IA.', err);

      const reason = err instanceof AiError ? AI_ERROR_TO_REASON[err.kind] : 'ai_unavailable';
      const message = err instanceof AiError ? err.message : 'A chamada à IA não foi concluída.';

      throw new VacancyParseError(reason, message, err);
    }

    return this.parseWithZod(raw);
  }

  private stripMarkdownFence(raw: string): string {
    return raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }

  private parseWithZod(raw: string): ParsedVacancyProfile {
    let json: unknown;
    try {
      json = JSON.parse(this.stripMarkdownFence(raw));
    } catch {
      this.logger.error('Resposta da IA não é JSON válido.', raw.slice(0, 200));
      throw new VacancyParseError('invalid_response', 'A IA não devolveu um JSON válido.');
    }

    const result = AiResponseSchema.safeParse(json);
    if (!result.success) {
      this.logger.error('Resposta da IA não passou na validação Zod.', result.error.flatten());
      throw new VacancyParseError(
        'invalid_response',
        'A resposta da IA não bate com o formato esperado.',
        result.error.flatten(),
      );
    }

    const data = result.data;

    if (data.outOfScope) return OUT_OF_SCOPE_PROFILE;

    return data;
  }
}
