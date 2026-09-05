import { NextRequest, NextResponse } from "next/server";
import { listCustomerFeedback } from "@/database/repositories/customer-success-repo";
import { submitCustomerFeedback, getFeedbackSummary } from "@/customer-success/feedback";
import type { FeedbackType } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get("product_id") || undefined;
    const customer_id = searchParams.get("customer_id") || undefined;
    const feedback_type = (searchParams.get("feedback_type") as FeedbackType) || undefined;
    const sentiment = searchParams.get("sentiment") || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const [items, summary] = await Promise.all([
      listCustomerFeedback({ product_id, customer_id, feedback_type, sentiment, is_demo, limit }),
      getFeedbackSummary({ product_id, is_demo }),
    ]);

    return NextResponse.json({ items, summary });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.feedback_type) {
      return NextResponse.json(
        { error: "customer_id and feedback_type are required" },
        { status: 400 }
      );
    }

    const feedback = await submitCustomerFeedback(body);
    return NextResponse.json(feedback);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
