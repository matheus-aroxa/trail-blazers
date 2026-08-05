import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=public',
    GITHUB_CLIENT_ID: 'Ov23liexemplo',
    GITHUB_CLIENT_SECRET: 'segredo-do-oauth-app',
    GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
    JWT_SECRET: 'a'.repeat(32),
    ENCRYPTION_KEY: 'a'.repeat(64),
    OPENROUTER_API_KEY: 'sk-or-v1-exemplo',
  };

  const validate = (env: Record<string, unknown>) =>
    envValidationSchema.validate(env, { abortEarly: false });

  it('aceita um ambiente completo e válido', () => {
    expect(validate(validEnv).error).toBeUndefined();
  });

  it('aplica os defaults de PORT, NODE_ENV, JWT_EXPIRES_IN e FRONTEND_URL', () => {
    const { value } = validate(validEnv) as { value: Record<string, unknown> };

    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3000);
    expect(value.JWT_EXPIRES_IN).toBe('1d');
    expect(value.FRONTEND_URL).toBe('http://localhost:3001');
  });

  describe.each([
    ['DATABASE_URL', 'DATABASE_URL é obrigatória'],
    ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_ID é obrigatória'],
    ['GITHUB_CLIENT_SECRET', 'GITHUB_CLIENT_SECRET é obrigatória'],
    ['GITHUB_CALLBACK_URL', 'GITHUB_CALLBACK_URL é obrigatória'],
    ['JWT_SECRET', 'JWT_SECRET é obrigatória'],
    ['ENCRYPTION_KEY', 'ENCRYPTION_KEY é obrigatória'],
    ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEY é obrigatória'],
  ])('%s ausente', (key, mensagem) => {
    it(`reporta "${mensagem}"`, () => {
      const env = { ...validEnv };
      delete (env as Record<string, unknown>)[key];

      expect(validate(env).error?.message).toContain(mensagem);
    });
  });

  describe('ENCRYPTION_KEY', () => {
    it('rejeita chave com menos de 64 caracteres', () => {
      const { error } = validate({ ...validEnv, ENCRYPTION_KEY: 'a'.repeat(63) });

      expect(error?.message).toContain('exatamente 64 caracteres hexadecimais');
    });

    it('rejeita chave com mais de 64 caracteres', () => {
      const { error } = validate({ ...validEnv, ENCRYPTION_KEY: 'a'.repeat(65) });

      expect(error?.message).toContain('exatamente 64 caracteres hexadecimais');
    });

    it('rejeita chave não hexadecimal', () => {
      const { error } = validate({ ...validEnv, ENCRYPTION_KEY: 'z'.repeat(64) });

      expect(error?.message).toContain('deve estar em hexadecimal');
    });

    it('aceita hexadecimal em maiúsculas', () => {
      expect(validate({ ...validEnv, ENCRYPTION_KEY: 'AB'.repeat(32) }).error).toBeUndefined();
    });
  });

  it('rejeita JWT_SECRET com menos de 32 caracteres', () => {
    const { error } = validate({ ...validEnv, JWT_SECRET: 'curto' });

    expect(error?.message).toContain('pelo menos 32 caracteres');
  });

  it('rejeita DATABASE_URL que não é URI', () => {
    const { error } = validate({ ...validEnv, DATABASE_URL: 'nao-e-uma-uri' });

    expect(error?.message).toContain('DATABASE_URL deve ser uma URL válida');
  });

  it('rejeita GITHUB_CALLBACK_URL que não é URI', () => {
    const { error } = validate({ ...validEnv, GITHUB_CALLBACK_URL: 'callback' });

    expect(error?.message).toContain('GITHUB_CALLBACK_URL deve ser uma URL válida');
  });

  it('rejeita NODE_ENV fora da lista permitida', () => {
    expect(validate({ ...validEnv, NODE_ENV: 'staging' }).error).toBeDefined();
  });

  it('reporta todos os erros de uma vez', () => {
    const env = { ...validEnv };
    delete (env as Record<string, unknown>).JWT_SECRET;
    delete (env as Record<string, unknown>).ENCRYPTION_KEY;

    const { error } = validate(env);

    expect(error?.details).toHaveLength(2);
    expect(error?.message).toContain('JWT_SECRET é obrigatória');
    expect(error?.message).toContain('ENCRYPTION_KEY é obrigatória');
  });
});
