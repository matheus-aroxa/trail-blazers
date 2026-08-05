export type RepositorySummary = {
  id: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  visibility: 'public' | 'private';
};
