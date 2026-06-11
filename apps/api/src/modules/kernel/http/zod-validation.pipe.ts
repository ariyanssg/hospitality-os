import { type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';
import { ValidationError } from '../errors/domain-errors';

/**
 * Validation at the boundary only (doc 14 §2). The SAME Zod schema validates the API request and
 * the frontend form. On failure → 422 VALIDATION_FAILED with per-field errors straight from Zod.
 */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => ({
        field: i.path.join('.') || undefined,
        code: i.code.toUpperCase(),
      }));
      throw new ValidationError('One or more fields are invalid', fieldErrors);
    }
    return result.data;
  }
}
