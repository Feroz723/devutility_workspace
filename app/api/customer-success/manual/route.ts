import { NextRequest, NextResponse } from "next/server";
import { getEmailProviderStatus } from "@/customer-success/email";
import {
  listCustomerInterventions,
  listCustomerSupportRequests,
} from "@/database/repositories/customer-success-repo";

export async function GET(req: NextRequest) {
  try {
    const emailStatus = getEmailProviderStatus();
    const pendingApprovals = await listCustomerInterventions({
      status: "PROPOSED",
      limit: 20,
    });
    const manualDispatches = await listCustomerInterventions({
      status: "REQUIRES_MANUAL_ACTION",
      limit: 20,
    });
    const openTickets = await listCustomerSupportRequests({
      status: "OPEN",
      limit: 20,
    });

    return NextResponse.json({
      email_provider: emailStatus,
      pending_approvals: pendingApprovals,
      manual_dispatches: manualDispatches,
      open_tickets: openTickets,
      requires_action_count: pendingApprovals.length + manualDispatches.length + openTickets.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
