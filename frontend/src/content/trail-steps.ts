export interface TrailStep {
  number: string;
  title: string;
  description: string;
  tone: "trail" | "ember";
}

export const trailSteps: TrailStep[] = [
  {
    number: "01",
    title: "Cole a vaga",
    description:
      "A IA lê a descrição e extrai stack, senioridade e competências-chave.",
    tone: "trail",
  },
  {
    number: "02",
    title: "Escolha seus repositórios",
    description:
      "Você decide quais projetos entram na análise. Até 3 por sessão — nada é publicado.",
    tone: "trail",
  },
  {
    number: "03",
    title: "Faça a entrevista",
    description:
      "Perguntas sob medida, no seu ritmo. No final, um relatório honesto do que praticar.",
    tone: "ember",
  },
];
