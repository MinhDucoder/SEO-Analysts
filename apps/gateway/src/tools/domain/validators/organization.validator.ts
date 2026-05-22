import type { SchemaValidation } from './types';

export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!obj.name) errors.push('Missing required "name".');
  if (!obj.url) warnings.push('Recommended "url" is missing.');
  if (!obj.logo) warnings.push('Recommended "logo" is missing.');

  return { errors, warnings };
}
