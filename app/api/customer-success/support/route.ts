import { NextRequest, NextResponse } from "next/server";
import {
  listCustomerSupportRequests,
} from "@/database/repositories/customer-success-repo";
import { createSupportTicket } from "@/customer-success/support";
import type { SupportStatus, SupportSeverity, SupportCategory } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id") || undefined;
    const product_id = searchParams.get("product_id") || undefined;
    const status = (searchParams.get("status") as SupportStatus) || undefined;
    const severity = (searchParams.get("severity") as SupportSeverity) || undefined;
    const category = (searchParams.get("category") as SupportCategory) || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const tickets = await listCustomerSupportRequests({
      customer_id,
      product_id,
      status,
      severity,
      category,
      is_demo,
      limit,
    });

    return NextResponse.json(tickets);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.subject || !body.description) {
      return NextResponse.json(
        { error: "customer_id, subject, and description are required" },
        { status: 400 }
      );
    }

    const ticket = await createSupportTicket(body);
    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
