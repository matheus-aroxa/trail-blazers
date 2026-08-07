export const paths = {
  landing: "/",
  inProgress: "/em-desenvolvimento",

  login: "/login",
  authCallback: "/auth/success",
  dashboard: "/dashboard",

  newInterview: "/entrevista/vaga",
  repoChooser: "/entrevista/repositorios",
  interview: "/entrevista/conversa",
  report: "/entrevista/relatorio",
} as const;

export function reportPath(sessionId?: string): string {
  return sessionId ? `${paths.report}/${sessionId}` : paths.report;
}

export const sectionIds = {
  howItWorks: "como-funciona",
} as const;
