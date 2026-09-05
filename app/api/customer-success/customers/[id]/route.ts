import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerProfileByCustomerId,
  getCustomerHealthByCustomerId,
  listCustomerEvents,
  listCustomerSessions,
  listCustomerActivations,
  listCustomerGoals,
  listCustomerSupportRequests,
  listCustomerInterventions,
  listCustomerFeedback,
} from "@/database/repositories/customer-success-repo";
import { getCustomerById } from "@/database/repositories/sales-repo";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;
    const customer = await getCustomerById(customerId);
    const profile = await getCustomerProfileByCustomerId(customerId);
    const health = await getCustomerHealthByCustomerId(customerId);
    const events = await listCustomerEvents({ customer_id: customerId, limit: 50 });
    const sessions = await listCustomerSessions({ customer_id: customerId, limit: 20 });
    const activations = await listCustomerActivations({ limit: 10 });
    const custActivations = activations.filter((a) => a.customer_id === customerId);
    const goals = await listCustomerGoals({ customer_id: customerId });
    const support = await listCustomerSupportRequests({ customer_id: customerId, limit: 20 });
    const interventions = await listCustomerInterventions({ customer_id: customerId, limit: 20 });
    const feedback = await listCustomerFeedback({ customer_id: customerId, limit: 20 });

    return NextResponse.json({
      customer_id: customerId,
      customer,
      profile,
      health,
      events,
      sessions,
      activations: custActivations,
      goals,
      support,
      interventions,
      feedback,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
