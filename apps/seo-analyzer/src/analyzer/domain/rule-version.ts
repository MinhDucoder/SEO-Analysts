/**
 * Rule engine semver. Bump MINOR when adding a new rule (additive).
 * Bump MAJOR when an existing rule's scoring logic changes in a way that
 * may produce different results for the same input (observable drift).
 * Returned in AnalyzeContentResult.rule_version + X-Rule-Version header.
 */
export const RULE_VERSION = '1.2.0';
