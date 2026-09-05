import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeploymentManager } from "@/deployment/deployment-manager";
import { PublicUrlVerifier } from "@/deployment/verifier";
import { SelfHostedDeploymentAdapter } from "@/deployment/adapters/self-hosted";
import { GitHubPagesDeploymentAdapter } from "@/deployment/adapters/github-pages";
import { CloudflarePagesDeploymentAdapter } from "@/deployment/adapters/cloudflare-pages";
import type { Product } from "@/types/product";

describe("Phase 15: Real Deployment Bridge & Verification", () => {
  const mockProduct: Product = {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "DevTool Pro",
    slug: "devtool-pro",
    description: "Real test tool",
    product_type: "DEVELOPER_TOOL",
    status: "LIVE",
    build_status: "READY",
    version: "1.0.0",
    estimated_cost_inr: 0,
    actual_cost_inr: 0,
    cost_classification: "ZERO_COST",
    price: 0,
    currency: "INR",
    sales_count: 0,
    revenue: 0,
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe("SelfHostedDeploymentAdapter", () => {
    it("deploys product locally to /p/[slug] with zero external spend", async () => {
      const adapter = new SelfHostedDeploymentAdapter();
      const conn = await adapter.testConnection();
      expect(conn.connected).toBe(true);

      const result = await adapter.deploy({
        product: mockProduct,
        version: "1.0.0",
        isDemo: false,
      });

      expect(result.status).toBe("DEPLOYED");
      expect(result.provider).toBe("SELF_HOSTED");
      expect(result.publicUrl).toContain("/p/devtool-pro");
      expect(result.requiresManualSetup).toBe(false);
    });
  });

  describe("External Adapters Safety (GitHub & Cloudflare Pages)", () => {
    it("reports REQUIRES_MANUAL_SETUP when GitHub Pages credentials are not configured", async () => {
      const oldToken = process.env.GITHUB_PAGES_TOKEN;
      delete process.env.GITHUB_PAGES_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const adapter = new GitHubPagesDeploymentAdapter();
      const result = await adapter.deploy({
        product: mockProduct,
        version: "1.0.0",
        isDemo: false,
      });

      expect(result.status).toBe("REQUIRES_MANUAL_SETUP");
      expect(result.requiresManualSetup).toBe(true);
      expect(result.manualSetupInstructions?.why).toBeDefined();
      expect(result.manualSetupInstructions?.what).toBeDefined();

      if (oldToken) process.env.GITHUB_PAGES_TOKEN = oldToken;
    });

    it("reports REQUIRES_MANUAL_SETUP when Cloudflare Pages credentials are not configured", async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.CLOUDFLARE_ACCOUNT_ID;

      const adapter = new CloudflarePagesDeploymentAdapter();
      const result = await adapter.deploy({
        product: mockProduct,
        version: "1.0.0",
        isDemo: false,
      });

      expect(result.status).toBe("REQUIRES_MANUAL_SETUP");
      expect(result.requiresManualSetup).toBe(true);
      expect(result.manualSetupInstructions?.expectedResult).toContain("₹0 cost");
    });
  });

  describe("PublicUrlVerifier", () => {
    it("successfully verifies valid HTML page with matching keywords", async () => {
      const verifier = new PublicUrlVerifier();

      // Mock fetch
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: (header: string) => (header === "content-type" ? "text/html; charset=utf-8" : null),
        },
        text: async () => `<!DOCTYPE html><html><head><title>DevTool Pro</title></head><body><main id="root"><button>Process</button></main></body></html>`,
      }) as any;

      const result = await verifier.verifyUrl("http://localhost:3000/p/devtool-pro", {
        expectedKeywords: ["DevTool Pro"],
        checkSecrets: true,
      });

      expect(result.verified).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.secretsSafe).toBe(true);
      expect(result.uiElementsFound).toContain("HTML_SHELL");
      expect(result.uiElementsFound).toContain("INTERACTIVE_CONTROLS");
      expect(result.errors.length).toBe(0);

      global.fetch = globalFetch;
    });

    it("fails verification and flags critical error when secret pattern is detected", async () => {
      const verifier = new PublicUrlVerifier();

      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: () => "text/html",
        },
        text: async () => `<html><body><script>const key = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEA...";</script></body></html>`,
      }) as any;

      const result = await verifier.verifyUrl("http://localhost:3000/p/devtool-pro", {
        checkSecrets: true,
      });

      expect(result.verified).toBe(false);
      expect(result.secretsSafe).toBe(false);
      expect(result.errors.some((e) => e.includes("Sensitive credential pattern"))).toBe(true);

      global.fetch = globalFetch;
    });

    it("fails verification on HTTP 404 or 500 status", async () => {
      const verifier = new PublicUrlVerifier();

      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: {
          get: () => "text/html",
        },
        text: async () => `<html><body>404 Not Found</body></html>`,
      }) as any;

      const result = await verifier.verifyUrl("http://localhost:3000/p/missing-tool");
      expect(result.verified).toBe(false);
      expect(result.httpStatus).toBe(404);

      global.fetch = globalFetch;
    });
  });
});
