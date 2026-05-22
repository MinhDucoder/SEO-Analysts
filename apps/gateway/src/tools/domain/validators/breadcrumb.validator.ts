import type { SchemaValidation } from './types';

export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const items = obj.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('"itemListElement" must be a non-empty array of ListItem.');
    return { errors, warnings };
  }

  items.forEach((it: Record<string, any>, i: number) => {
    if (it?.position == null) warnings.push(`ListItem ${i + 1} is missing "position".`);
    const name = it?.name ?? it?.item?.name;
    if (!name) warnings.push(`ListItem ${i + 1} is missing "name".`);
  });

  return { errors, warnings };
}
