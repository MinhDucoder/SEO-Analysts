/**
 * @file Central rule registration — every new rule must be added here.
 * Called once at module init (`AnalyzerService.onModuleInit`) so the
 * registry mirrors the seeded rows in the `seo_rules` table.
 */
import { RuleRegistry } from '../../services/rule-registry';
import { TitleTagRule } from './meta/title-tag.rule';
import { MetaDescriptionRule } from './meta/meta-description.rule';
import { OpenGraphRule } from './meta/open-graph.rule';
import { TwitterCardRule } from './meta/twitter-card.rule';
import { H1TagRule } from './headings/h1-tag.rule';
import { HeadingHierarchyRule } from './headings/heading-hierarchy.rule';
import { ImageAltRule } from './images/image-alt.rule';
import { ImageOptimizationRule } from './images/image-optimization.rule';
import { InternalLinksRule } from './links/internal-links.rule';
import { ExternalLinksRule } from './links/external-links.rule';
import { BrokenLinksRule } from './links/broken-links.rule';
import { CanonicalUrlRule } from './technical/canonical-url.rule';
import { RobotsMetaRule } from './technical/robots-meta.rule';
import { ViewportMetaRule } from './technical/viewport-meta.rule';
import { HttpsCheckRule } from './technical/https-check.rule';
import { SchemaOrgRule } from './technical/schema-org.rule';
import { HttpStatusRule } from './technical/http-status.rule';
import { UrlStructureRule } from './technical/url-structure.rule';
import { LanguageTagRule } from './technical/language-tag.rule';
import { FaviconRule } from './technical/favicon.rule';
import { PageSizeRule } from './performance/page-size.rule';
import { ReadabilityRule } from './content/readability.rule';
// GEO rules
import { AiBotAccessRule } from './geo/ai-bot-access.rule';
import { LlmsTxtPresentRule } from './geo/llms-txt-present.rule';
import { ArticleSchemaRule } from './geo/article-schema.rule';
import { EntityMarkupRule } from './geo/entity-markup.rule';
import { QuotableDensityRule } from './geo/quotable-density.rule';
import { CitationOutboundRule } from './geo/citation-outbound.rule';
import { DirectAnswerIntroRule } from './geo/direct-answer-intro.rule';
import { SemanticCompletenessRule } from './geo/semantic-completeness.rule';
import { GeminiClientService } from '../../services/gemini-client.service';

export interface RegisterRulesOpts {
  /** When true, registers all 8 GEO rules (requires GEO_AUDIT feature). */
  runGeo?: boolean;
  /** Gemini API key — required for the 2 LLM-backed GEO rules (G3 + G4). */
  geminiKey?: string;
}

/** Weight per GEO rule (8 rules × 12.5 = 100 total). */
export const GEO_RULE_WEIGHT = 12.5;

/**
 * Register all built-in rules into the given registry.
 * The 22 standard SEO rules are always registered.
 * GEO rules are registered only when `opts.runGeo === true`.
 */
export function registerAllRules(registry: RuleRegistry, opts: RegisterRulesOpts = {}): void {
  registry.register(new TitleTagRule());
  registry.register(new MetaDescriptionRule());
  registry.register(new OpenGraphRule());
  registry.register(new TwitterCardRule());
  registry.register(new H1TagRule());
  registry.register(new HeadingHierarchyRule());
  registry.register(new ImageAltRule());
  registry.register(new ImageOptimizationRule());
  registry.register(new InternalLinksRule());
  registry.register(new ExternalLinksRule());
  registry.register(new BrokenLinksRule());
  registry.register(new CanonicalUrlRule());
  registry.register(new RobotsMetaRule());
  registry.register(new ViewportMetaRule());
  registry.register(new HttpsCheckRule());
  registry.register(new SchemaOrgRule());
  registry.register(new HttpStatusRule());
  registry.register(new UrlStructureRule());
  registry.register(new LanguageTagRule());
  registry.register(new FaviconRule());
  registry.register(new PageSizeRule());
  registry.register(new ReadabilityRule());

  if (opts.runGeo) {
    registry.register(new AiBotAccessRule());
    registry.register(new LlmsTxtPresentRule());
    registry.register(new ArticleSchemaRule());
    registry.register(new EntityMarkupRule());
    registry.register(new QuotableDensityRule());
    registry.register(new CitationOutboundRule());
    if (opts.geminiKey) {
      const llm = new GeminiClientService(opts.geminiKey);
      registry.register(new DirectAnswerIntroRule(llm));
      registry.register(new SemanticCompletenessRule(llm));
    }
  }
}
