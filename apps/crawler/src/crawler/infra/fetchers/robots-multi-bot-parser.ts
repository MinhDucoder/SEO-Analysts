export const AI_BOT_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
] as const;

export interface ParsedUserAgentRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

export function parseRobotsForAiBots(robotsTxt: string): ParsedUserAgentRule[] {
  if (!robotsTxt.trim()) return [];

  const targets = new Map<string, string>(
    AI_BOT_USER_AGENTS.map((ua) => [ua.toLowerCase(), ua]),
  );
  const accum = new Map<string, ParsedUserAgentRule>();
  let activeAgents: string[] = [];

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) {
      activeAgents = [];
      continue;
    }
    const match = /^([A-Za-z-]+)\s*:\s*(.+)$/.exec(line);
    if (!match) continue;
    const directive = match[1].toLowerCase();
    const value = match[2].trim();

    if (directive === 'user-agent') {
      const canonical = targets.get(value.toLowerCase());
      if (canonical) {
        activeAgents.push(canonical);
        if (!accum.has(canonical)) {
          accum.set(canonical, { userAgent: canonical, disallow: [], allow: [] });
        }
      }
      continue;
    }

    if (directive === 'disallow') {
      for (const agent of activeAgents) accum.get(agent)!.disallow.push(value);
    } else if (directive === 'allow') {
      for (const agent of activeAgents) accum.get(agent)!.allow.push(value);
    }
  }

  return Array.from(accum.values());
}
