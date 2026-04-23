export type EnrichMode = 'off' | 'template' | 'llm';
export type Language = 'vi' | 'en';
export type Format = 'pretty' | 'json';
export type FailOn = 'error' | 'warning' | 'info';
export type InputMode = 'markdown' | 'html';

export interface ParsedArgs {
  url?: string;
  file?: string;
  mode?: InputMode;
  keyword: string;
  secondary: string[];
  enrich: EnrichMode;
  language: Language;
  format: Format;
  failOn?: FailOn;
  minScore?: number;
  apiKey: string;
  apiBase: string;
}

export type ValidationResult =
  | { ok: true; args: ParsedArgs }
  | { ok: false; error: string };

const FAIL_ON: readonly FailOn[] = ['error', 'warning', 'info'] as const;
const ENRICH: readonly EnrichMode[] = ['off', 'template', 'llm'] as const;
const LANG: readonly Language[] = ['vi', 'en'] as const;
const FORMAT: readonly Format[] = ['pretty', 'json'] as const;
const MODE: readonly InputMode[] = ['markdown', 'html'] as const;

export function validateArgs(args: ParsedArgs): ValidationResult {
  if (!args.apiKey || args.apiKey.trim().length === 0) {
    return { ok: false, error: 'Missing API key. Pass --api-key or --env SEO_API_KEY.' };
  }
  const hasUrl = typeof args.url === 'string' && args.url.length > 0;
  const hasFile = typeof args.file === 'string' && args.file.length > 0;
  if (!hasUrl && !hasFile) {
    return { ok: false, error: 'Provide --url or --file.' };
  }
  if (hasUrl && hasFile) {
    return { ok: false, error: 'Provide exactly one of --url or --file.' };
  }
  if (hasFile && !args.mode) {
    return { ok: false, error: '--file requires --mode markdown|html.' };
  }
  if (args.mode && !MODE.includes(args.mode)) {
    return { ok: false, error: `Invalid --mode (must be one of: ${MODE.join('|')}).` };
  }
  if (!args.keyword || args.keyword.trim().length === 0) {
    return { ok: false, error: 'Missing --keyword.' };
  }
  if (!ENRICH.includes(args.enrich)) {
    return { ok: false, error: `Invalid --enrich (must be one of: ${ENRICH.join('|')}).` };
  }
  if (!LANG.includes(args.language)) {
    return { ok: false, error: `Invalid --language (must be one of: ${LANG.join('|')}).` };
  }
  if (!FORMAT.includes(args.format)) {
    return { ok: false, error: `Invalid --format (must be one of: ${FORMAT.join('|')}).` };
  }
  if (args.failOn !== undefined && !FAIL_ON.includes(args.failOn)) {
    return { ok: false, error: `Invalid --fail-on (must be one of: ${FAIL_ON.join('|')}).` };
  }
  if (
    args.minScore !== undefined &&
    (Number.isNaN(args.minScore) || args.minScore < 0 || args.minScore > 100)
  ) {
    return { ok: false, error: '--min-score must be an integer in [0, 100].' };
  }
  return { ok: true, args };
}
