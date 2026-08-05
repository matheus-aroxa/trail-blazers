import type { ParsedVacancyProfile } from "./vacancies-api";

const VACANCY_KEY = "interviewtrail.vacancy";
const REPOSITORY_KEY = "interviewtrail.repository";

export interface VacancyDraft {
  id: string;
  description: string;
  profile?: ParsedVacancyProfile | null;
}

export interface RepositoryDraft {
  owner: string;
  name: string;
  language: string | null;
  fileCount: number;
  omittedCount: number;
  topFiles: string[];
  excerptPath?: string;
  excerpt?: string;
}

function read<T>(key: string, isValid: (value: unknown) => boolean): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function remove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

export function readVacancyDraft(): VacancyDraft | null {
  return read<VacancyDraft>(VACANCY_KEY, (value) => {
    const draft = value as Partial<VacancyDraft> | null;
    return (
      typeof draft?.id === "string" && typeof draft.description === "string"
    );
  });
}

export function writeVacancyDraft(draft: VacancyDraft): void {
  write(VACANCY_KEY, draft);
}

export function clearVacancyDraft(): void {
  remove(VACANCY_KEY);
  remove(REPOSITORY_KEY);
}

export function readRepositoryDraft(): RepositoryDraft | null {
  return read<RepositoryDraft>(REPOSITORY_KEY, (value) => {
    const draft = value as Partial<RepositoryDraft> | null;
    return typeof draft?.owner === "string" && typeof draft.name === "string";
  });
}

export function writeRepositoryDraft(draft: RepositoryDraft): void {
  write(REPOSITORY_KEY, draft);
}

export function clearRepositoryDraft(): void {
  remove(REPOSITORY_KEY);
}
