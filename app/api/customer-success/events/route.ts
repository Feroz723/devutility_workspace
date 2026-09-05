import { NextRequest, NextResponse } from "next/server";
import { ingestCustomerEvent } from "@/customer-success/events";
import { listCustomerEvents } from "@/database/repositories/customer-success-repo";
import type { CustomerEventType } from "@/types/customer-success";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id || !body.event_type || !body.event_name) {
      return NextResponse.json(
        { error: "customer_id, event_type, and event_name are required" },
        { status: 400 }
      );
    }

    const result = await ingestCustomerEvent(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id") || undefined;
    const product_id = searchParams.get("product_id") || undefined;
    const event_type = (searchParams.get("event_type") as CustomerEventType) || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const events = await listCustomerEvents({
      customer_id,
      product_id,
      event_type,
      is_demo,
      limit,
    });

    return NextResponse.json(events);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
