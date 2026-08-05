import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ZodType, TypeOf } from 'zod';

@Injectable()
export class ZodValidationPipe<T extends ZodType> implements PipeTransform<unknown, TypeOf<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): TypeOf<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: messages,
      });
    }

    return result.data as TypeOf<T>;
  }
}
