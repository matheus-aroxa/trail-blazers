/**
 * Dados fictícios das telas ainda não implementadas (entrevista e relatório) e
 * do histórico do dashboard. Existem só para dar um fluxo navegável de ponta a
 * ponta enquanto os épicos reais não chegam — nada aqui vem do backend. Toda
 * tela que consome este arquivo exibe o MockBanner.
 *
 * A etapa da vaga saiu daqui: ela grava de verdade via POST /vacancies.
 */

export interface MockSession {
  id: string;
  title: string;
  subtitle: string;
  score: number;
  adherence: number;
}

export const mockSessions: MockSession[] = [
  {
    id: "acme",
    title: "Full-Stack Júnior — Acme",
    subtitle: "14 jul 2026 · 8 perguntas",
    score: 78,
    adherence: 72,
  },
  {
    id: "lumen",
    title: "Frontend Júnior (React) — Lumen Labs",
    subtitle: "02 jul 2026 · 8 perguntas",
    score: 84,
    adherence: 81,
  },
  {
    id: "kata",
    title: "Backend Júnior (Node.js) — Kata Pay",
    subtitle: "24 jun 2026 · 10 perguntas",
    score: 65,
    adherence: 58,
  },
  {
    id: "nortec",
    title: "Dev Júnior — Nortec Sistemas",
    subtitle: "15 jun 2026 · 6 perguntas",
    score: 71,
    adherence: 66,
  },
];

export const mockSessionsSummary =
  "4 entrevistas · média 74/100 · melhor 84 · última há 2 dias";

export type QuestionKind = "logic" | "scenario" | "project" | "code";

export const questionKinds: Record<
  QuestionKind,
  { label: string; color: string; background: string }
> = {
  logic: {
    label: "Lógica",
    color: "var(--color-q-logic)",
    background: "--alpha(var(--color-q-logic)/15%)",
  },
  scenario: {
    label: "Cenário",
    color: "var(--color-q-scenario)",
    background: "--alpha(var(--color-q-scenario)/15%)",
  },
  project: {
    label: "Projeto",
    color: "var(--color-trail-text)",
    background: "--alpha(var(--color-trail-500)/15%)",
  },
  code: {
    label: "Análise de código",
    color: "var(--color-ember-text)",
    background: "--alpha(var(--color-ember-400)/16%)",
  },
};

export interface MockMessage {
  from: "ai" | "user";
  kind?: QuestionKind;
  text: string;
  codeFile?: string;
  code?: string;
}

/** Mensagens já na tela quando a entrevista abre (perguntas 1 a 3). */
export const seedMessages: MockMessage[] = [
  {
    from: "ai",
    text: "Olá! Preparei 8 perguntas para a vaga de Full-Stack Júnior na Acme, com base no repositório que você escolheu. Sem pressão: não existe resposta perfeita, e no final você recebe um diagnóstico honesto. Vamos?",
  },
  {
    from: "ai",
    kind: "logic",
    text: "Para aquecer, em TypeScript: qual a diferença prática entre interface e type — e quando você escolheria cada um?",
  },
  {
    from: "user",
    text: "Uso interface para contratos de objeto que podem ser estendidos e type para uniões e tipos utilitários. Na prática, interface quando penso em contrato e type quando preciso compor.",
  },
  {
    from: "ai",
    kind: "scenario",
    text: "Boa. Agora um cenário: você deu deploy na sexta e o time reporta erro 500 em produção. Quais são seus três primeiros passos?",
  },
  {
    from: "user",
    text: "Primeiro olho logs e monitoramento para entender o erro. Se o impacto for alto, faço rollback imediato. Depois reproduzo localmente com os mesmos dados e aviso o time no canal do incidente.",
  },
  {
    from: "ai",
    kind: "code",
    codeFile: "api-ecommerce · src/routes/orders.js",
    code: `router.get('/orders', async (req, res) => {
  const orders = await Order.find({ userId: req.user.id });
  for (const order of orders) {
    order.items = await Item.find({ orderId: order.id });
  }
  res.json(orders);
});`,
    text: "Encontrei este trecho no seu repositório. Uma consulta ao banco para cada pedido — o clássico N+1. O que te levou a essa abordagem, e como você a otimizaria se a base crescesse para milhares de pedidos?",
  },
];

/** Perguntas 4 a 8, liberadas conforme o usuário responde. */
export const queuedQuestions: MockMessage[] = [
  {
    from: "ai",
    kind: "project",
    text: "Seus commits mostram uma migração de Create React App para Next.js. Que problema concreto motivou a migração — e o que você ganhou de verdade com ela?",
  },
  {
    from: "ai",
    kind: "logic",
    text: "Pensando no seu backend: dois pedidos chegam ao mesmo tempo para o último item do estoque. Como você evita vender o mesmo produto duas vezes?",
  },
  {
    from: "ai",
    kind: "scenario",
    text: "Seu tech lead pede uma estimativa para algo que você nunca fez: upload de imagens com redimensionamento. Como você responde?",
  },
  {
    from: "ai",
    kind: "project",
    text: "Um dos seus projetos guarda tudo em localStorage. Que limites dessa escolha você conhece — e em que momento valeria trocar por um backend?",
  },
  {
    from: "ai",
    kind: "scenario",
    text: "Última! Em um code review, uma dev sênior discorda de uma decisão sua — e você acha que tem razão. Como conduz a conversa?",
  },
];

export const closingMessage: MockMessage = {
  from: "ai",
  text: "É isso — entrevista concluída! Analisei suas respostas contra a vaga da Acme e seu relatório está pronto. Spoiler: você foi melhor do que imagina.",
};

export const TOTAL_QUESTIONS = 8;
/** Índice da pergunta já na tela quando a entrevista abre. */
export const FIRST_QUESTION_INDEX = 3;

/** Respostas de exemplo, por número da pergunta, para o botão de preencher. */
export const sampleAnswers: Record<number, string> = {
  3: "Na época priorizei clareza, mas hoje vejo o N+1. Faria uma única consulta de itens com $in nos ids dos pedidos (ou um aggregate) e adicionaria paginação no endpoint.",
  4: "Precisava de SEO nas páginas do blog e as imagens estavam pesadas. Com Next ganhei SSG e next/image — o LCP caiu bastante. O custo foi migrar rotas e variáveis de ambiente.",
  5: "Evitaria ler-modificar-gravar em memória. Usaria um update atômico com condição (estoque >= quantidade) ou uma transação com lock, e devolveria um erro claro se o estoque acabou.",
  6: "Digo que nunca fiz e que a estimativa vem com incerteza. Quebro em partes (upload, storage, resize, testes), faço um spike de meio dia e volto com uma faixa e os riscos.",
  7: "localStorage é síncrono, tem uns 5MB e vive num único navegador — sem sync nem colaboração. Migraria quando precisasse de login ou de acessar as tarefas de outro aparelho.",
  8: "Peço o racional dela primeiro. Trago dados ou exemplos do porquê da minha escolha e busco um critério objetivo (padrão do repo, performance, legibilidade). Sem consenso, sigo o padrão do time e documento.",
};

export const mockReport = {
  score: 78,
  eyebrow: "Relatório · Full-Stack Júnior — Acme · 14 jul 2026",
  headline: "Você está mais perto do que pensa.",
  summary:
    "Desempenho acima da média para vagas júnior. Nada aqui é veredito — é um mapa do que praticar antes da entrevista de verdade.",
  adherence: 72,
  adherenceNotes: [
    {
      tone: "good" as const,
      title: "Aproxima:",
      text: "React, Node.js e TypeScript aparecem com força no seu repositório.",
    },
    {
      tone: "gap" as const,
      title: "Falta:",
      text: "PostgreSQL — a vaga pede SQL relacional e seu portfólio ainda não mostra isso.",
    },
  ],
  dimensions: [
    { label: "Lógica", score: 82 },
    { label: "Domínio da stack", score: 74 },
    { label: "Qualidade das decisões", score: 68 },
    { label: "Comunicação", score: 88 },
  ],
  strengths: [
    {
      title: "Comunicação clara.",
      text: "Você explica trade-offs sem rodeios — exatamente o que entrevistadores procuram.",
    },
    {
      title: "Instinto de depuração.",
      text: "No incidente do /orders você seguiu a ordem certa: logs → rollback → causa raiz.",
    },
    {
      title: "TypeScript sólido.",
      text: "A distinção interface × type veio precisa e com exemplos próprios.",
    },
  ],
  gaps: [
    {
      title: "Consultas N+1.",
      text: "Você reconheceu o problema, mas a solução com $in demorou a aparecer.",
    },
    {
      title: "SQL relacional.",
      text: "A vaga pede PostgreSQL e nenhum projeto seu usa banco relacional hoje.",
    },
    {
      title: "Concorrência.",
      text: "A resposta sobre estoque ficou na ideia geral, sem transações ou locks concretos.",
    },
  ],
  recommendations: [
    {
      title: "Refatore o /orders.",
      text: "Elimine o N+1 e cite a melhoria na entrevista — história pronta de evolução.",
    },
    {
      title: "Um projeto com PostgreSQL.",
      text: "Migrar um projeto para SQL cobre o requisito num fim de semana.",
    },
    {
      title: "Fale em voz alta.",
      text: "Pratique explicar transações e locks 10 minutos por dia até a entrevista.",
    },
  ],
};
