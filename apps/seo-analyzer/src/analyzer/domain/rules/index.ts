/**
 * @file Central rule registration — every new rule must be added here.
 * Called once at module init (`AnalyzerService.onModuleInit`) so the
 * registry mirrors the 21 rows seeded in the `seo_rules` table.
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

/** Register all built-in rules into the given registry. Idempotent. */
export function registerAllRules(registry: RuleRegistry): void {
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
}
