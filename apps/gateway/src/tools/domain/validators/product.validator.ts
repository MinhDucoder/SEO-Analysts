import type { SchemaValidation } from './types';

export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!obj.name) errors.push('Missing required "name".');
  if (!obj.image) warnings.push('Recommended "image" is missing.');

  if (!obj.offers) {
    warnings.push('Recommended "offers" is missing.');
  } else {
    const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offers && !offers.price && !offers.lowPrice) {
      warnings.push('"offers" is present but has no "price".');
    }
    if (offers && offers.price && !offers.priceCurrency) {
      warnings.push('"offers.price" present without "priceCurrency".');
    }
  }

  return { errors, warnings };
}
