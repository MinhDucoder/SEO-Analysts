import type { SchemaValidation } from './types';

// Handles Article, NewsArticle, BlogPosting.
export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!obj.headline) {
    errors.push('Missing required "headline".');
  } else if (typeof obj.headline === 'string' && obj.headline.length > 110) {
    warnings.push('"headline" exceeds 110 characters; Google may truncate it.');
  }
  if (!obj.image) warnings.push('Recommended "image" is missing.');
  if (!obj.datePublished) warnings.push('Recommended "datePublished" is missing.');
  if (!obj.author) warnings.push('Recommended "author" is missing.');

  return { errors, warnings };
}
