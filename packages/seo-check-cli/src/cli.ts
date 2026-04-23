#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  validateArgs,
  type EnrichMode,
  type FailOn,
  type Format,
  type InputMode,
  type Language,
} from './args.js';
import {
  SeoApiError,
  SeoClient,
  type PublicCheckRequest,
} from './client.js';
import { evaluateGate, renderJson, renderPretty } from './formatter.js';

interface CliOpts {
  url?: string;
  file?: string;
  mode?: string;
  keyword?: string;
  secondary?: string;
  enrich?: string;
  language?: string;
  format?: string;
  failOn?: string;
  minScore?: string;
  apiKey?: string;
  apiBase?: string;
  env?: string;
}

export async function runCli(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('seo-check')
    .description('SEO Analyst Public API CLI')
    .option('--url <url>', 'URL to analyze')
    .option('--file <path>', 'Path to markdown or HTML file')
    .option('--mode <markdown|html>', 'File mode when --file is used')
    .option('--keyword <kw>', 'Target keyword (required)')
    .option('--secondary <csv>', 'Secondary keywords (comma-separated, ≤5)')
    .option('--enrich <off|template|llm>', 'Enrichment mode', 'llm')
    .option('--language <vi|en>', 'Suggestion language', 'vi')
    .option('--format <pretty|json>', 'Output format', 'pretty')
    .option('--fail-on <error|warning|info>', 'CI gate: exit 1 if any issue at/above severity')
    .option('--min-score <n>', 'CI gate: exit 1 if score below N')
    .option('--api-key <key>', 'API key (sk_live_…|sk_test_…)')
    .option('--env <VAR>', 'Read API key from env var (opt-in)', 'SEO_API_KEY')
    .option('--api-base <url>', 'Gateway base URL', 'http://localhost:3000/api/v1')
    .parse(argv, { from: 'user' });

  const opts = program.opts<CliOpts>();

  const apiKey = opts.apiKey ?? (opts.env ? process.env[opts.env] : undefined) ?? '';
  const validation = validateArgs({
    url: opts.url,
    file: opts.file,
    mode: opts.mode as InputMode | undefined,
    keyword: opts.keyword ?? '',
    secondary: (opts.secondary ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    enrich: (opts.enrich as EnrichMode | undefined) ?? 'llm',
    language: (opts.language as Language | undefined) ?? 'vi',
    format: (opts.format as Format | undefined) ?? 'pretty',
    failOn: opts.failOn as FailOn | undefined,
    minScore: opts.minScore !== undefined ? Number(opts.minScore) : undefined,
    apiKey,
    apiBase: opts.apiBase ?? 'http://localhost:3000/api/v1',
  });

  if (!validation.ok) {
    process.stderr.write(chalk.red(`error: ${validation.error}\n`));
    return 3;
  }

  const args = validation.args;
  let body: PublicCheckRequest;
  if (args.url) {
    body = {
      input: { type: 'url', url: args.url },
      targetKeyword: args.keyword,
      secondaryKeywords: args.secondary.slice(0, 5),
      options: { enrichMode: args.enrich, language: args.language },
    };
  } else {
    let text: string;
    try {
      text = await readFile(args.file!, 'utf8');
    } catch (err) {
      process.stderr.write(
        chalk.red(`error: cannot read --file ${args.file}: ${err instanceof Error ? err.message : String(err)}\n`),
      );
      return 3;
    }
    body = {
      input:
        args.mode === 'html'
          ? { type: 'html', html: text }
          : { type: 'markdown', markdown: text },
      targetKeyword: args.keyword,
      secondaryKeywords: args.secondary.slice(0, 5),
      options: { enrichMode: args.enrich, language: args.language },
    };
  }

  const client = new SeoClient({ apiBase: args.apiBase, apiKey: args.apiKey });
  let response;
  try {
    response = await client.check(body);
  } catch (err) {
    if (err instanceof SeoApiError) {
      process.stderr.write(
        chalk.red(`error (${err.status}${err.code ? ' ' + err.code : ''}): ${err.message}\n`),
      );
    } else {
      process.stderr.write(
        chalk.red(`error: ${err instanceof Error ? err.message : String(err)}\n`),
      );
    }
    return 2;
  }

  if (args.format === 'json') {
    process.stdout.write(renderJson(response) + '\n');
  } else {
    process.stdout.write(renderPretty(response));
  }

  const gate = evaluateGate({
    response,
    failOn: args.failOn,
    minScore: args.minScore,
  });
  if (!gate.pass) {
    process.stderr.write(chalk.yellow(`gate tripped: ${gate.reason}\n`));
    return 1;
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).then((code) => process.exit(code));
}
