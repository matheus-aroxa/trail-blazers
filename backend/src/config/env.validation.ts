import * as Joi from 'joi';

//Arquivo de validação de variaveis de ambiente

//Novas variaveis de ambiente devem ser adicionadas aqui para que tenham mensagens de erro personalizadas

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  PORT: Joi.number().default(3000),

  // Exemplo de variável obrigatória (banco de dados)
  DATABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'DATABASE_URL é obrigatória. Defina-a no arquivo .env',
    'string.uri': 'DATABASE_URL deve ser uma URL válida (ex: postgres://user:pass@host:5432/db)',
  }),

  // OAuth do GitHub
  GITHUB_CLIENT_ID: Joi.string().required().messages({
    'any.required': 'GITHUB_CLIENT_ID é obrigatória. Pegue-a no OAuth App do GitHub',
  }),
  GITHUB_CLIENT_SECRET: Joi.string().required().messages({
    'any.required': 'GITHUB_CLIENT_SECRET é obrigatória. Pegue-a no OAuth App do GitHub',
  }),
  GITHUB_CALLBACK_URL: Joi.string().uri().required().messages({
    'any.required': 'GITHUB_CALLBACK_URL é obrigatória e deve ser igual à cadastrada no OAuth App',
    'string.uri': 'GITHUB_CALLBACK_URL deve ser uma URL válida',
  }),

  OPENROUTER_API_KEY: Joi.string().required().messages({
    'any.required': 'OPENROUTER_API_KEY é obrigatória. Gere em openrouter.ai/keys',
  }),
  AI_MODEL: Joi.string().default('openai/gpt-oss-20b:free'),
  APP_TITLE: Joi.string().default('Trail Blazers'),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET é obrigatória. Defina-a no arquivo .env',
    'string.min': 'JWT_SECRET deve ter pelo menos 32 caracteres',
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  // Chave AES-256 usada para criptografar o access token do GitHub
  ENCRYPTION_KEY: Joi.string().length(64).hex().required().messages({
    'any.required': 'ENCRYPTION_KEY é obrigatória. Gere com: openssl rand -hex 32',
    'string.length': 'ENCRYPTION_KEY deve ter exatamente 64 caracteres hexadecimais (32 bytes)',
    'string.hex': 'ENCRYPTION_KEY deve estar em hexadecimal. Gere com: openssl rand -hex 32',
  }),

  // Front-end (destino do redirect após o login)
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),
});
