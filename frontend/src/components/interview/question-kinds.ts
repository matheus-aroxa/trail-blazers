import type { QuestionType } from "@lib/interview-api";

export const questionKinds: Record<
  QuestionType,
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
  code_analysis: {
    label: "Análise de código",
    color: "var(--color-ember-text)",
    background: "--alpha(var(--color-ember-400)/16%)",
  },
};
