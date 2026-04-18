import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const rules = [
  { name: 'title_tag',          displayName: 'Title Tag',          category: 'meta' as const,        weight: 8,  description: 'Kiem tra ton tai va do dai title (50-60 ky tu)' },
  { name: 'meta_description',   displayName: 'Meta Description',   category: 'meta' as const,        weight: 7,  description: 'Kiem tra do dai meta description (120-160 ky tu)' },
  { name: 'h1_tag',             displayName: 'H1 Tag',             category: 'headings' as const,    weight: 8,  description: 'Dung 1 H1, chua tu khoa chinh' },
  { name: 'heading_hierarchy',  displayName: 'Heading Hierarchy',  category: 'headings' as const,    weight: 6,  description: 'H1->H2->H3 dung thu tu, khong bo cap' },
  { name: 'image_alt',          displayName: 'Image Alt Text',     category: 'images' as const,      weight: 7,  description: 'Moi img phai co alt attribute' },
  { name: 'canonical_url',      displayName: 'Canonical URL',      category: 'technical' as const,   weight: 5,  description: 'Trang co the rel=canonical' },
  { name: 'robots_meta',        displayName: 'Robots Meta',        category: 'technical' as const,   weight: 6,  description: 'Khong vo tinh noindex' },
  { name: 'viewport_meta',      displayName: 'Viewport Meta',      category: 'technical' as const,   weight: 10, description: 'Co meta viewport cho mobile' },
  { name: 'https_check',        displayName: 'HTTPS',              category: 'technical' as const,   weight: 10, description: 'Trang phuc vu qua HTTPS' },
  { name: 'open_graph',         displayName: 'Open Graph',         category: 'meta' as const,        weight: 5,  description: 'Du og:title, og:description, og:image' },
  { name: 'twitter_card',       displayName: 'Twitter Card',       category: 'meta' as const,        weight: 3,  description: 'Co the twitter:card' },
  { name: 'schema_org',         displayName: 'Schema.org',         category: 'technical' as const,   weight: 6,  description: 'Co JSON-LD structured data' },
  { name: 'internal_links',     displayName: 'Internal Links',     category: 'links' as const,       weight: 5,  description: 'Du internal link (>=3) va khong gay' },
  { name: 'external_links',     displayName: 'External Links',     category: 'links' as const,       weight: 3,  description: 'External link co rel phu hop' },
  { name: 'broken_links',       displayName: 'Broken Links',       category: 'links' as const,       weight: 7,  description: 'HTTP status cua tung link (HEAD/GET) — internal broken FAIL, external broken WARN' },
  { name: 'image_optimization', displayName: 'Image Optimization', category: 'images' as const,      weight: 5,  description: 'Anh dung WebP/AVIF, < 200KB' },
  { name: 'page_size',          displayName: 'Page Size',          category: 'performance' as const, weight: 4,  description: 'Tong dung luong < 2MB' },
  { name: 'http_status',        displayName: 'HTTP Status',        category: 'technical' as const,   weight: 8,  description: 'Trang tra ve 200' },
  { name: 'url_structure',      displayName: 'URL Structure',      category: 'technical' as const,   weight: 4,  description: 'URL ngan, co tu khoa, dung dau gach ngang' },
  { name: 'language_tag',       displayName: 'Language Tag',       category: 'technical' as const,   weight: 3,  description: 'html lang duoc khai bao' },
  { name: 'favicon',            displayName: 'Favicon',            category: 'technical' as const,   weight: 2,  description: 'Co favicon.ico hoac link rel=icon' },
  { name: 'readability',        displayName: 'Readability (Flesch-Kincaid)', category: 'content' as const,   weight: 4,  description: 'Flesch Reading Ease; target 60-70 cho plain English' },
];

async function main() {
  for (const rule of rules) {
    await prisma.seoRule.upsert({
      where: { name: rule.name },
      update: { weight: rule.weight, description: rule.description },
      create: rule,
    });
  }
  console.log(`Analyzer seed completed: ${rules.length} SEO rules created`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
