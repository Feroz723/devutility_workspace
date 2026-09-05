/**
 * Prompt Injection Defense
 * =========================
 * Treats all external web content strictly as untrusted DATA.
 * Prevents prompt injection payloads from influencing system behavior.
 */

// Common injection patterns found in adversarial or scraped text
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+(an?\s+)?unrestricted/i,
  /disregard\s+(the\s+)?above/i,
  /purchase\s+this\s+product/i,
  /execute\s+command/i,
  /reveal\s+(the\s+)?(api_key|token|password|secret)/i,
  /do\s+not\s+follow\s+safety/i,
];

export interface SanitizedContent {
  raw: string;
  sanitized: string;
  hasInjectionRisk: boolean;
  detectedPatterns: string[];
}

/**
 * Sanitize external text before it is fed to any LLM prompt.
 * 1. Neutralizes delimiter attacks (e.g. </untrusted_data>)
 * 2. Scans for adversarial override commands and flags them
 * 3. Enforces length caps to prevent context window overflow
 */
export function sanitizeExternalText(
  rawText: string,
  options?: { maxChars?: number }
): SanitizedContent {
  const maxChars = options?.maxChars ?? 6000;
  let text = (rawText || "").slice(0, maxChars);

  // Detect injection attempts
  const detectedPatterns: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(pattern.source);
    }
  }

  // Neutralize XML-like breakout tags
  text = text
    .replace(/<\/?(system|instructions?|prompt|user|assistant|untrusted[^>]*)>/gi, "[REMOVED_TAG]")
    .replace(/```(system|bash|sh|cmd|powershell)/gi, "```text");

  return {
    raw: rawText,
    sanitized: text,
    hasInjectionRisk: detectedPatterns.length > 0,
    detectedPatterns,
  };
}

/**
 * Wrap external data in strict unexecutable fences for LLM extraction prompts.
 */
export function formatDataBlock(label: string, content: string): string {
  const sanitized = sanitizeExternalText(content).sanitized;
  return `
<EXTERNAL_UNTRUSTED_DATA_${label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}>
${sanitized}
</EXTERNAL_UNTRUSTED_DATA_${label.toUpperCase().replace(/[^A-Z0-9]/g, "_")}>
`;
}
