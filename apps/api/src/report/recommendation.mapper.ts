const RECOMMENDATIONS: Record<string, { fix: string; difficulty: number }> = {
  'tech-robots-txt': {
    fix: 'Create a robots.txt file at the root of your domain. Include User-agent: * and Sitemap: directives.',
    difficulty: 2,
  },
  'tech-sitemap': {
    fix: 'Generate an XML sitemap using tools like Yoast SEO or xml-sitemaps.com. Submit it to Google Search Console.',
    difficulty: 3,
  },
  'tech-canonical': {
    fix: 'Add <link rel="canonical" href="YOUR_URL"> to the <head> section of your page.',
    difficulty: 2,
  },
  'tech-https': {
    fix: "Install an SSL certificate (free via Let's Encrypt). Set up HTTP to HTTPS redirects in your server config.",
    difficulty: 4,
  },
  'tech-redirect-chain': {
    fix: 'Update internal links to point directly to the final URL. Remove intermediate redirects.',
    difficulty: 3,
  },
  'tech-schema-markup': {
    fix: "Add JSON-LD structured data to your page. Use Google's Structured Data Markup Helper to generate the code.",
    difficulty: 4,
  },
  'tech-meta-robots': {
    fix: 'Remove the noindex directive from the meta robots tag if this page should be indexed by search engines.',
    difficulty: 1,
  },
  'onpage-title-presence': {
    fix: 'Add a <title> tag in the <head> section. Keep it between 30-60 characters, include your primary keyword.',
    difficulty: 1,
  },
  'onpage-title-length': {
    fix: 'Adjust your title tag length to 30-60 characters. Front-load important keywords.',
    difficulty: 1,
  },
  'onpage-meta-desc-presence': {
    fix: 'Add a <meta name="description" content="..."> tag. Write a compelling description between 120-160 characters.',
    difficulty: 1,
  },
  'onpage-meta-desc-length': {
    fix: 'Adjust your meta description to 120-160 characters. Include a call-to-action and primary keyword.',
    difficulty: 1,
  },
  'onpage-h1-presence': {
    fix: "Add one <h1> tag at the top of your main content area. It should describe the page's primary topic.",
    difficulty: 1,
  },
  'onpage-h1-uniqueness': {
    fix: 'Keep only one <h1> tag per page. Convert extra H1s to <h2> or <h3> tags.',
    difficulty: 2,
  },
  'onpage-img-alt': {
    fix: 'Add descriptive alt attributes to all <img> tags. Describe what the image shows in 5-15 words.',
    difficulty: 2,
  },
  'onpage-internal-links': {
    fix: 'Add internal links to related pages on your site. Aim for at least 2-3 contextual internal links per page.',
    difficulty: 2,
  },
  'perf-slow-response': {
    fix: 'Optimize server response time: enable server-side caching, use a CDN, optimize database queries.',
    difficulty: 6,
  },
  'perf-page-size': {
    fix: 'Reduce page size: minify HTML/CSS/JS, compress images, defer non-critical resources.',
    difficulty: 5,
  },
  'perf-external-requests': {
    fix: 'Reduce external resources: combine scripts, use async/defer loading, remove unused third-party scripts.',
    difficulty: 5,
  },
  'perf-compression': {
    fix: 'Enable gzip or Brotli compression in your web server configuration (nginx, Apache, or CDN settings).',
    difficulty: 3,
  },
  'perf-cache-headers': {
    fix: 'Add Cache-Control headers to your server responses. Set max-age for static assets (e.g., Cache-Control: max-age=31536000).',
    difficulty: 2,
  },
};

export function getRecommendation(ruleId: string): {
  fix: string;
  difficulty: number;
} {
  return (
    RECOMMENDATIONS[ruleId] || {
      fix: 'Review and fix this issue to improve your SEO score.',
      difficulty: 5,
    }
  );
}
