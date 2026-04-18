#!/bin/bash
set -e

# ─── Config ───
GATEWAY_DB="postgresql://gateway_user:gateway_pass@localhost:5432/seo_gateway"
ANALYZER_DB="postgresql://analyzer_user:analyzer_pass@localhost:5433/seo_analyzer"
REPORT_DB="postgresql://report_user:report_pass@localhost:5434/seo_report"

echo "=== Seeding test data for all 3 databases ==="

# ─── 1. Gateway DB: Users + Audits ───
echo "[1/3] Seeding gateway DB (users, audits)..."
psql "$GATEWAY_DB" <<'SQL'
-- Clean existing test data
DELETE FROM audits WHERE domain IN ('google.com','facebook.com','github.com','stackoverflow.com','example.com','shopee.vn','tiki.vn','vnexpress.net','vietcombank.com.vn','fpt.com.vn');
DELETE FROM users WHERE email LIKE '%@test.seo.local';

-- Admin user (password: Admin1234!)
INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.seo.local',
  '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
  'Admin User',
  'admin',
  true,
  NOW() - INTERVAL '30 days',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Regular users
INSERT INTO users (id, email, password_hash, full_name, role, is_verified, created_at, updated_at)
VALUES
  ('u0000000-0000-0000-0000-000000000001', 'duc@test.seo.local',
   '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
   'Nguyen Minh Duc', 'user', true, NOW() - INTERVAL '25 days', NOW()),
  ('u0000000-0000-0000-0000-000000000002', 'linh@test.seo.local',
   '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
   'Tran Thuy Linh', 'user', true, NOW() - INTERVAL '20 days', NOW()),
  ('u0000000-0000-0000-0000-000000000003', 'nam@test.seo.local',
   '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
   'Le Van Nam', 'user', true, NOW() - INTERVAL '15 days', NOW()),
  ('u0000000-0000-0000-0000-000000000004', 'unverified@test.seo.local',
   '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
   'Unverified User', 'user', false, NOW() - INTERVAL '5 days', NOW()),
  ('u0000000-0000-0000-0000-000000000005', 'locked@test.seo.local',
   '$2b$12$YWXrjD4gwyvPqQkZ8fJ9aO3.1gwwFQtUeAw/iMsZdPPOv.xswUh3i',
   'Locked User', 'user', true, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (email) DO NOTHING;

UPDATE users SET is_locked = true WHERE email = 'locked@test.seo.local';

-- Audits for user Duc (various statuses)
INSERT INTO audits (id, user_id, url, domain, status, seo_score, target_keyword, crawler_type, crawl_duration_ms, completed_at, created_at, updated_at)
VALUES
  -- Completed audits (with scores)
  ('b0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001',
   'https://google.com', 'google.com', 'completed', 92.50, 'search engine',
   'playwright', 4500, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000001',
   'https://facebook.com', 'facebook.com', 'completed', 78.30, 'social media',
   'playwright', 6200, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  ('b0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000001',
   'https://github.com', 'github.com', 'completed', 85.70, 'code hosting',
   'cheerio', 2100, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000001',
   'https://stackoverflow.com', 'stackoverflow.com', 'completed', 71.20, 'programming questions',
   'cheerio', 3400, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000005', 'u0000000-0000-0000-0000-000000000001',
   'https://shopee.vn', 'shopee.vn', 'completed', 64.80, 'mua sam online',
   'playwright', 8900, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

  -- Re-audit google (for compare feature)
  ('b0000000-0000-0000-0000-000000000006', 'u0000000-0000-0000-0000-000000000001',
   'https://google.com', 'google.com', 'completed', 94.10, 'search engine',
   'playwright', 4200, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- In-progress audits
  ('b0000000-0000-0000-0000-000000000007', 'u0000000-0000-0000-0000-000000000001',
   'https://tiki.vn', 'tiki.vn', 'crawling', NULL, 'thuong mai dien tu',
   NULL, NULL, NULL, NOW() - INTERVAL '1 hour', NOW()),
  ('b0000000-0000-0000-0000-000000000008', 'u0000000-0000-0000-0000-000000000001',
   'https://vnexpress.net', 'vnexpress.net', 'analyzing', NULL, 'tin tuc',
   'cheerio', 2800, NULL, NOW() - INTERVAL '30 minutes', NOW()),

  -- Failed audit
  ('b0000000-0000-0000-0000-000000000009', 'u0000000-0000-0000-0000-000000000001',
   'https://example.com/timeout', 'example.com', 'failed', NULL, 'test fail',
   'playwright', NULL, NULL, NOW() - INTERVAL '5 days', NOW()),

  -- Pending audit
  ('b0000000-0000-0000-0000-000000000010', 'u0000000-0000-0000-0000-000000000001',
   'https://fpt.com.vn', 'fpt.com.vn', 'pending', NULL, 'cong nghe',
   NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE audits SET error_message = 'Timeout: Page load exceeded 30s limit' WHERE id = 'b0000000-0000-0000-0000-000000000009';

-- Audits for user Linh
INSERT INTO audits (id, user_id, url, domain, status, seo_score, target_keyword, crawler_type, crawl_duration_ms, completed_at, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000011', 'u0000000-0000-0000-0000-000000000002',
   'https://vietcombank.com.vn', 'vietcombank.com.vn', 'completed', 58.40, 'ngan hang',
   'playwright', 7200, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
  ('b0000000-0000-0000-0000-000000000012', 'u0000000-0000-0000-0000-000000000002',
   'https://shopee.vn', 'shopee.vn', 'completed', 66.90, 'mua sam',
   'playwright', 9100, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

SELECT 'Gateway DB: ' || count(*) || ' users, ' || (SELECT count(*) FROM audits) || ' audits' FROM users;
SQL

# ─── 2. Analyzer DB: SEO Rules + Rule Results ───
echo "[2/3] Seeding analyzer DB (rules, results)..."
psql "$ANALYZER_DB" <<'SQL'
-- Clean
DELETE FROM rule_results WHERE audit_id LIKE 'b0000000%';
DELETE FROM seo_rules WHERE name LIKE 'rule_%';

-- SEO Rules (20 rules across 6 categories)
INSERT INTO seo_rules (id, name, display_name, description, category, weight, is_enabled, created_at, updated_at)
VALUES
  -- Meta (4 rules)
  ('r0000000-0000-0000-0000-000000000001', 'rule_title_tag', 'Title Tag', 'Kiem tra the title co ton tai va do dai phu hop (50-60 ky tu)', 'meta', 15, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000002', 'rule_meta_description', 'Meta Description', 'Kiem tra meta description (150-160 ky tu)', 'meta', 12, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000003', 'rule_canonical_url', 'Canonical URL', 'Kiem tra canonical URL duoc thiet lap dung', 'meta', 8, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000004', 'rule_open_graph', 'Open Graph Tags', 'Kiem tra OG tags cho social sharing', 'meta', 5, true, NOW(), NOW()),

  -- Headings (3 rules)
  ('r0000000-0000-0000-0000-000000000005', 'rule_h1_tag', 'H1 Tag', 'Trang phai co duy nhat 1 the H1', 'headings', 12, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000006', 'rule_heading_hierarchy', 'Heading Hierarchy', 'Cau truc heading phai theo thu tu H1 > H2 > H3', 'headings', 8, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000007', 'rule_keyword_in_h1', 'Keyword in H1', 'Tu khoa muc tieu phai xuat hien trong H1', 'headings', 10, true, NOW(), NOW()),

  -- Images (3 rules)
  ('r0000000-0000-0000-0000-000000000008', 'rule_img_alt', 'Image Alt Text', 'Tat ca hinh anh phai co alt text', 'images', 10, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000009', 'rule_img_size', 'Image File Size', 'Hinh anh khong vuot qua 200KB', 'images', 6, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000010', 'rule_img_lazy_load', 'Image Lazy Loading', 'Hinh anh nen co lazy loading', 'images', 4, true, NOW(), NOW()),

  -- Links (3 rules)
  ('r0000000-0000-0000-0000-000000000011', 'rule_internal_links', 'Internal Links', 'Trang nen co it nhat 3 internal links', 'links', 8, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000012', 'rule_broken_links', 'Broken Links', 'Khong co link bi 404', 'links', 10, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000013', 'rule_anchor_text', 'Descriptive Anchor Text', 'Anchor text phai mo ta noi dung link', 'links', 5, true, NOW(), NOW()),

  -- Performance (4 rules)
  ('r0000000-0000-0000-0000-000000000014', 'rule_lcp', 'Largest Contentful Paint', 'LCP phai duoi 2.5 giay', 'performance', 15, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000015', 'rule_cls', 'Cumulative Layout Shift', 'CLS phai duoi 0.1', 'performance', 10, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000016', 'rule_inp', 'Interaction to Next Paint', 'INP phai duoi 200ms', 'performance', 10, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000017', 'rule_page_speed', 'Page Speed Score', 'Diem Lighthouse Performance >= 70', 'performance', 8, true, NOW(), NOW()),

  -- Technical (3 rules)
  ('r0000000-0000-0000-0000-000000000018', 'rule_https', 'HTTPS', 'Trang phai dung HTTPS', 'technical', 10, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000019', 'rule_robots_txt', 'Robots.txt', 'File robots.txt phai ton tai va hop le', 'technical', 5, true, NOW(), NOW()),
  ('r0000000-0000-0000-0000-000000000020', 'rule_sitemap', 'XML Sitemap', 'Sitemap phai ton tai va tham chieu trong robots.txt', 'technical', 5, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Rule Results for google.com audit (b001 - high score 92.50)
INSERT INTO rule_results (audit_id, rule_id, rule_name, category, status, score, weight, message, suggestion, metadata, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000001', 'rule_title_tag', 'meta', 'pass', 100, 15, 'Title tag: "Google" (6 ky tu)', NULL, '{"length": 6}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000002', 'rule_meta_description', 'meta', 'pass', 95, 12, 'Meta description: 155 ky tu', NULL, '{"length": 155}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000003', 'rule_canonical_url', 'meta', 'pass', 100, 8, 'Canonical URL duoc thiet lap dung', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000004', 'rule_open_graph', 'meta', 'warn', 60, 5, 'Thieu og:image', 'Them og:image de hien thi tot tren social media', '{"missing": ["og:image"]}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000005', 'rule_h1_tag', 'headings', 'pass', 100, 12, 'Trang co 1 the H1', NULL, '{"count": 1}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000006', 'rule_heading_hierarchy', 'headings', 'pass', 100, 8, 'Heading hierarchy dung thu tu', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000007', 'rule_keyword_in_h1', 'headings', 'pass', 90, 10, 'Tu khoa "search engine" xuat hien trong H1', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000008', 'rule_img_alt', 'images', 'pass', 95, 10, '19/20 hinh anh co alt text', 'Them alt text cho 1 hinh con thieu', '{"total": 20, "withAlt": 19}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000009', 'rule_img_size', 'images', 'pass', 100, 6, 'Tat ca hinh anh duoi 200KB', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000010', 'rule_img_lazy_load', 'images', 'pass', 100, 4, 'Lazy loading duoc ap dung', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000011', 'rule_internal_links', 'links', 'pass', 100, 8, '15 internal links', NULL, '{"count": 15}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000012', 'rule_broken_links', 'links', 'pass', 100, 10, 'Khong co broken link', NULL, '{"broken": 0}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000013', 'rule_anchor_text', 'links', 'warn', 70, 5, '3 link co anchor text "click here"', 'Su dung anchor text mo ta noi dung', '{"generic": 3}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000014', 'rule_lcp', 'performance', 'pass', 95, 15, 'LCP: 1.2s', NULL, '{"value": 1200}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000015', 'rule_cls', 'performance', 'pass', 100, 10, 'CLS: 0.02', NULL, '{"value": 0.02}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000016', 'rule_inp', 'performance', 'pass', 90, 10, 'INP: 150ms', NULL, '{"value": 150}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000017', 'rule_page_speed', 'performance', 'pass', 92, 8, 'Performance score: 92', NULL, '{"score": 92}', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000018', 'rule_https', 'technical', 'pass', 100, 10, 'HTTPS duoc su dung', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000019', 'rule_robots_txt', 'technical', 'pass', 100, 5, 'robots.txt ton tai va hop le', NULL, NULL, NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000020', 'rule_sitemap', 'technical', 'pass', 100, 5, 'Sitemap ton tai tai /sitemap.xml', NULL, NULL, NOW());

-- Rule Results for shopee.vn audit (b005 - lower score 64.80)
INSERT INTO rule_results (audit_id, rule_id, rule_name, category, status, score, weight, message, suggestion, metadata, created_at)
VALUES
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000001', 'rule_title_tag', 'meta', 'pass', 85, 15, 'Title: "Shopee Vietnam | Mua Sam Online" (35 ky tu)', 'Co the them tu khoa muc tieu vao title', '{"length": 35}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000002', 'rule_meta_description', 'meta', 'warn', 50, 12, 'Meta description qua dai: 220 ky tu', 'Rut ngan meta description xuong 150-160 ky tu', '{"length": 220}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000005', 'rule_h1_tag', 'headings', 'fail', 0, 12, 'Trang co 3 the H1', 'Chi nen co 1 the H1 duy nhat', '{"count": 3}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000008', 'rule_img_alt', 'images', 'fail', 30, 10, 'Chi 12/40 hinh anh co alt text', 'Them alt text cho 28 hinh con thieu', '{"total": 40, "withAlt": 12}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000009', 'rule_img_size', 'images', 'warn', 60, 6, '5 hinh anh vuot qua 200KB', 'Nen compress hinh anh lon', '{"oversized": 5}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000014', 'rule_lcp', 'performance', 'fail', 30, 15, 'LCP: 5.8s', 'Toi uu hinh anh va lazy load de giam LCP', '{"value": 5800}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000015', 'rule_cls', 'performance', 'warn', 60, 10, 'CLS: 0.15', 'Dat kich thuoc co dinh cho hinh anh va quang cao', '{"value": 0.15}', NOW()),
  ('b0000000-0000-0000-0000-000000000005', 'r0000000-0000-0000-0000-000000000018', 'rule_https', 'technical', 'pass', 100, 10, 'HTTPS duoc su dung', NULL, NULL, NOW());

SELECT 'Analyzer DB: ' || count(*) || ' rules, ' || (SELECT count(*) FROM rule_results) || ' results' FROM seo_rules;
SQL

# ─── 3. Report DB: Reports + Keywords + CWV + Share Links ───
echo "[3/3] Seeding report DB (reports, keywords, cwv, share links)..."
psql "$REPORT_DB" <<'SQL'
-- Clean
DELETE FROM share_links WHERE audit_id LIKE 'b0000000%';
DELETE FROM report_cwv WHERE report_id IN (SELECT id FROM reports WHERE audit_id LIKE 'b0000000%');
DELETE FROM report_keywords WHERE report_id IN (SELECT id FROM reports WHERE audit_id LIKE 'b0000000%');
DELETE FROM reports WHERE audit_id LIKE 'b0000000%';

-- Reports for completed audits
INSERT INTO reports (id, audit_id, url, domain, final_score, classification, total_issues, critical_issues, warn_issues, pass_count, analysis_snapshot, cwv_snapshot, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'https://google.com', 'google.com', 92.50, 'excellent', 2, 0, 2, 18,
   '{"overallScore": 92.5, "categoryScores": {"meta": 95, "headings": 97, "images": 98, "links": 90, "performance": 94, "technical": 100}}',
   '{"lcpMs": 1200, "inpMs": 150, "cls": 0.02, "performanceScore": 92, "accessibilityScore": 88, "bestPracticesScore": 95, "seoScore": 93}',
   NOW() - INTERVAL '20 days'),

  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'https://facebook.com', 'facebook.com', 78.30, 'good', 5, 1, 4, 15,
   '{"overallScore": 78.3, "categoryScores": {"meta": 80, "headings": 75, "images": 70, "links": 85, "performance": 72, "technical": 90}}',
   '{"lcpMs": 2100, "inpMs": 180, "cls": 0.08, "performanceScore": 75, "accessibilityScore": 82, "bestPracticesScore": 88, "seoScore": 78}',
   NOW() - INTERVAL '18 days'),

  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   'https://github.com', 'github.com', 85.70, 'excellent', 3, 0, 3, 17,
   '{"overallScore": 85.7, "categoryScores": {"meta": 90, "headings": 88, "images": 80, "links": 92, "performance": 82, "technical": 95}}',
   '{"lcpMs": 1800, "inpMs": 120, "cls": 0.05, "performanceScore": 85, "accessibilityScore": 90, "bestPracticesScore": 92, "seoScore": 88}',
   NOW() - INTERVAL '15 days'),

  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005',
   'https://shopee.vn', 'shopee.vn', 64.80, 'good', 8, 3, 5, 12,
   '{"overallScore": 64.8, "categoryScores": {"meta": 68, "headings": 50, "images": 45, "links": 75, "performance": 50, "technical": 90}}',
   '{"lcpMs": 5800, "inpMs": 280, "cls": 0.15, "performanceScore": 48, "accessibilityScore": 65, "bestPracticesScore": 72, "seoScore": 60}',
   NOW() - INTERVAL '7 days'),

  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006',
   'https://google.com', 'google.com', 94.10, 'excellent', 1, 0, 1, 19,
   '{"overallScore": 94.1, "categoryScores": {"meta": 97, "headings": 97, "images": 98, "links": 92, "performance": 95, "technical": 100}}',
   '{"lcpMs": 1100, "inpMs": 130, "cls": 0.01, "performanceScore": 95, "accessibilityScore": 90, "bestPracticesScore": 96, "seoScore": 95}',
   NOW() - INTERVAL '2 days')
ON CONFLICT (audit_id) DO NOTHING;

-- Keywords for google.com report
INSERT INTO report_keywords (report_id, keyword, frequency, density_percent, in_title, in_h1, in_first_paragraph, in_meta_description, rank, is_target)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'search engine', 8, 2.10, true, true, true, true, 1, true),
  ('c0000000-0000-0000-0000-000000000001', 'google', 15, 3.90, true, true, true, true, 2, false),
  ('c0000000-0000-0000-0000-000000000001', 'search', 12, 3.10, true, true, true, true, 3, false),
  ('c0000000-0000-0000-0000-000000000001', 'results', 6, 1.60, false, false, true, false, 4, false),
  ('c0000000-0000-0000-0000-000000000001', 'web', 5, 1.30, false, false, false, true, 5, false);

-- Keywords for shopee.vn report
INSERT INTO report_keywords (report_id, keyword, frequency, density_percent, in_title, in_h1, in_first_paragraph, in_meta_description, rank, is_target)
VALUES
  ('c0000000-0000-0000-0000-000000000004', 'mua sam online', 5, 1.80, true, false, true, true, 1, true),
  ('c0000000-0000-0000-0000-000000000004', 'shopee', 20, 5.20, true, true, true, true, 2, false),
  ('c0000000-0000-0000-0000-000000000004', 'giam gia', 18, 4.70, false, false, true, true, 3, false),
  ('c0000000-0000-0000-0000-000000000004', 'mien phi van chuyen', 10, 2.60, false, false, false, true, 4, false),
  ('c0000000-0000-0000-0000-000000000004', 'san pham', 25, 6.50, false, false, true, false, 5, false);

-- Core Web Vitals
INSERT INTO report_cwv (report_id, lcp_ms, inp_ms, cls, performance_score, accessibility_score, best_practices_score, lighthouse_seo_score)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 1200, 150, 0.02, 92, 88, 95, 93),
  ('c0000000-0000-0000-0000-000000000002', 2100, 180, 0.08, 75, 82, 88, 78),
  ('c0000000-0000-0000-0000-000000000003', 1800, 120, 0.05, 85, 90, 92, 88),
  ('c0000000-0000-0000-0000-000000000004', 5800, 280, 0.15, 48, 65, 72, 60),
  ('c0000000-0000-0000-0000-000000000005', 1100, 130, 0.01, 95, 90, 96, 95)
ON CONFLICT (report_id) DO NOTHING;

-- Share Links
INSERT INTO share_links (report_id, audit_id, token, is_active, accessed_count, last_accessed_at, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'share_google_abc123def456', true, 15, NOW() - INTERVAL '1 day', NOW() - INTERVAL '19 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   'share_github_xyz789ghi012', true, 8, NOW() - INTERVAL '3 days', NOW() - INTERVAL '14 days'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005',
   'share_shopee_revoked00001', false, 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days')
ON CONFLICT (report_id) DO NOTHING;

SELECT 'Report DB: ' || count(*) || ' reports, '
  || (SELECT count(*) FROM report_keywords) || ' keywords, '
  || (SELECT count(*) FROM report_cwv) || ' cwv, '
  || (SELECT count(*) FROM share_links) || ' share links'
FROM reports;
SQL

echo ""
echo "=== DONE ==="
echo ""
echo "Test accounts:"
echo "  Admin:      admin@test.seo.local     (role: admin, verified)"
echo "  User Duc:   duc@test.seo.local       (role: user, verified, 10 audits)"
echo "  User Linh:  linh@test.seo.local      (role: user, verified, 2 audits)"
echo "  User Nam:   nam@test.seo.local       (role: user, verified, 0 audits)"
echo "  Unverified: unverified@test.seo.local (not verified)"
echo "  Locked:     locked@test.seo.local     (account locked)"
echo ""
echo "  Password for all: hash is placeholder (use API register/login for real tokens)"
echo ""
echo "Share links:"
echo "  Active:  share_google_abc123def456 (google.com)"
echo "  Active:  share_github_xyz789ghi012 (github.com)"
echo "  Revoked: share_shopee_revoked00001 (shopee.vn)"
