import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';
import { CheckStatus, CoreWebVitals } from '@repo/shared';
import { BrowserPool } from './browser-pool';
import {
  AnalyzeResult,
  AnalyzeRuleResult,
  AnalyzeCategoryScore,
} from '../../report/domain/analyze-result.interface';
import { KeywordResultItem } from '../../report/domain/keyword-result.interface';

export interface PdfRenderInput {
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;
  classification: string;
  analyze: AnalyzeResult;
  keywords: KeywordResultItem[];
  cwv: CoreWebVitals;
  categoryScores: AnalyzeCategoryScore[];
}

export interface PdfRenderOutput {
  pdf: Buffer;
  filename: string;
}

@Injectable()
export class PdfGenerator {
  private readonly logger = new Logger(PdfGenerator.name);
  private readonly template: HandlebarsTemplateDelegate;
  private readonly css: string;

  constructor(private readonly pool: BrowserPool) {
    const tmplPath = join(__dirname, 'templates', 'report.hbs');
    const cssPath = join(__dirname, 'templates', 'report.css');
    this.template = Handlebars.compile(readFileSync(tmplPath, 'utf-8'));
    this.css = readFileSync(cssPath, 'utf-8');
  }

  async generate(input: PdfRenderInput): Promise<PdfRenderOutput> {
    const html = this.renderHtml(input);
    const browser = this.pool.acquire();
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
      });
      await page.close();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `seo-report-${input.domain}-${date}.pdf`;
      return { pdf, filename };
    } finally {
      await context.close();
    }
  }

  private renderHtml(input: PdfRenderInput): string {
    const topIssues = input.analyze.ruleResults
      .filter((r) => r.status === CheckStatus.FAIL)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    const grouped = new Map<string, AnalyzeRuleResult[]>();
    for (const r of input.analyze.ruleResults) {
      const arr = grouped.get(r.category) ?? [];
      arr.push(r);
      grouped.set(r.category, arr);
    }
    const rulesByCategory = Array.from(grouped.entries()).map(([category, rules]) => ({
      category,
      rules,
    }));

    return this.template({
      url: input.url,
      domain: input.domain,
      finalScore: input.finalScore,
      classification: input.classification,
      generatedAt: new Date().toISOString(),
      css: this.css,
      topIssues,
      categoryScores: input.categoryScores,
      cwv: input.cwv,
      rulesByCategory,
      topKeywords: input.keywords.slice(0, 20),
    });
  }
}
