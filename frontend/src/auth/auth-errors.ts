const messages: Record<string, string> = {
  access_denied:
    "Você cancelou a autorização no GitHub. Para usar o InterviewTrail precisamos ler os repositórios que você escolher.",
  sem_token:
    "O GitHub não devolveu uma sessão válida. Tente entrar novamente em alguns instantes.",
  token_invalido:
    "A sessão recebida não pôde ser validada. Tente entrar novamente.",
};

const fallback =
  "Não foi possível concluir o login com o GitHub. Tente novamente.";

export function authErrorMessage(code: string | null): string | null {
  if (!code) {
    return null;
  }

  return messages[code] ?? fallback;
}
