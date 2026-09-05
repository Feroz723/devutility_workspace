import type { ProductBuildPlan } from "@/types/product";

export interface ZeroCostCheckResult {
  compliant: boolean;
  estimatedCostInr: number;
  flaggedItems: string[];
  notes: string[];
}

export interface SecretScanResult {
  hasSecrets: boolean;
  findings: Array<{
    line: number;
    rule: string;
    snippet: string;
  }>;
}

// Patterns of services/dependencies that require paid subscriptions or incur variable costs
const FORBIDDEN_PAID_PATTERNS = [
  { pattern: /\b(aws[_-]rds|aws[_-]aurora)\b/i, name: "AWS Relational Database Service (Paid)" },
  { pattern: /\b(openai\b(?!.*free)|gpt-4-32k|claude-3-opus)\b/i, name: "Paid LLM API tier" },
  { pattern: /\b(stripe|paddle|lemon\s*squeezy)\b/i, name: "Paid Payment Gateway (Reserved for Phase 7)" },
  { pattern: /\b(twilio|sendgrid|mailgun)\b/i, name: "Paid SMS/Email Service" },
  { pattern: /\b(algolia|pinecone[_-]paid)\b/i, name: "Paid Vector/Search Engine" },
  { pattern: /\b(paid[_-]domain|godaddy|namecheap)\b/i, name: "Paid Custom Domain Registration" },
];

// Patterns for potential credentials or secrets
const SECRET_SCAN_PATTERNS = [
  { regex: /AKIA[0-9A-Z]{16}/, name: "AWS Access Key" },
  { regex: /sk-[a-zA-Z0-9]{20,}/, name: "OpenAI Secret Key" },
  { regex: /ghp_[a-zA-Z0-9]{36}/, name: "GitHub Personal Access Token" },
  { regex: /-----BEGIN (RSA|EC|OPENSSH|PGP)? ?PRIVATE KEY-----/, name: "Private Cryptographic Key" },
  { regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, name: "Hardcoded JWT Token" },
  { regex: /postgres:\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/, name: "Hardcoded Database Connection URI with password" },
];

/**
 * Validates that a proposed build plan and tech stack incur ₹0 operational and build costs.
 */
export function verifyZeroCostBuild(
  plan?: ProductBuildPlan | null,
  techStack?: string[] | null
): ZeroCostCheckResult {
  const flaggedItems: string[] = [];
  const notes: string[] = [];

  const itemsToScan: string[] = [];

  if (techStack && Array.isArray(techStack)) {
    itemsToScan.push(...techStack);
  }

  if (plan && plan.tasks) {
    for (const task of plan.tasks) {
      itemsToScan.push(task.name);
      if (task.description) itemsToScan.push(task.description);
      if (task.generated_code) itemsToScan.push(task.generated_code);
    }
  }

  for (const text of itemsToScan) {
    for (const rule of FORBIDDEN_PAID_PATTERNS) {
      if (rule.pattern.test(text)) {
        flaggedItems.push(`${rule.name} detected in: "${text.substring(0, 80)}"`);
      }
    }
  }

  const compliant = flaggedItems.length === 0;

  if (compliant) {
    notes.push("Zero-cost architecture verified: relies exclusively on Next.js, local runtime, client-side state, or existing free resources.");
  } else {
    notes.push("Paid infrastructure or non-free services detected. Build must be blocked or modified to reach ₹0 cost.");
  }

  return {
    compliant,
    estimatedCostInr: compliant ? 0 : 500, // Non-zero if flagged
    flaggedItems,
    notes,
  };
}

/**
 * Scans code or documentation text for leaked secrets or credentials.
 */
export function scanForSecrets(content: string): SecretScanResult {
  const findings: SecretScanResult["findings"] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    for (const rule of SECRET_SCAN_PATTERNS) {
      if (rule.regex.test(line)) {
        findings.push({
          line: i + 1,
          rule: rule.name,
          snippet: line.trim().substring(0, 60) + "...",
        });
      }
    }

  }

  return {
    hasSecrets: findings.length > 0,
    findings,
  };
}
