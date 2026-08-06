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
