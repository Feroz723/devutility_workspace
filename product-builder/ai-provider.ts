import type { ProductSpecification } from "./types";
import type { ProductBuildTask } from "@/types/product";

export interface AIProductGenPrompt {
  spec: ProductSpecification;
  task: ProductBuildTask;
  context?: string;
}

export interface AIProvider {
  name: string;
  generateTaskAsset(prompt: AIProductGenPrompt): Promise<string>;
}

/**
 * Deterministic template provider that generates reproducible, high-quality,
 * TypeScript and Markdown assets offline without external API dependencies or costs.
 */
export class DeterministicTemplateProvider implements AIProvider {
  name = "deterministic-template";

  async generateTaskAsset(prompt: AIProductGenPrompt): Promise<string> {
    const { spec, task } = prompt;
    const slug = spec.identity.slug;
    const name = spec.identity.name;
    const type = spec.identity.product_type;

    switch (task.type) {
      case "SCHEMA":
        return `// Generated schema for ${name} (${type})
// Zero-cost compliant
export interface ${toPascalCase(slug)}Input {
  primaryInput: string;
  mode?: 'fast' | 'detailed' | 'compact';
}

export interface ${toPascalCase(slug)}Result {
  id: string;
  output: string;
  processedAt: string;
  metrics: {
    durationMs: number;
    inputLength: number;
    outputLength: number;
  };
}

export interface ${toPascalCase(slug)}HistoryItem {
  id: string;
  input: string;
  result: ${toPascalCase(slug)}Result;
  timestamp: string;
}
`;

      case "REPOSITORY":
        return `// Generated local storage repository for ${name}
import type { ${toPascalCase(slug)}HistoryItem } from '../../types/generated/${slug}';

const STORAGE_KEY = 'abos_product_${slug}_history';

export function get${toPascalCase(slug)}History(): ${toPascalCase(slug)}HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
}

export function save${toPascalCase(slug)}HistoryItem(record: ${toPascalCase(slug)}HistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = get${toPascalCase(slug)}History();
    const updated = [record, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save to local storage', err);
  }
}

export function clear${toPascalCase(slug)}History(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
`;

      case "API":
        return `// Generated pure business logic engine for ${name}
import type { ${toPascalCase(slug)}Input, ${toPascalCase(slug)}Result } from '../../types/generated/${slug}';

export function execute${toPascalCase(slug)}Core(input: ${toPascalCase(slug)}Input): ${toPascalCase(slug)}Result {
  const start = Date.now();
  const raw = (input.primaryInput || '').trim();

  if (!raw) {
    throw new Error('Input must not be empty.');
  }

  // Core deterministic transformation
  let output = raw;
  if (input.mode === 'compact') {
    output = raw.replace(/\\s+/g, ' ');
  } else if (input.mode === 'detailed') {
    output = \`Processed: \${raw}\\nLength: \${raw.length} characters\\nWords: \${raw.split(/\\s+/).filter(Boolean).length}\`;
  } else {
    // fast mode
    output = raw.toUpperCase();
  }

  const durationMs = Math.max(1, Date.now() - start);

  return {
    id: 'res_' + Math.random().toString(36).substring(2, 9),
    output,
    processedAt: new Date().toISOString(),
    metrics: {
      durationMs,
      inputLength: raw.length,
      outputLength: output.length,
    },
  };
}
`;

      case "UI":
        return `// Interactive UI component for ${name}
"use client";

import React, { useState, useEffect } from "react";
import { execute${toPascalCase(slug)}Core } from "@/lib/engines/${slug}-engine";
import { get${toPascalCase(slug)}History, save${toPascalCase(slug)}HistoryItem, clear${toPascalCase(slug)}History } from "@/lib/storage/${slug}-store";
import type { ${toPascalCase(slug)}Result, ${toPascalCase(slug)}HistoryItem } from "@/types/generated/${slug}";

export default function ${toPascalCase(slug)}View() {
  const [inputVal, setInputVal] = useState("");
  const [mode, setMode] = useState<"fast" | "detailed" | "compact">("fast");
  const [result, setResult] = useState<${toPascalCase(slug)}Result | null>(null);
  const [history, setHistory] = useState<${toPascalCase(slug)}HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(get${toPascalCase(slug)}History());
  }, []);

  const handleRun = () => {
    setError(null);
    try {
      const res = execute${toPascalCase(slug)}Core({ primaryInput: inputVal, mode });
      setResult(res);
      const record: ${toPascalCase(slug)}HistoryItem = {
        id: res.id,
        input: inputVal,
        result: res,
        timestamp: new Date().toISOString(),
      };
      save${toPascalCase(slug)}HistoryItem(record);
      setHistory((prev) => [record, ...prev].slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing error");
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="border border-border/40 rounded-xl bg-card/60 p-6 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">${name}</h1>
        <p className="text-sm text-muted-foreground mt-1">${spec.identity.tagline}</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Input Data
            </label>
            <textarea
              className="w-full bg-background border border-border/60 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              placeholder="Enter text, parameters, or data to process..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Mode:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="bg-background border border-border/60 rounded px-2.5 py-1 text-xs text-foreground"
            >
              <option value="fast">Fast (Instant)</option>
              <option value="detailed">Detailed Analysis</option>
              <option value="compact">Compact Space</option>
            </select>

            <button
              onClick={handleRun}
              className="ml-auto px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition"
            >
              Execute
            </button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 rounded-lg bg-background border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Result ({result.metrics.durationMs}ms)
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90"
                >
                  {copied ? "Copied!" : "Copy Result"}
                </button>
              </div>
              <pre className="p-3 bg-muted/40 rounded text-xs font-mono whitespace-pre-wrap break-all">
                {result.output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

      case "DOCUMENTATION":
        return `# ${name}

> ${spec.identity.tagline}

## Overview
- **Type**: \`${type}\`
- **Cost**: ₹0 to build and ₹0 to operate
- **Audience**: ${spec.problem_solution.target_audience}

## Core Problem
${spec.problem_solution.validated_problem}

## Solution
${spec.problem_solution.solution_statement}

## Anti-Bloat Scope (Strict MVP)
### Included in v1:
${spec.scope.mvp_features.map((f) => `- **${f.name}**: ${f.description}`).join("\n")}

### Non-Goals:
${spec.scope.explicit_non_goals.map((ng) => `- ❌ ${ng}`).join("\n")}

## Quick Start
1. Open the tool locally or on your deployed web portal.
2. Enter your inputs and select desired execution mode.
3. Click **Execute** for instant client-side processing.
4. Copy results or export locally.
`;

      case "TEST":
        return `import { describe, it, expect } from "vitest";
import { execute${toPascalCase(slug)}Core } from "../../lib/engines/${slug}-engine";

describe("${name} Core Business Logic", () => {
  it("processes input in fast mode successfully", () => {
    const res = execute${toPascalCase(slug)}Core({ primaryInput: "hello world", mode: "fast" });
    expect(res.output).toBe("HELLO WORLD");
    expect(res.metrics.inputLength).toBe(11);
    expect(res.metrics.durationMs).toBeGreaterThanOrEqual(1);
  });

  it("handles detailed mode correctly", () => {
    const res = execute${toPascalCase(slug)}Core({ primaryInput: "quick test", mode: "detailed" });
    expect(res.output).toContain("Processed: quick test");
    expect(res.output).toContain("Words: 2");
  });

  it("throws clear error on empty input", () => {
    expect(() => execute${toPascalCase(slug)}Core({ primaryInput: "   " })).toThrowError("Input must not be empty.");
  });
});
`;

      case "PACKAGING":
        return JSON.stringify(
          {
            name: `@abos-products/${slug}`,
            version: spec.identity.version,
            description: spec.identity.tagline,
            product_type: spec.identity.product_type,
            license: "MIT",
            private: true,
            cost_inr: 0,
            zero_cost_verified: true,
            dependencies: {},
            peerDependencies: {
              react: "^18.0.0",
              "react-dom": "^18.0.0",
              next: ">=14.0.0",
            },
          },
          null,
          2
        );

      default:
        return `// Asset for ${task.name}\n// Auto-generated by Autonomous Product Builder\n`;
    }
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase());
}
