import { z } from 'zod';

export const CreateSessionSchema = z.object({
  vacancyId: z.string().uuid('vacancyId inválido.'),
  owner: z.string().min(1, 'owner é obrigatório.'),
  repo: z.string().min(1, 'repo é obrigatório.'),
  questionCount: z.number().int().min(4).max(12).default(8),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;

export const SubmitAnswerSchema = z.object({
  questionId: z.string().uuid('questionId inválido.'),
  content: z.string().min(1, 'A resposta não pode ficar em branco.').max(5000),
});

export type SubmitAnswerDto = z.infer<typeof SubmitAnswerSchema>;

export const QuestionTypeSchema = z.enum(['logic', 'scenario', 'project', 'code_analysis']);

export const AiQuestionSchema = z.object({
  type: QuestionTypeSchema,
  content: z.string().min(10),
  codeFile: z.string().optional(),
  codeExcerpt: z.string().max(4000).optional(),
});

export const AiQuestionsResponseSchema = z.object({
  questions: z.array(AiQuestionSchema).min(1).max(12),
});

export type AiQuestion = z.infer<typeof AiQuestionSchema>;

export const AiReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  adherenceScore: z.number().min(0).max(100),
  dimensionScores: z
    .array(z.object({ label: z.string(), score: z.number().min(0).max(100) }))
    .min(1)
    .max(8),
  strengths: z.array(z.object({ title: z.string(), text: z.string() })).max(6).default([]),
  gaps: z.array(z.object({ title: z.string(), text: z.string() })).max(6).default([]),
  recommendations: z
    .array(z.object({ title: z.string(), text: z.string() }))
    .max(6)
    .default([]),
});

export type AiReport = z.infer<typeof AiReportSchema>;
