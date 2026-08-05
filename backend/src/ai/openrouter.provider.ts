import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiError, AiProviderPort } from '../vacancies/vacancy-parser.service';

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * O fetch do Node embrulha o estouro do AbortSignal.timeout de formas
 * diferentes conforme a versão, então olhamos o erro e a causa dele.
 */
function isTimeout(err: unknown): boolean {
  const named = err as { name?: string; cause?: { name?: string } } | null;
  return named?.name === 'TimeoutError' || named?.cause?.name === 'TimeoutError';
}

@Injectable()
export class OpenRouterProvider implements AiProviderPort {
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly siteUrl: string;
  private readonly siteTitle: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY');
    this.model = this.config.get<string>('AI_MODEL', 'openai/gpt-oss-20b:free');
    this.siteUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3001');
    this.siteTitle = this.config.get<string>('APP_TITLE', 'Trail Blazers');
  }

  async complete(systemPrompt: string, userMessage: string): Promise<string> {
    let response: Response;

    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteTitle,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          reasoning: { effort: 'low' },
        }),
      });
    } catch (err) {
      if (isTimeout(err)) {
        throw new AiError('timeout', `A OpenRouter não respondeu em ${REQUEST_TIMEOUT_MS}ms.`, err);
      }
      throw new AiError('unavailable', 'Não foi possível alcançar a OpenRouter.', err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');

      // 401 = chave inválida/revogada, 403 = chave sem permissão para o modelo.
      if (response.status === 401 || response.status === 403) {
        throw new AiError(
          'invalid_api_key',
          `A OpenRouter recusou a chave de API (${response.status}).`,
          body,
        );
      }

      if (response.status === 429) {
        throw new AiError(
          'rate_limited',
          'A OpenRouter está limitando as requisições no momento. Tente novamente em instantes.',
          body,
        );
      }

      if (response.status === 402) {
        throw new AiError(
          'payment_required',
          'A conta da OpenRouter está sem créditos suficientes para processar a análise.',
          body,
        );
      }

      throw new AiError('unavailable', `OpenRouter erro ${response.status}: ${body}`);
    }

    let data: { choices?: { message?: { content?: string } }[] };

    try {
      data = (await response.json()) as typeof data;
    } catch (err) {
      throw new AiError('unavailable', 'A OpenRouter devolveu um corpo ilegível.', err);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new AiError('unavailable', 'A OpenRouter retornou resposta vazia.');

    return content;
  }
}
