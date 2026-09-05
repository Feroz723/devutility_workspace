import { NextRequest, NextResponse } from "next/server";
import { queryMany } from "@/database/client";
import { intelligenceRepo } from "@/database/repositories/intelligence-repo";
import { productIterationEngine } from "@/intelligence/product-iteration";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get("is_demo") === "true";

    const [pendingDecisions, pendingAdapters, risks, proposals] = await Promise.all([
      intelligenceRepo.listDecisions({
        is_demo: isDemo,
        status: "PROPOSED",
        limit: 50,
      }),
      queryMany<any>(
        `SELECT provider_name, status, category, setup_guide_url
         FROM integration_adapters
         WHERE status IN ('NOT_CONNECTED', 'REQUIRES_APPROVAL') AND is_demo = $1`,
        [isDemo]
      ),
      intelligenceRepo.listRisks({ is_demo: isDemo, severity: "CRITICAL" }),
      productIterationEngine.generateProposals(undefined, isDemo),
    ]);

    const approvalPendingDecisions = pendingDecisions.filter((d) => d.requires_approval);

    return NextResponse.json({
      pending_approvals: approvalPendingDecisions,
      unconnected_integrations: pendingAdapters,
      critical_risks: risks,
      product_proposals: proposals,
      total_pending_actions:
        approvalPendingDecisions.length + pendingAdapters.length + risks.length + proposals.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
