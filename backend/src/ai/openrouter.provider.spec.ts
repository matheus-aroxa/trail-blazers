import { ConfigService } from '@nestjs/config';
import { OpenRouterProvider } from './openrouter.provider';
import { AiError } from '../vacancies/vacancy-parser.service';

const config = {
  getOrThrow: () => 'chave-de-teste',
  get: (_key: string, fallback: string) => fallback,
} as unknown as ConfigService;

const okBody = (content: string) => ({
  ok: true,
  json: () => Promise.resolve({ choices: [{ message: { content } }] }),
});

const errorBody = (status: number, body = '{"error":"nope"}') => ({
  ok: false,
  status,
  text: () => Promise.resolve(body),
});

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    provider = new OpenRouterProvider(config);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const call = () => provider.complete('sistema', 'usuário');

  it('devolve o conteúdo quando a chamada dá certo', async () => {
    fetchMock.mockResolvedValue(okBody('{"technologies":[]}'));

    await expect(call()).resolves.toBe('{"technologies":[]}');
  });

  it('classifica 401 como invalid_api_key', async () => {
    fetchMock.mockResolvedValue(errorBody(401, '{"error":{"message":"User not found."}}'));

    await expect(call()).rejects.toMatchObject({
      name: 'AiError',
      kind: 'invalid_api_key',
    });
  });

  it('classifica 403 como invalid_api_key', async () => {
    fetchMock.mockResolvedValue(errorBody(403));

    await expect(call()).rejects.toMatchObject({ kind: 'invalid_api_key' });
  });

  it('classifica o estouro do AbortSignal como timeout', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    fetchMock.mockRejectedValue(timeout);

    await expect(call()).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('classifica timeout embrulhado em cause como timeout', async () => {
    const wrapped = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('timed out'), { name: 'TimeoutError' }),
    });
    fetchMock.mockRejectedValue(wrapped);

    await expect(call()).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('classifica falha de rede como unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(call()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('classifica 500 como unavailable', async () => {
    fetchMock.mockResolvedValue(errorBody(500));
    await expect(call()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('classifica 429 como rate_limited', async () => {
    fetchMock.mockResolvedValue(errorBody(429));
    await expect(call()).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('classifica 402 como payment_required', async () => {
    fetchMock.mockResolvedValue(errorBody(402));
    await expect(call()).rejects.toMatchObject({ kind: 'payment_required' });
  });

  it('trata resposta vazia como unavailable', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    });

    await expect(call()).rejects.toBeInstanceOf(AiError);
  });
});
