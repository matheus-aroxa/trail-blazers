import { z } from 'zod';

export const VACANCY_MIN_LENGTH = 50;
export const VACANCY_MAX_LENGTH = 10_000;

export const SeniorityLevelSchema = z.enum([
  'intern',
  'trainee',
  'junior',
  'mid',
  'senior',
  'lead',
  'unknown',
]);

export const ParsingConfidenceSchema = z.enum(['high', 'low']);

/**
 * Estado do processo de análise — responde apenas "já terminou?".
 * O que a análise descobriu fica no parsedProfile.
 */
export const ParseStatusSchema = z.enum(['pending', 'done', 'failed']);

export type SeniorityLevel = z.infer<typeof SeniorityLevelSchema>;
export type ParsingConfidence = z.infer<typeof ParsingConfidenceSchema>;
export type ParseStatus = z.infer<typeof ParseStatusSchema>;

export const ParsedVacancyProfileSchema = z.object({
  technologies: z.array(z.string()),
  seniorityLevel: SeniorityLevelSchema,
  keyCompetencies: z.array(z.string()),
  confidence: ParsingConfidenceSchema,
  outOfScope: z.boolean(),
});

export type ParsedVacancyProfile = z.infer<typeof ParsedVacancyProfileSchema>;

export const AiResponseSchema = z
  .object({
    technologies: z.array(z.string()).max(15).default([]),
    seniorityLevel: SeniorityLevelSchema.catch('unknown'),
    keyCompetencies: z.array(z.string()).max(10).default([]),
    confidence: ParsingConfidenceSchema.default('high'),
    outOfScope: z.boolean().default(false),
  })
  .transform((data) => ({
    ...data,
    confidence: data.technologies.length === 0 ? ('low' as const) : data.confidence,
  }));

export const CreateVacancySchema = z.object({
  description: z
    .string({ required_error: 'A descrição da vaga é obrigatória.' })
    .min(VACANCY_MIN_LENGTH, `A descrição deve ter ao menos ${VACANCY_MIN_LENGTH} caracteres.`)
    .max(VACANCY_MAX_LENGTH, `A descrição não pode exceder ${VACANCY_MAX_LENGTH} caracteres.`)
    .transform((val) => val.trim()),
});

export type CreateVacancyDto = z.infer<typeof CreateVacancySchema>;

export interface VacancyResponse {
  id: string;
  userId: string;
  rawDescription: string;
  parsedProfile: ParsedVacancyProfile | null;
  parseStatus: ParseStatus;
  parseFailureReason: string | null;
  /** Derivado de parseStatus. Mantido porque o frontend usa como fim do polling. */
  parsingCompleted: boolean;
  createdAt: Date;
}
