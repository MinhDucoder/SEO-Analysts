import type { LLMRequest, Message } from '../llm/types.js';
import type { Policy, PolicyResult } from './types.js';

export interface ApplyPolicyOutput {
  request: LLMRequest;
  result: PolicyResult;
}

export function applyPolicy(req: LLMRequest, policy: Policy): ApplyPolicyOutput {
  const changes: string[] = [];
  let messages: Message[] = req.messages.map((m) => ({ ...m }));
  let maxTokens = req.maxTokens;

  // 1. Clamp maxTokens DOWN
  if (policy.maxTokens !== undefined && maxTokens !== undefined && maxTokens > policy.maxTokens) {
    changes.push(`maxTokens clamped: ${maxTokens} → ${policy.maxTokens}`);
    maxTokens = policy.maxTokens;
  } else if (policy.maxTokens !== undefined && maxTokens === undefined) {
    maxTokens = policy.maxTokens;
    changes.push(`maxTokens set by policy: ${policy.maxTokens}`);
  }

  // 2. Truncate messages keeping LAST N (most recent)
  if (policy.maxMessages !== undefined && messages.length > policy.maxMessages) {
    const before = messages.length;
    messages = messages.slice(-policy.maxMessages);
    changes.push(`messages truncated: ${before} → ${messages.length} (kept last)`);
  }

  // 3. Redact PII
  if (policy.redactPatterns?.length) {
    let totalReplacements = 0;
    messages = messages.map((m) => {
      let content = m.content;
      for (const p of policy.redactPatterns!) {
        const re = new RegExp(p.source, p.flags);
        const matches = content.match(re);
        if (matches) {
          totalReplacements += matches.length;
          content = content.replace(re, '[REDACTED]');
        }
      }
      return { ...m, content };
    });
    if (totalReplacements > 0) {
      changes.push(`redacted ${totalReplacements} match(es) across messages`);
    }
  }

  return {
    request: {
      ...req,
      messages,
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    },
    result: {
      applied: changes.length > 0,
      changes,
    },
  };
}
