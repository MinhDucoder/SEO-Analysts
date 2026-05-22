import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { LiteFetcherService } from './lite-fetcher.service';
import {
  SchemaBlock,
  SchemaPreviewResponse,
  SchemaPreviewWarning,
} from '../dto/schema-preview.dto';
import type { SchemaValidator } from '../domain/validators/types';
import { validate as articleValidate } from '../domain/validators/article.validator';
import { validate as productValidate } from '../domain/validators/product.validator';
import { validate as faqValidate } from '../domain/validators/faq.validator';
import { validate as breadcrumbValidate } from '../domain/validators/breadcrumb.validator';
import { validate as organizationValidate } from '../domain/validators/organization.validator';
import { validate as localBusinessValidate } from '../domain/validators/local-business.validator';

const VALIDATORS: Record<string, SchemaValidator> = {
  Article: articleValidate,
  NewsArticle: articleValidate,
  BlogPosting: articleValidate,
  Product: productValidate,
  FAQPage: faqValidate,
  BreadcrumbList: breadcrumbValidate,
  Organization: organizationValidate,
  LocalBusiness: localBusinessValidate,
};

type ServiceResult = {
  data: SchemaPreviewResponse['data'];
  warnings: SchemaPreviewWarning[];
};

@Injectable()
export class SchemaPreviewService {
  constructor(private readonly fetcher: LiteFetcherService) {}

  executePaste(raw: string): ServiceResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        data: { blocks: [], summary: { totalBlocks: 0, validBlocks: 0, invalidBlocks: 0 } },
        warnings: [{ field: 'json', severity: 'error', message: 'Input is not valid JSON.' }],
      };
    }
    return this.build(this.collect(parsed));
  }

  async executeFromUrl(fetchUrl: string): Promise<ServiceResult & { cached: boolean }> {
    const res = await this.fetcher.get(fetchUrl);
    const $ = cheerio.load(res.body);
    const objects: Record<string, any>[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const text = $(el).contents().text() || $(el).text();
      try {
        objects.push(...this.collect(JSON.parse(text)));
      } catch {
        /* skip malformed block */
      }
    });
    return { ...this.build(objects), cached: !!res.cached };
  }

  /** Flatten a parsed JSON-LD value into a flat list of typed objects. */
  private collect(value: unknown): Record<string, any>[] {
    if (Array.isArray(value)) return value.flatMap((v) => this.collect(v));
    if (value && typeof value === 'object') {
      const obj = value as Record<string, any>;
      if (Array.isArray(obj['@graph'])) return obj['@graph'].flatMap((v: unknown) => this.collect(v));
      return [obj];
    }
    return [];
  }

  private build(objects: Record<string, any>[]): ServiceResult {
    const blocks: SchemaBlock[] = objects.map((obj) => {
      const { displayType, validatorType } = this.typeOf(obj);
      const validator = validatorType ? VALIDATORS[validatorType] : undefined;
      const validation = validator ? validator(obj) : { errors: [], warnings: [] };
      return { type: displayType, raw: obj, validation };
    });

    const validBlocks = blocks.filter((b) => b.validation.errors.length === 0).length;
    const warnings: SchemaPreviewWarning[] = [];
    if (blocks.length === 0) {
      warnings.push({ field: 'schema', severity: 'warn', message: 'No JSON-LD blocks found.' });
    }

    return {
      data: {
        blocks,
        summary: {
          totalBlocks: blocks.length,
          validBlocks,
          invalidBlocks: blocks.length - validBlocks,
        },
      },
      warnings,
    };
  }

  private typeOf(obj: Record<string, any>): { displayType: string; validatorType?: string } {
    const raw = obj['@type'];
    const types = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(String);
    const displayType = types.length ? types.join(', ') : 'Unknown';
    const validatorType = types.find((t) => VALIDATORS[t]) ?? types[0];
    return { displayType, validatorType };
  }
}
