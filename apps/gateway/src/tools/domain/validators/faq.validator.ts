import type { SchemaValidation } from './types';

export function validate(obj: Record<string, any>): SchemaValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const entities = obj.mainEntity;
  if (!Array.isArray(entities) || entities.length === 0) {
    errors.push('"mainEntity" must be a non-empty array of Question.');
    return { errors, warnings };
  }

  entities.forEach((q: Record<string, any>, i: number) => {
    if (!q?.name) errors.push(`Question ${i + 1} is missing "name".`);
    const answer = q?.acceptedAnswer;
    const answerObj = Array.isArray(answer) ? answer[0] : answer;
    if (!answerObj?.text) {
      errors.push(`Question ${i + 1} is missing "acceptedAnswer.text".`);
    }
  });

  return { errors, warnings };
}
