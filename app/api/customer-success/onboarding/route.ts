import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerOnboarding,
  listCustomerOnboarding,
} from "@/database/repositories/customer-success-repo";
import {
  initializeCustomerOnboarding,
  advanceOnboardingStep,
  getNextRecommendedAction,
} from "@/customer-success/onboarding";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id");
    const product_id = searchParams.get("product_id");

    if (customer_id && product_id) {
      const onboarding = await getCustomerOnboarding(customer_id, product_id);
      const nextAction = getNextRecommendedAction(onboarding);
      return NextResponse.json({ onboarding, next_action: nextAction });
    }

    const list = await listCustomerOnboarding({ product_id: product_id || undefined });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "advance_step") {
      if (!body.customer_id || !body.product_id || !body.step_id) {
        return NextResponse.json(
          { error: "customer_id, product_id, and step_id are required" },
          { status: 400 }
        );
      }
      const updated = await advanceOnboardingStep(body.customer_id, body.product_id, body.step_id);
      return NextResponse.json(updated);
    }

    if (!body.customer_id || !body.product_id) {
      return NextResponse.json(
        { error: "customer_id and product_id are required" },
        { status: 400 }
      );
    }

    const onboarding = await initializeCustomerOnboarding(
      body.customer_id,
      body.product_id,
      body.steps,
      body.is_demo
    );
    return NextResponse.json(onboarding);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
