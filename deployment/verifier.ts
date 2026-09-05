import type { UrlVerificationResult } from "@/types/deployment";
import type { VerificationOptions } from "./types";

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk_live_[0-9a-zA-Z]{24,}/,
  /ghp_[0-9a-zA-Z]{36}/,
  /postgres:\/\/[^:]+:[^@]+@/,
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/,
  /api[_-]?key\s*[:=]\s*['"][0-9a-zA-Z]{20,}['"]/i,
  /secret[_-]?token\s*[:=]\s*['"][0-9a-zA-Z]{20,}['"]/i,
];

export class PublicUrlVerifier {
  /**
   * Verifies a public URL via live HTTP request.
   * Checks HTTP status, latency, HTML content, UI markers, and scans for leaked credentials.
   */
  async verifyUrl(
    url: string,
    options: VerificationOptions = {}
  ): Promise<UrlVerificationResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 10000;
    const errors: string[] = [];
    const uiElementsFound: string[] = [];
    let secretsSafe = true;
    let httpStatus: number | undefined;
    let contentType: string | undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "ABOS-PublicVerifier/1.0 (+https://abos.local/verification)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      httpStatus = res.status;
      contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        errors.push(`HTTP check failed with status ${res.status} (${res.statusText})`);
      }

      const bodyText = await res.text();

      // Verify HTML content
      if (bodyText.includes("<html") || bodyText.includes("<!DOCTYPE") || bodyText.includes("<main")) {
        uiElementsFound.push("HTML_SHELL");
      } else {
        errors.push("Response body does not appear to contain valid HTML");
      }

      // Check for common UI landmarks
      if (bodyText.includes("id=") || bodyText.includes("class=")) {
        uiElementsFound.push("CSS_ATTRIBUTES");
      }
      if (bodyText.includes("<button") || bodyText.includes("<input") || bodyText.includes("<form")) {
        uiElementsFound.push("INTERACTIVE_CONTROLS");
      }

      // Check expected keywords if specified
      if (options.expectedKeywords && options.expectedKeywords.length > 0) {
        for (const kw of options.expectedKeywords) {
          if (bodyText.toLowerCase().includes(kw.toLowerCase())) {
            uiElementsFound.push(`KEYWORD_${kw}`);
          } else {
            errors.push(`Expected keyword "${kw}" was not found in rendered HTML`);
          }
        }
      }

      // Check for secret leaks
      if (options.checkSecrets !== false) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(bodyText)) {
            secretsSafe = false;
            errors.push("CRITICAL SECURITY: Sensitive credential pattern detected in public HTML response");
            break;
          }
        }
      }

      const responseTimeMs = Date.now() - startTime;
      const verified = errors.length === 0 && httpStatus === 200 && secretsSafe;

      return {
        verified,
        httpStatus,
        responseTimeMs,
        contentType,
        uiElementsFound,
        secretsSafe,
        errors,
        verifiedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      const responseTimeMs = Date.now() - startTime;
      const isTimeout = err.name === "AbortError";
      const errorMsg = isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : `Network/connection error: ${err.message}`;

      errors.push(errorMsg);

      return {
        verified: false,
        httpStatus: undefined,
        responseTimeMs,
        contentType: undefined,
        uiElementsFound: [],
        secretsSafe: true,
        errors,
        verifiedAt: new Date().toISOString(),
      };
    }
  }
}

export const publicUrlVerifier = new PublicUrlVerifier();
