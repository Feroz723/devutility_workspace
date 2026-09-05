import { describe, it, expect } from "vitest";
import { classifyAction } from "@/decision-engine/zero-spend-guard";

describe("Decision Engine — Zero-Spend Guard", () => {
  it("allows ₹0, reversible, non-sensitive action as FREE", () => {
    const result = classifyAction({
      estimated_cost_inr: 0,
      is_reversible: true,
      is_sensitive: false,
      action_type: "generate_mockup",
      description: "Generate static markdown report",
    });

    expect(result.classification).toBe("FREE");
    expect(result.requires_human_approval).toBe(false);
  });

  it("requires approval for any action with cost > ₹0", () => {
    const result = classifyAction({
      estimated_cost_inr: 500,
      is_reversible: true,
      is_sensitive: false,
      action_type: "paid_api_call",
      description: "Query paid third-party API",
    });

    expect(result.classification).toBe("REQUIRES_APPROVAL");
    expect(result.requires_human_approval).toBe(true);
    expect(result.reason).toContain("₹500");
  });

  it("requires approval for sensitive action types even at ₹0", () => {
    const result = classifyAction({
      estimated_cost_inr: 0,
      is_reversible: true,
      is_sensitive: true,
      action_type: "external_api_call",
      description: "Connect to live production endpoint",
    });

    expect(result.classification).toBe("REQUIRES_APPROVAL");
    expect(result.requires_human_approval).toBe(true);
  });

  it("requires approval for irreversible action even at ₹0", () => {
    const result = classifyAction({
      estimated_cost_inr: 0,
      is_reversible: false,
      is_sensitive: false,
      action_type: "deploy_permanent",
      description: "Deploy non-removable public artifact",
    });

    expect(result.classification).toBe("REQUIRES_APPROVAL");
    expect(result.requires_human_approval).toBe(true);
  });

  it("requires approval for domain purchase or advertising even if reported at ₹0", () => {
    const domainResult = classifyAction({
      estimated_cost_inr: 0,
      is_reversible: true,
      is_sensitive: false,
      action_type: "domain_purchase",
      description: "Claim custom domain",
    });
    expect(domainResult.classification).toBe("REQUIRES_APPROVAL");

    const adResult = classifyAction({
      estimated_cost_inr: 0,
      is_reversible: true,
      is_sensitive: false,
      action_type: "run_advertising_campaign",
      description: "Run test ad campaign",
    });
    expect(adResult.classification).toBe("REQUIRES_APPROVAL");
  });

  it("permanently BLOCKS prohibited, fraudulent, or malicious actions", () => {
    const prohibitedActions = [
      "malicious_script_exec",
      "spam_outreach",
      "deceptive_landing_page",
      "fraudulent_transaction",
      "prohibited_content",
    ];

    for (const action_type of prohibitedActions) {
      const result = classifyAction({
        estimated_cost_inr: 0,
        is_reversible: false,
        is_sensitive: true,
        action_type,
        description: "Attempt prohibited behavior",
      });

      expect(result.classification).toBe("BLOCKED");
      expect(result.requires_human_approval).toBe(false);
    }
  });
});
