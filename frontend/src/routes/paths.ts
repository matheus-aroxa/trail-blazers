export const paths = {
  landing: "/",
  inProgress: "/em-desenvolvimento",

  login: "/login",
  /** Destino do redirect do backend após o OAuth (FRONTEND_URL + esta rota). */
  authCallback: "/auth/success",
  dashboard: "/dashboard",

  /**
   * Fluxo de criação de entrevista, em quatro etapas. As etapas de vaga
   * (POST /vacancies) e de repositórios (GET /repositories) falam com o
   * backend; a entrevista e o relatório seguem mocks navegáveis enquanto os
   * épicos correspondentes não existem.
   */
  newInterview: "/entrevista/vaga",
  repoChooser: "/entrevista/repositorios",
  interview: "/entrevista/conversa",
  report: "/entrevista/relatorio",
} as const;

export const sectionIds = {
  howItWorks: "como-funciona",
} as const;
