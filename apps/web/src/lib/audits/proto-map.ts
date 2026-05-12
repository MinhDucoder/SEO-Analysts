import type {
  ProtoCheckStatus,
  ProtoIssueCategory,
} from "@/lib/api/types";
import type { RuleStatus } from "@/components/domain/rule-result-row";

/**
 * Helpers for collapsing proto-style enum strings into the short tokens
 * the UI uses. Keeps the proto naming quirk inside this module so
 * components see clean `pass | warn | fail | skipped` everywhere.
 */

export function protoCheckToRuleStatus(value: ProtoCheckStatus): RuleStatus {
  switch (value) {
    case "CHECK_STATUS_PASS":
      return "pass";
    case "CHECK_STATUS_WARN":
      return "warn";
    case "CHECK_STATUS_FAIL":
      return "fail";
    case "CHECK_STATUS_UNSPECIFIED":
    default:
      return "skipped";
  }
}

export type IssueCategoryKey =
  | "meta"
  | "headings"
  | "images"
  | "links"
  | "performance"
  | "technical"
  | "other";

export function protoCategoryToKey(value: ProtoIssueCategory): IssueCategoryKey {
  switch (value) {
    case "ISSUE_CATEGORY_META":
      return "meta";
    case "ISSUE_CATEGORY_HEADINGS":
      return "headings";
    case "ISSUE_CATEGORY_IMAGES":
      return "images";
    case "ISSUE_CATEGORY_LINKS":
      return "links";
    case "ISSUE_CATEGORY_PERFORMANCE":
      return "performance";
    case "ISSUE_CATEGORY_TECHNICAL":
      return "technical";
    default:
      return "other";
  }
}
