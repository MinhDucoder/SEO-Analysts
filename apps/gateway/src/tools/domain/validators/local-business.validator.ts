import type { SchemaValidation } from './types';

export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!obj.name) errors.push('Missing required "name".');
  if (!obj.address) errors.push('Missing required "address".');
  if (!obj.telephone) warnings.push('Recommended "telephone" is missing.');
  if (!obj.openingHours && !obj.openingHoursSpecification) {
    warnings.push('Recommended opening hours are missing.');
  }

  return { errors, warnings };
}
