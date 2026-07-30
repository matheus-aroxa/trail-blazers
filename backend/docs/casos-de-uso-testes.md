# Casos de uso e cobertura de testes — Backend

Documento de referência para levar a cobertura de testes do backend a **no mínimo 80%**.
Cada caso de uso (UC) descreve um comportamento observável do sistema; dele derivam os
casos de teste (CT) que devem existir no repositório.

- **Baseline medido em:** 23/07/2026 (`npx jest --coverage`)
- **Meta:** ≥ 80% de statements, branches, functions e lines
- **Escopo:** `backend/src`
- **Status:** ✅ implementado — **97,31% statements / 83,33% branches / 100% functions /
  96,77% lines**, com 78 testes unitários e 16 e2e. Ver §7.

---

## 1. Situação atual

Cobertura global de **29,44%** (58 de 197 statements). Por arquivo:

| Arquivo | Statements | % | Situação |
|---|---|---|---|
| `crypto/encryption.service.ts` | 25/26 | 96% | Coberto |
| `users/users.service.ts` | 14/16 | 88% | Coberto |
| `app.controller.ts` | 8/8 | 100% | Coberto |
| `app.service.ts` | 5/5 | 100% | Coberto |
| `prisma/prisma.service.ts` | 6/9 | 67% | Parcial |
| `auth/auth.controller.ts` | 0/18 | 0% | **Sem teste** |
| `auth/strategies/jwt.strategy.ts` | 0/14 | 0% | **Sem teste** |
| `auth/guards/jwt-auth.guard.ts` | 0/13 | 0% | **Sem teste** |
| `auth/strategies/github.strategy.ts` | 0/12 | 0% | **Sem teste** |
| `auth/auth.service.ts` | 0/11 | 0% | **Sem teste** |
| `auth/github-auth.guard.ts` | 0/5 | 0% | **Sem teste** |
| `auth/decorators/public.decorator.ts` | 0/5 | 0% | **Sem teste** |
| `auth/dto/sign-in.dto.ts` | 0/4 | 0% | Código órfão (ver §6) |
| `config/env.validation.ts` | 0/2 | 0% | **Sem teste** |
| `*.module.ts`, `main.ts` | 0/49 | 0% | Excluir (ver §2) |

### Débito imediato

O teste `test/app.e2e-spec.ts` **está falhando**: espera `200` em `GET /`, mas o
`JwtAuthGuard` global agora responde `401`. Isso não é um bug — é o comportamento
correto — mas o teste precisa ser atualizado (CT-05.1 e CT-05.2).

---

## 2. Configuração de cobertura

O `collectCoverageFrom` atual (`**/*.(t|j)s`) inclui 49 statements de arquivos que são
apenas fiação declarativa do Nest (`*.module.ts`) e bootstrap (`main.ts`). Testá-los não
verifica comportamento nenhum, só infla o número. Recomenda-se ajustar o `package.json`:

```json
"collectCoverageFrom": [
  "**/*.(t|j)s",
  "!**/*.module.ts",
  "!main.ts",
  "!**/*.spec.ts"
],
"coverageThreshold": {
  "global": { "statements": 80, "branches": 80, "functions": 80, "lines": 80 }
}
```

Com essa exclusão o denominador cai para **148 statements**, e a base atual passa a ser
**39%** (58/148). Para chegar a 80% é preciso cobrir **~119 statements**, ou seja,
somar +61. Os casos de uso abaixo somam ~90 statements cobríveis — folga suficiente.

O `coverageThreshold` faz o `npm run test:cov` falhar se a meta regredir, o que impede
que a cobertura caia silenciosamente em PRs futuros.

---

## 3. Casos de uso

### UC-01 — Autenticar com o GitHub (primeiro acesso)

| | |
|---|---|
| **Ator** | Visitante não autenticado |
| **Pré-condições** | Usuário sem registro na tabela `users`; OAuth App configurado |
| **Pós-condições** | Usuário criado; token do GitHub gravado criptografado; JWT emitido |

**Fluxo principal**
1. Visitante acessa `GET /auth/github`.
2. Sistema redireciona para a tela de autorização do GitHub.
3. GitHub redireciona de volta para `GET /auth/github/callback` com o código.
4. `GithubStrategy.validate()` monta o `GithubUser` a partir do profile.
5. `AuthService.loginWithGithub()` chama `UsersService.upsertFromGithub()`.
6. Sistema criptografa o access token e cria o registro em `users`.
7. Sistema assina um JWT com `sub` = id interno (UUID) do usuário.
8. Sistema redireciona para `${FRONTEND_URL}/auth/success?token=...`.

**Fluxos alternativos**
- **A1** — Profile do GitHub sem e-mail e/ou sem avatar → persistir `null` nesses campos.
- **A2** — Profile sem `username` → persistir string vazia (comportamento atual da strategy).
- **A3** — `req.user` ausente no callback → `UnauthorizedException`.

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-01.1 | `validate()` mapeia id/username/emails[0]/photos[0] para `GithubUser` | `github.strategy.ts` | Unitário |
| CT-01.2 | `validate()` com `emails`/`photos` indefinidos não lança e devolve `undefined` nos campos | `github.strategy.ts` | Unitário |
| CT-01.3 | `validate()` sem `username` devolve string vazia | `github.strategy.ts` | Unitário |
| CT-01.4 | `loginWithGithub()` usa `user.id` como `sub` — **não** o `githubId` | `auth.service.ts` | Unitário |
| CT-01.5 | `loginWithGithub()` devolve `accessToken` assinado pelo `JwtService` | `auth.service.ts` | Unitário |
| CT-01.6 | Callback redireciona para `${FRONTEND_URL}/auth/success?token=...` | `auth.controller.ts` | Unitário |
| CT-01.7 | Callback sem `req.user` lança `UnauthorizedException` | `auth.controller.ts` | Unitário |

> CT-01.4 é o teste mais importante do documento: protege a regra de que o `sub` é o
> identificador interno, da qual dependem o `JwtStrategy` e todas as FKs (`vacancies`, `sessions`).

---

### UC-02 — Autenticar com o GitHub (usuário recorrente)

| | |
|---|---|
| **Ator** | Usuário já registrado |
| **Pré-condições** | Existe registro em `users` com o mesmo `githubId` |
| **Pós-condições** | Dados de perfil atualizados; **nenhum** registro duplicado; token regravado |

**Fluxo principal**
1. Mesmos passos 1–4 do UC-01.
2. `upsertFromGithub()` encontra o usuário por `githubId` e atualiza `username`,
   `email`, `avatarUrl` e `githubTokenEncrypted`.
3. O `id` do usuário permanece o mesmo — JWTs antigos continuam apontando para ele.

**Fluxos alternativos**
- **A1** — Usuário trocou o username no GitHub → registro reflete o valor novo.
- **A2** — Usuário revogou e reautorizou o app → novo access token substitui o antigo.

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-02.1 | `upsert` é chamado com `where: { githubId }` e mesmo payload em `create`/`update` | `users.service.ts` | Unitário ✅ |
| CT-02.2 | Segundo login com dados alterados atualiza o registro e preserva o `id` | `users.service.ts` | Integração |
| CT-02.3 | `findByGithubId()` devolve `null` quando não existe | `users.service.ts` | Unitário |

✅ = já coberto pela suíte atual.

---

### UC-03 — Proteger o access token do GitHub em repouso

| | |
|---|---|
| **Ator** | Sistema |
| **Pré-condições** | `ENCRYPTION_KEY` válida (64 caracteres hex) |
| **Pós-condições** | Token nunca persistido em texto puro; recuperável apenas via `getGithubToken()` |

**Fluxo principal**
1. `EncryptionService.encrypt()` gera IV aleatório de 12 bytes.
2. Cifra com AES-256-GCM e produz `iv:authTag:ciphertext` em base64.
3. `UsersService` grava o resultado em `githubTokenEncrypted`.
4. `getGithubToken()` lê, decifra e devolve o texto puro.

**Fluxos alternativos**
- **A1** — Usuário sem token guardado → `getGithubToken()` devolve `null` sem tentar decifrar.
- **A2** — Valor adulterado no banco → `decrypt()` lança (auth tag do GCM não confere).
- **A3** — Formato inválido (partes faltando, IV ou tag com tamanho errado) → lança
  `Conteúdo criptografado em formato inválido`.
- **A4** — `ENCRYPTION_KEY` diferente da usada para cifrar → `decrypt()` lança.

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-03.1 | Round-trip: `decrypt(encrypt(x)) === x` | `encryption.service.ts` | Unitário ✅ |
| CT-03.2 | Mesma entrada gera saídas diferentes (IV aleatório) | `encryption.service.ts` | Unitário ✅ |
| CT-03.3 | Ciphertext adulterado faz `decrypt()` lançar | `encryption.service.ts` | Unitário ✅ |
| CT-03.4 | Formato inválido faz `decrypt()` lançar mensagem específica | `encryption.service.ts` | Unitário ✅ |
| CT-03.5 | IV ou authTag com tamanho errado é rejeitado (linha 45, único branch descoberto) | `encryption.service.ts` | Unitário |
| CT-03.6 | `upsertFromGithub()` grava o token cifrado, nunca o valor puro | `users.service.ts` | Unitário ✅ |
| CT-03.7 | `getGithubToken()` devolve o token decifrado | `users.service.ts` | Unitário ✅ |
| CT-03.8 | `getGithubToken()` devolve `null` e não chama `decrypt()` sem token | `users.service.ts` | Unitário ✅ |
| CT-03.9 | Chave errada faz `decrypt()` lançar | `encryption.service.ts` | Unitário |

---

### UC-04 — Acessar rota protegida com JWT válido

| | |
|---|---|
| **Ator** | Usuário autenticado |
| **Pré-condições** | JWT válido, não expirado, com `sub` existente em `users` |
| **Pós-condições** | Requisição processada; `req.user` populado com `AuthenticatedUser` |

**Fluxo principal**
1. Cliente envia `Authorization: Bearer <jwt>`.
2. `JwtAuthGuard` verifica que a rota não é `@Public()` e delega ao `JwtStrategy`.
3. Strategy valida assinatura e expiração com `JWT_SECRET`.
4. Strategy busca `payload.sub` via `UsersService.findById()`.
5. Strategy devolve `AuthenticatedUser`, anexado em `req.user`.

**Fluxos alternativos**
- **A1** — Header ausente → `401`.
- **A2** — Token malformado ou assinatura inválida → `401`.
- **A3** — Token expirado → `401` (`ignoreExpiration: false`).
- **A4** — `sub` não existe mais no banco (usuário removido) → `401` com
  "Usuário não encontrado".
- **A5** — Token assinado com outro segredo → `401`.

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-04.1 | `validate()` devolve `AuthenticatedUser` com id/githubId/username/email/avatarUrl | `jwt.strategy.ts` | Unitário |
| CT-04.2 | `validate()` lança `UnauthorizedException` quando `findById()` devolve `null` | `jwt.strategy.ts` | Unitário |
| CT-04.3 | Requisição sem header → `401` | e2e | e2e |
| CT-04.4 | Bearer malformado → `401` | e2e | e2e |
| CT-04.5 | Token expirado → `401` | e2e | e2e |
| CT-04.6 | Token assinado com segredo errado → `401` | e2e | e2e |
| CT-04.7 | Token válido de usuário existente → `200` | e2e | e2e |
| CT-04.8 | Token válido com `sub` inexistente → `401` | e2e | e2e |

---

### UC-05 — Bloquear por padrão toda rota não marcada como pública

| | |
|---|---|
| **Ator** | Sistema (guard global registrado via `APP_GUARD`) |
| **Pré-condições** | Nenhuma |
| **Pós-condições** | Rotas sem `@Public()` exigem JWT — inclusive as criadas no futuro |

**Fluxo principal**
1. Requisição chega em qualquer handler.
2. `JwtAuthGuard.canActivate()` consulta o metadata `isPublic` no handler e na classe.
3. Sem a marcação, delega para `AuthGuard('jwt')`.

**Fluxos alternativos**
- **A1** — `@Public()` na classe → todos os handlers liberados (caso do `AuthController`).
- **A2** — `@Public()` só no handler → apenas aquele endpoint liberado.

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-05.1 | **Corrigir** `app.e2e-spec.ts`: `GET /` sem token agora é `401` | e2e | e2e |
| CT-05.2 | `GET /` com token válido devolve `200` e "Hello World!" | e2e | e2e |
| CT-05.3 | `canActivate()` devolve `true` sem chamar `super` quando `isPublic` é `true` | `jwt-auth.guard.ts` | Unitário |
| CT-05.4 | `canActivate()` delega para `super` quando `isPublic` é `undefined` | `jwt-auth.guard.ts` | Unitário |
| CT-05.5 | `reflector.getAllAndOverride` é consultado com handler **e** classe | `jwt-auth.guard.ts` | Unitário |
| CT-05.6 | `Public()` grava o metadata `isPublic = true` | `public.decorator.ts` | Unitário |
| CT-05.7 | Rota inexistente sob controller protegido → `404`, não vazamento de info | e2e | e2e |
| CT-05.8 | **Teste de regressão estrutural:** varrer os controllers registrados e falhar se algum handler fora do `AuthController` não exigir autenticação | `app.module.ts` | Integração |

> CT-05.8 é o que dá garantia real ao requisito "vale para endpoints futuros". Os demais
> testam o guard; esse testa que ninguém desligou a proteção sem perceber. Sugestão de
> implementação: iterar sobre os controllers via `DiscoveryService` e checar o metadata
> `isPublic` de cada handler contra uma allowlist explícita.

---

### UC-06 — Impedir o boot com configuração inválida

| | |
|---|---|
| **Ator** | Operador / pipeline de deploy |
| **Pré-condições** | Nenhuma |
| **Pós-condições** | Aplicação sobe apenas com todas as variáveis obrigatórias válidas |

**Fluxo principal**
1. `ConfigModule.forRoot()` valida o ambiente com o schema Joi.
2. Com tudo válido, a aplicação inicia.

**Fluxos alternativos**
- **A1** — `ENCRYPTION_KEY` ausente → erro "ENCRYPTION_KEY é obrigatória".
- **A2** — `ENCRYPTION_KEY` com tamanho ≠ 64 → erro de `string.length`.
- **A3** — `ENCRYPTION_KEY` não hexadecimal → erro de `string.hex`.
- **A4** — `JWT_SECRET` com menos de 32 caracteres → erro de `string.min`.
- **A5** — `DATABASE_URL` ausente ou não-URI → erro correspondente.
- **A6** — Múltiplos erros → todos reportados juntos (`abortEarly: false`).

**Casos de teste**

| ID | Descrição | Alvo | Tipo |
|---|---|---|---|
| CT-06.1 | Ambiente completo e válido passa na validação | `env.validation.ts` | Unitário |
| CT-06.2 | Cada variável obrigatória ausente produz a mensagem customizada | `env.validation.ts` | Unitário |
| CT-06.3 | `ENCRYPTION_KEY` com 63 caracteres ou com caractere não-hex é rejeitada | `env.validation.ts` | Unitário |
| CT-06.4 | `JWT_SECRET` curta é rejeitada | `env.validation.ts` | Unitário |
| CT-06.5 | Defaults aplicados: `PORT=3000`, `JWT_EXPIRES_IN=1d`, `NODE_ENV=development` | `env.validation.ts` | Unitário |
| CT-06.6 | Dois erros simultâneos são reportados na mesma mensagem | `env.validation.ts` | Unitário |

> Testar o schema Joi diretamente (`envValidationSchema.validate({...})`) é barato e não
> exige subir a aplicação.

---

## 4. Matriz de rastreabilidade

| Arquivo | Casos de uso | Statements a cobrir | Arquivo de teste |
|---|---|---|---|
| `auth/auth.service.ts` | UC-01 | 11 | `auth.service.spec.ts` (novo) |
| `auth/auth.controller.ts` | UC-01 | 18 | `auth.controller.spec.ts` (novo) |
| `auth/strategies/github.strategy.ts` | UC-01 | 12 | `github.strategy.spec.ts` (novo) |
| `auth/strategies/jwt.strategy.ts` | UC-04 | 14 | `jwt.strategy.spec.ts` (novo) |
| `auth/guards/jwt-auth.guard.ts` | UC-05 | 13 | `jwt-auth.guard.spec.ts` (novo) |
| `auth/decorators/public.decorator.ts` | UC-05 | 5 | `public.decorator.spec.ts` (novo) |
| `auth/github-auth.guard.ts` | UC-01 | 5 | coberto por `auth.controller.spec.ts` |
| `config/env.validation.ts` | UC-06 | 2 | `env.validation.spec.ts` (novo) |
| `users/users.service.ts` | UC-02, UC-03 | 2 restantes | `users.service.spec.ts` ✅ |
| `crypto/encryption.service.ts` | UC-03 | 1 restante | `encryption.service.spec.ts` ✅ |
| `prisma/prisma.service.ts` | — | 3 | `prisma.service.spec.ts` (novo) |
| Fluxo ponta a ponta | UC-04, UC-05 | — | `test/auth.e2e-spec.ts` (novo) |

---

## 5. Plano de execução e projeção

Ordem sugerida, do maior retorno por esforço para o menor:

| Etapa | Entrega | Statements | Cobertura acumulada |
|---|---|---|---|
| 0 | Ajustar `collectCoverageFrom` (§2) | — | 39% |
| 1 | UC-01 unitários (service + strategy + controller) | +41 | 67% |
| 2 | UC-05 unitários (guard + decorator) | +18 | 79% |
| 3 | UC-04 unitários (jwt.strategy) | +14 | **89%** |
| 4 | UC-06 (schema Joi) + `prisma.service` | +5 | 92% |
| 5 | e2e (UC-04/UC-05) + CT-05.8 | — | mantém |

A meta de 80% é atingida na **etapa 3**. As etapas 4 e 5 não são necessárias para o
número, mas a etapa 5 é a que verifica o requisito de segurança de verdade: cobertura
alta em testes unitários com mocks não prova que a aplicação montada bloqueia requisição
nenhuma.

### Infraestrutura necessária para os e2e

Os testes e2e precisam de banco. Duas opções:

1. **Banco de teste real** via `docker compose` (`npm run db:up`) com `DATABASE_URL`
   apontando para um schema separado, limpo entre suítes. Mais fiel, exige serviço no CI.
2. **`PrismaService` sobrescrito** com `overrideProvider` no `TestingModule`. Mais rápido
   e sem dependência externa, mas não valida constraints reais (o `@unique` do `githubId`,
   por exemplo, deixa de ser exercitado).

Recomendação: opção 2 para os e2e de autorização (UC-04/UC-05, que não dependem de
constraint nenhuma) e opção 1 apenas para CT-02.2, que existe justamente para verificar o
comportamento do upsert no banco.

---

## 6. Pontos em aberto

- **`auth/dto/sign-in.dto.ts` é código órfão.** Não há rota de login com usuário e senha —
  a autenticação é exclusivamente via GitHub. O arquivo não deve ganhar testes; deve ser
  removido. Enquanto existir, são 4 statements mortos no denominador.
- **`prisma.service.ts` tem cobertura limitada por natureza.** `onModuleInit`/`onModuleDestroy`
  só chamam `$connect`/`$disconnect`; o teste possível é verificar que são chamados, o que
  tem valor baixo. Aceitável mantê-lo abaixo da meta individual.
- **Não há teste de expiração real do JWT.** CT-04.5 depende de assinar um token com
  `expiresIn: '-1s'`, ou de usar fake timers. Preferir a primeira opção, mais simples.
- **Rotação de `ENCRYPTION_KEY` não é coberta** por um fluxo de reencriptação. O CT-03.9
  documenta o comportamento (conteúdo cifrado com outra chave não é decifrável). Hoje isso
  se resolve sozinho no próximo login do usuário, mas se um dia houver um job que dependa
  do token em background, vale um caso de uso próprio.

---

## 7. Resultado da implementação

Todos os casos de teste do documento foram implementados. Resultado medido:

| Métrica | Meta | Obtido |
|---|---|---|
| Statements | 80% | **97,31%** |
| Branches | 80% | **83,33%** |
| Functions | 80% | **100%** |
| Lines | 80% | **96,77%** |

`npm test` → 78 testes em 12 suítes. `npm run test:e2e` → 16 testes em 2 suítes.

### Arquivos de teste

| Arquivo | Casos de uso |
|---|---|
| `src/auth/auth.service.spec.ts` | UC-01 |
| `src/auth/auth.controller.spec.ts` | UC-01 |
| `src/auth/strategies/github.strategy.spec.ts` | UC-01 |
| `src/auth/strategies/jwt.strategy.spec.ts` | UC-04 |
| `src/auth/guards/jwt-auth.guard.spec.ts` | UC-05 |
| `src/auth/decorators/public.decorator.spec.ts` | UC-05 |
| `src/auth/github-auth.guard.spec.ts` | UC-01 |
| `src/config/env.validation.spec.ts` | UC-06 |
| `src/prisma/prisma.service.spec.ts` | — |
| `src/crypto/encryption.service.spec.ts` | UC-03 |
| `src/users/users.service.spec.ts` | UC-02, UC-03 |
| `test/auth.e2e-spec.ts` | UC-04, UC-05 |
| `test/app.e2e-spec.ts` | UC-05 |

### Por que branches para em 83%

Os 12 branches descobertos são todos do tipo `cond-expr` em **linhas de construtor** —
é o código que o TypeScript emite para decorators de parâmetro (`__decorate`/`__param`),
não lógica da aplicação. Nenhum `if`, `??` ou `||` escrito à mão está descoberto.
Em termos de lógica real, a cobertura de branches é 100%.

### O que impede 100% de statements

Apenas `src/auth/dto/sign-in.dto.ts` (4 statements, 0% coberto) — o código órfão descrito
na §6. Removendo o arquivo, statements e lines vão a 100%.

### Defeito encontrado pelos testes

O CT criado para "cifrar string vazia" reprovou: `EncryptionService.decrypt()` validava
o formato com checagem de falsidade (`!cipherTextPart`), rejeitando o ciphertext
legitimamente vazio de uma string vazia. Corrigido em `encryption.service.ts` para
validar a **quantidade** de partes (`parts.length !== 3`).

### Guarda contra regressão

O `coverageThreshold` de 80% foi adicionado ao `package.json`: `npm run test:cov` falha
se a cobertura cair abaixo da meta.

O CT-05.8 foi validado por mutação — ao marcar temporariamente `AppController.getHello`
com `@Public()`, o teste falhou apontando `"AppController.getHello"`. Ou seja: se alguém
abrir uma rota sem querer, a suíte acusa.
