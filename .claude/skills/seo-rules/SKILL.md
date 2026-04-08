---
name: seo-rule-engine
description: Use this skill when the user asks about "SEO rules", "analyzer", "SEO score", "SEO issues", "audit scoring", "Core Web Vitals", "Lighthouse", or any SEO analysis engine work. Provides rule engine patterns, scoring algorithms, and SEO best practices.
allowed-tools: Read, Grep, Glob
---

# SEO Rule Engine Patterns

## Rule Registry Pattern

```typescript
// rule.registry.ts
export interface Analyzer {
  name: string;
  category: 'technical' | 'on-page' | 'performance' | 'content';
  weight: number;
  analyze(pageData: PageData): Issue[];
}

export class RuleRegistry {
  private analyzers: Analyzer[] = [];

  register(analyzer: Analyzer) {
    this.analyzers.push(analyzer);
  }

  runAll(pageData: PageData): Issue[] {
    return this.analyzers.flatMap(a => a.analyze(pageData));
  }

  getByCategory(category: string): Analyzer[] {
    return this.analyzers.filter(a => a.category === category);
  }
}
```

## Analyzer Example

```typescript
// analyzers/on-page/title.analyzer.ts
export class TitleAnalyzer implements Analyzer {
  name = 'title-tag';
  category = 'on-page' as const;
  weight = 8;

  analyze(pageData: PageData): Issue[] {
    const issues: Issue[] = [];
    const { title } = pageData;

    if (!title) {
      issues.push({
        rule: this.name,
        severity: 'critical',
        message: 'Page is missing a title tag',
        fix: 'Add a <title> tag in the <head> section with 50-60 characters',
        impact: 10,
        difficulty: 2,
      });
    } else if (title.length < 30) {
      issues.push({
        rule: this.name,
        severity: 'warning',
        message: `Title tag is too short (${title.length} chars). Recommended: 50-60 chars`,
        fix: 'Expand the title to include primary keyword and be 50-60 characters',
        impact: 6,
        difficulty: 2,
      });
    } else if (title.length > 60) {
      issues.push({
        rule: this.name,
        severity: 'info',
        message: `Title tag may be truncated in SERPs (${title.length} chars)`,
        fix: 'Shorten the title to 60 characters or less',
        impact: 4,
        difficulty: 1,
      });
    }

    return issues;
  }
}
```

## 20 Core SEO Rules

### Technical SEO (7 rules, weight: 30%)
1. `robots-txt` - robots.txt exists and is valid
2. `sitemap` - XML sitemap exists and is referenced in robots.txt
3. `canonical` - Canonical tag present and valid
4. `https` - Page served over HTTPS
5. `redirect-chain` - No redirect chains (max 1 redirect)
6. `schema-markup` - Schema.org structured data present
7. `meta-robots` - No noindex/nofollow on important pages

### On-Page SEO (6 rules, weight: 35%)
8. `title-tag` - Title present, 50-60 chars, unique
9. `meta-description` - Meta description present, 150-160 chars
10. `h1-tag` - Single H1 tag present
11. `image-alt` - All images have alt text
12. `internal-links` - Minimum 3 internal links
13. `heading-hierarchy` - Proper heading hierarchy (H1 -> H2 -> H3)

### Performance (5 rules, weight: 20%)
14. `ttfb` - Time to First Byte < 600ms
15. `page-size` - Total page size < 3MB
16. `external-requests` - External requests < 50
17. `compression` - Gzip/Brotli compression enabled
18. `cache-headers` - Cache-Control headers present

### Content (2 rules, weight: 15%)
19. `word-count` - Minimum 300 words of content
20. `readability` - Content readability score

## Score Calculation

```typescript
// score.calculator.ts
const CATEGORY_WEIGHTS = {
  technical: 0.30,
  'on-page': 0.35,
  performance: 0.20,
  content: 0.15,
};

export function calculateScore(issues: Issue[], lighthouseScore?: number): ScoreResult {
  const categoryScores: Record<string, number> = {};

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const categoryIssues = issues.filter(i => i.category === category);
    const maxPoints = /* sum of rule weights in category */;
    const lostPoints = categoryIssues.reduce((sum, i) => sum + i.impact, 0);
    categoryScores[category] = Math.max(0, 100 - (lostPoints / maxPoints) * 100);
  }

  // Blend with Lighthouse performance score if available
  if (lighthouseScore !== undefined) {
    categoryScores.performance = (categoryScores.performance + lighthouseScore) / 2;
  }

  const overallScore = Object.entries(categoryScores).reduce(
    (sum, [cat, score]) => sum + score * CATEGORY_WEIGHTS[cat], 0
  );

  return { overallScore: Math.round(overallScore), categoryScores };
}
```

## Priority Ranking

```typescript
// priority.ranker.ts
export function rankIssues(issues: Issue[]): Issue[] {
  return issues
    .map(issue => ({
      ...issue,
      priority: issue.impact * (10 - issue.difficulty),
    }))
    .sort((a, b) => b.priority - a.priority);
}
```

## Issue Interface

```typescript
export interface Issue {
  rule: string;
  category: 'technical' | 'on-page' | 'performance' | 'content';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  fix: string;
  impact: number;      // 1-10 (how much it affects SEO)
  difficulty: number;   // 1-10 (how hard to fix)
  priority?: number;    // Calculated: impact * (10 - difficulty)
}
```

## Checklist

```
- Each rule is a self-contained analyzer class
- Analyzers registered via RuleRegistry (no hardcoded list)
- Issues include actionable fix recommendations
- Score weights sum to 100%
- Priority = impact x (10 - difficulty)
- Lighthouse score blended with custom performance rules
- All rules have unit tests with fixture HTML
```
