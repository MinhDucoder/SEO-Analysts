import Handlebars from 'handlebars';
import { PromptError } from '../errors/index.js';

export function renderTemplate(source: string, vars: Record<string, unknown>): string {
  let compiled: HandlebarsTemplateDelegate;
  try {
    compiled = Handlebars.compile(source, { strict: true, noEscape: false });
  } catch (err) {
    throw new PromptError(`Handlebars compile failed: ${(err as Error).message}`, { cause: err });
  }
  try {
    return compiled(vars);
  } catch (err) {
    throw new PromptError(`Handlebars render failed: ${(err as Error).message}`, { cause: err });
  }
}
