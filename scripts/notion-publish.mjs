#!/usr/bin/env node
// scripts/notion-publish.mjs
//
// Publish a Markdown file to a Notion database as a new page.
// Reads NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_API_VERSION from .env.local.
//
// Usage:
//   node scripts/notion-publish.mjs <markdown-file> [--title "Page Title"] [--type knowLedge]
//
// Examples:
//   node scripts/notion-publish.mjs docs/scripts-guide.md
//   node scripts/notion-publish.mjs docs/scripts-guide.md --title "Project Run Guide"
//
// Supported markdown:
//   - Headings (#, ##, ###)
//   - Paragraphs (with inline **bold**, *italic*, `code`, [link](url))
//   - Code blocks (``` with language)
//   - Bullet lists (- )
//   - Numbered lists (1. )
//   - Blockquotes (> )
//   - Horizontal rules (---)
//   - Tables (| col | col |)

import { readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const NOTION_BASE = "https://api.notion.com/v1";
const MAX_CHILDREN_PER_REQUEST = 100;
const MAX_RICHTEXT_LENGTH = 2000;

// ─── env loader ────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    fail(`Missing ${ENV_PATH}. Create it with NOTION_API_KEY + NOTION_DATABASE_ID.`);
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  for (const k of ["NOTION_API_KEY", "NOTION_DATABASE_ID"]) {
    if (!env[k]) fail(`${k} missing in .env.local`);
  }
  env.NOTION_API_VERSION ||= "2022-06-28";
  return env;
}

// ─── CLI args ──────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { file: null, title: null, type: "knowLedge" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--title") args.title = argv[++i];
    else if (a === "--type") args.type = argv[++i];
    else if (!args.file) args.file = a;
  }
  if (!args.file) fail("Usage: node scripts/notion-publish.mjs <markdown-file>");
  if (!existsSync(args.file)) fail(`File not found: ${args.file}`);
  return args;
}

// ─── Markdown → Notion blocks ──────────────────────────────────────
function mdToBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks
    if (!line.trim()) { i++; continue; }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      blocks.push({ object: "block", type: "divider", divider: {} });
      i++; continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const type = `heading_${level}`;
      blocks.push({
        object: "block",
        type,
        [type]: { rich_text: parseInline(h[2]) },
      });
      i++; continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "plain text";
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]); i++;
      }
      i++; // skip closing ```
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: truncate(code.join("\n"), MAX_RICHTEXT_LENGTH) } }],
          language: mapCodeLang(lang),
        },
      });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, "")); i++;
      }
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: parseInline(quoteLines.join("\n")) },
      });
      continue;
    }

    // Table (line starts with `|` and next line is separator `|---|`)
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]); i++;
      }
      blocks.push(buildTableBlock(tableLines));
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^[-*]\s+/, "");
        blocks.push({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: parseInline(text) },
        });
        i++;
      }
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s+/, "");
        blocks.push({
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: { rich_text: parseInline(text) },
        });
        i++;
      }
      continue;
    }

    // Paragraph (may span multiple non-blank lines)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith(">") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !lines[i].trim().startsWith("|")
    ) {
      paraLines.push(lines[i]); i++;
    }
    if (paraLines.length) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: parseInline(paraLines.join(" ")) },
      });
    }
  }
  return blocks;
}

function buildTableBlock(tableLines) {
  const parseRow = (raw) =>
    raw.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = parseRow(tableLines[0]);
  const bodyRows = tableLines.slice(2).map(parseRow);
  const width = header.length;

  const toRowBlock = (cells) => ({
    object: "block",
    type: "table_row",
    table_row: {
      cells: Array.from({ length: width }, (_, i) => parseInline(cells[i] || "")),
    },
  });

  return {
    object: "block",
    type: "table",
    table: {
      table_width: width,
      has_column_header: true,
      has_row_header: false,
      children: [toRowBlock(header), ...bodyRows.map(toRowBlock)],
    },
  };
}

// Inline: **bold**, *italic*/_italic_, `code`, [text](url)
function parseInline(text) {
  if (!text) return [{ type: "text", text: { content: "" } }];
  const tokens = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0; let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: "text", text: { content: text.slice(last, m.index) } });
    if (m[1]) tokens.push({ type: "text", text: { content: m[2] }, annotations: { bold: true } });
    else if (m[3]) tokens.push({ type: "text", text: { content: m[4] }, annotations: { italic: true } });
    else if (m[5]) tokens.push({ type: "text", text: { content: m[6] }, annotations: { italic: true } });
    else if (m[7]) tokens.push({ type: "text", text: { content: m[8] }, annotations: { code: true } });
    else if (m[9]) tokens.push({ type: "text", text: { content: m[10], link: { url: m[11] } } });
    last = regex.lastIndex;
  }
  if (last < text.length) tokens.push({ type: "text", text: { content: text.slice(last) } });
  return tokens.length ? tokens.map(truncateRichText) : [{ type: "text", text: { content: "" } }];
}

function truncateRichText(rt) {
  if (rt.text?.content?.length > MAX_RICHTEXT_LENGTH) {
    rt.text.content = rt.text.content.slice(0, MAX_RICHTEXT_LENGTH);
  }
  return rt;
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) : s; }

function mapCodeLang(lang) {
  const map = {
    js: "javascript", mjs: "javascript", ts: "typescript", tsx: "typescript", jsx: "javascript",
    sh: "shell", bash: "shell", zsh: "shell",
    yml: "yaml", py: "python", md: "markdown",
  };
  return map[lang.toLowerCase()] || lang.toLowerCase();
}

// ─── Notion API ────────────────────────────────────────────────────
async function notionFetch(env, path, init = {}) {
  const res = await fetch(`${NOTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.NOTION_API_KEY}`,
      "Notion-Version": env.NOTION_API_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    fail(`Notion API ${res.status} ${res.statusText}\n${body}`);
  }
  return res.json();
}

async function createPage(env, title, blocks, type) {
  const firstBatch = blocks.slice(0, MAX_CHILDREN_PER_REQUEST);
  const rest = blocks.slice(MAX_CHILDREN_PER_REQUEST);

  const page = await notionFetch(env, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties: {
        Title: { title: [{ text: { content: title } }] },
        Type: { select: { name: type } },
        Status: { status: { name: "Solved" } },
      },
      children: firstBatch,
    }),
  });
  console.log(`✓ Created page: ${page.url}`);

  // Append remaining blocks in batches
  for (let i = 0; i < rest.length; i += MAX_CHILDREN_PER_REQUEST) {
    const batch = rest.slice(i, i + MAX_CHILDREN_PER_REQUEST);
    await notionFetch(env, `/blocks/${page.id}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: batch }),
    });
    console.log(`✓ Appended batch ${Math.floor(i / MAX_CHILDREN_PER_REQUEST) + 2} (${batch.length} blocks)`);
  }
  return page;
}

// ─── helpers ───────────────────────────────────────────────────────
function extractTitle(md, fallback) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[*_`#]/g, "").trim() : fallback;
}

function fail(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }

// ─── main ──────────────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const md = readFileSync(args.file, "utf8");
  const title = args.title || extractTitle(md, basename(args.file, ".md"));
  const blocks = mdToBlocks(md);

  console.log(`→ File:    ${args.file}`);
  console.log(`→ Title:   ${title}`);
  console.log(`→ Type:    ${args.type}`);
  console.log(`→ Blocks:  ${blocks.length}`);
  console.log(`→ DB:      ${env.NOTION_DATABASE_ID}`);
  console.log("");

  await createPage(env, title, blocks, args.type);
  console.log("\n✅ Done.");
}

main().catch((e) => fail(e.stack || e.message));
