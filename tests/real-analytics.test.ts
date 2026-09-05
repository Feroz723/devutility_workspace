import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as trackHandler } from "@/app/api/analytics/track/route";
import { POST as feedbackHandler } from "@/app/api/analytics/feedback/route";
import { NextRequest } from "next/server";
import * as client from "@/database/client";

describe("Phase 15: Real Analytics & Feedback Telemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("provisions anonymous lead and tracks real PAGE_VIEW event", async () => {
    const mockQueryOne = vi.spyOn(client, "queryOne");
    const mockQuery = vi.spyOn(client, "query");

    // 1. Provision customer
    mockQueryOne.mockResolvedValueOnce({ id: "cust-111" } as any);
    // 2. Existing session check
    mockQueryOne.mockResolvedValueOnce({ id: "sess-222" } as any);
    // 3. Update session views
    mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);
    // 4. Insert event
    mockQueryOne.mockResolvedValueOnce({
      id: "evt-333",
      created_at: new Date().toISOString(),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod-001",
        visitorId: "v_test999",
        sessionToken: "sess_tok_abc",
        eventType: "PAGE_VIEW",
        eventName: "product_page_viewed",
        properties: { utm_source: "github" },
        isDemo: false,
      }),
    });

    const res = await trackHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.realm).toBe("REAL");
    expect(json.customerId).toBe("cust-111");
    expect(json.sessionId).toBe("sess-222");
    expect(json.eventId).toBe("evt-333");
  });

  it("tracks real CORE_ACTION executed by user", async () => {
    const mockQueryOne = vi.spyOn(client, "queryOne");
    const mockQuery = vi.spyOn(client, "query");

    // 1. Customer
    mockQueryOne.mockResolvedValueOnce({ id: "cust-111" } as any);
    // 2. Session
    mockQueryOne.mockResolvedValueOnce({ id: "sess-222" } as any);
    // 3. Update session actions
    mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);
    // 4. Insert event
    mockQueryOne.mockResolvedValueOnce({
      id: "evt-444",
      created_at: new Date().toISOString(),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod-001",
        visitorId: "v_test999",
        sessionToken: "sess_tok_abc",
        eventType: "CORE_ACTION",
        eventName: "utility_action_executed",
        properties: { toolMode: "ANALYZE", charCount: 150 },
        isDemo: false,
      }),
    });

    const res = await trackHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.realm).toBe("REAL");
  });

  it("records user feedback with computed sentiment and real demarcation", async () => {
    const mockQueryOne = vi.spyOn(client, "queryOne");

    // Customer
    mockQueryOne.mockResolvedValueOnce({ id: "cust-111" } as any);
    // Feedback
    mockQueryOne.mockResolvedValueOnce({
      id: "fb-555",
      created_at: new Date().toISOString(),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/analytics/feedback", {
      method: "POST",
      body: JSON.stringify({
        productId: "prod-001",
        visitorId: "v_test999",
        rating: 5,
        category: "USABILITY",
        comment: "Excellent fast zero-cost utility!",
        isDemo: false,
      }),
    });

    const res = await feedbackHandler(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.realm).toBe("REAL");
    expect(json.feedbackId).toBe("fb-555");
  });

  it("rejects invalid tracking requests lacking productId or visitorId", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({
        eventType: "PAGE_VIEW",
      }),
    });

    const res = await trackHandler(req);
    expect(res.status).toBe(400);
  });
});
