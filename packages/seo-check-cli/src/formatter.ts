import chalk from 'chalk';
import type { PublicCheckResponse, IssueOut } from './client.js';
import type { FailOn } from './args.js';

const SEVERITY_ORDER: Record<'info' | 'warning' | 'error', number> = {
  info: 0,
  warning: 1,
  error: 2,
};

const SEVERITY_THRESHOLD: Record<FailOn, number> = {
  error: SEVERITY_ORDER.error,
  warning: SEVERITY_ORDER.warning,
  info: SEVERITY_ORDER.info,
};

export interface GateInput {
  response: PublicCheckResponse;
  failOn: FailOn | undefined;
  minScore: number | undefined;
}

export type GateResult =
  | { pass: true }
  | { pass: false; reason: string };

export function evaluateGate(g: GateInput): GateResult {
  if (typeof g.minScore === 'number' && g.response.score < g.minScore) {
    return {
      pass: false,
      reason: `score ${g.response.score} < --min-score ${g.minScore}`,
    };
  }
  if (g.failOn) {
    const threshold = SEVERITY_THRESHOLD[g.failOn];
    const offending = g.response.issues.find(
      (i) => SEVERITY_ORDER[i.severity] >= threshold,
    );
    if (offending) {
      return {
        pass: false,
        reason: `--fail-on ${g.failOn} tripped by rule ${offending.ruleId} (${offending.severity})`,
      };
    }
  }
  return { pass: true };
}

function severityColor(sev: 'info' | 'warning' | 'error'): (s: string) => string {
  switch (sev) {
    case 'error':
      return chalk.red.bold;
    case 'warning':
      return chalk.yellow.bold;
    case 'info':
      return chalk.cyan;
  }
}

export function renderPretty(response: PublicCheckResponse): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold(`SEO score: ${chalk.cyan(response.score)}/100`));
  lines.push(
    chalk.dim(
      `  rule v${response.meta.ruleVersion} · ${response.meta.enrichMode} · ${response.meta.processingTimeMs}ms` +
        (response.meta.degraded ? chalk.yellow(' · degraded') : '') +
        (response.meta.cached ? chalk.dim(' · cached') : ''),
    ),
  );

  const breakdown = Object.entries(response.scoreBreakdown);
  if (breakdown.length) {
    lines.push('');
    lines.push(chalk.bold('Breakdown'));
    for (const [cat, score] of breakdown) {
      const bar = '█'.repeat(Math.max(1, Math.round(score / 5))).padEnd(20, ' ');
      lines.push(`  ${cat.padEnd(14)} ${chalk.cyan(bar)} ${score}`);
    }
  }

  if (response.issues.length === 0) {
    lines.push('');
    lines.push(chalk.green('No issues.'));
  } else {
    lines.push('');
    lines.push(chalk.bold(`Issues (${response.issues.length})`));
    for (const issue of response.issues) renderIssue(issue, lines);
  }

  lines.push('');
  lines.push(
    chalk.dim(
      `Usage: ${response.meta.usage.remaining.minute}/min · ${response.meta.usage.remaining.day}/day · req=${response.meta.requestId}`,
    ),
  );
  lines.push('');
  return lines.join('\n');
}

function renderIssue(issue: IssueOut, out: string[]): void {
  const color = severityColor(issue.severity);
  const tag = color(`[${issue.severity.toUpperCase()}]`);
  out.push(`  ${tag} ${chalk.bold(issue.title)} ${chalk.dim('(' + issue.ruleId + ')')}`);
  out.push(`    ${chalk.dim(issue.category + ' · ' + issue.audience.join(','))}`);
  out.push(`    ${issue.description}`);
  if (issue.suggestion) {
    out.push(
      `    ${chalk.green('→')} ${chalk.italic(issue.suggestion.text)}`,
    );
    if (issue.suggestion.rationale) {
      out.push(`      ${chalk.dim(issue.suggestion.rationale)}`);
    }
  }
}

export function renderJson(response: PublicCheckResponse): string {
  return JSON.stringify(response, null, 2);
}
