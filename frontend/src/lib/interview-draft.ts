/**
 * Vaga salva na etapa 1, guardada para as etapas seguintes do fluxo.
 *
 * Fica no sessionStorage (e não em estado de rota) porque a pessoa pode
 * recarregar a página no meio do fluxo, e vive só na aba: cada aba monta uma
 * entrevista independente. Quando existir o endpoint de sessões, o id da
 * sessão substitui isso.
 */

const STORAGE_KEY = "interviewtrail.vacancy";

export interface VacancyDraft {
  id: string;
  description: string;
}

export function readVacancyDraft(): VacancyDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<VacancyDraft>;

    return typeof parsed.id === "string" && typeof parsed.description === "string"
      ? { id: parsed.id, description: parsed.description }
      : null;
  } catch {
    // Storage bloqueado ou conteúdo corrompido: a etapa 1 pede a vaga de novo.
    return null;
  }
}

export function writeVacancyDraft(draft: VacancyDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // O fluxo continua nesta navegação; só não sobrevive a um reload.
  }
}

export function clearVacancyDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada a fazer — quem chamou já seguiu em frente.
  }
}
