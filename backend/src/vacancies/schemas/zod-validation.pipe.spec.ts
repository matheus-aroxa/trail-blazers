import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';
import { CreateVacancySchema, VACANCY_MIN_LENGTH, VACANCY_MAX_LENGTH } from './vacancy.schema';

const pipe = new ZodValidationPipe(CreateVacancySchema);

const valid = 'a'.repeat(VACANCY_MIN_LENGTH + 5);

describe('ZodValidationPipe — CreateVacancySchema', () => {
  it('lança BadRequestException quando descrição está vazia', () => {
    expect(() => pipe.transform({ description: '' })).toThrow(BadRequestException);
  });

  it('lança BadRequestException quando descrição é muito curta', () => {
    expect(() => pipe.transform({ description: 'curto' })).toThrow(BadRequestException);
  });

  it('lança BadRequestException quando descrição excede o limite máximo', () => {
    const tooLong = 'x'.repeat(VACANCY_MAX_LENGTH + 1);
    expect(() => pipe.transform({ description: tooLong })).toThrow(BadRequestException);
  });

  it('passa e trimma descrição válida', () => {
    const result = pipe.transform({ description: `  ${valid}  ` });
    expect(result.description).toBe(valid);
    expect(result.description.length).toBe(valid.length);
  });

  it('retorna mensagens de erro legíveis ao falhar', () => {
    expect.assertions(2);

    try {
      pipe.transform({ description: '' });
    } catch (err) {
      const response = (err as BadRequestException).getResponse() as { message: string[] };
      expect(response.message).toBeInstanceOf(Array);
      expect(response.message[0]).toMatch(/ao menos/i);
    }
  });
});
