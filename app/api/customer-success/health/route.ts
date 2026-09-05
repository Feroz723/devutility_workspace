import { NextRequest, NextResponse } from "next/server";
import {
  listCustomerHealth,
  getCustomerHealthByCustomerId,
} from "@/database/repositories/customer-success-repo";
import { calculateCustomerHealth } from "@/customer-success/health";
import type { CustomerHealthStatus } from "@/types/customer-success";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id") || undefined;
    const status = (searchParams.get("status") as CustomerHealthStatus) || undefined;
    const is_demo = searchParams.get("is_demo") !== null ? searchParams.get("is_demo") === "true" : undefined;

    if (customer_id) {
      const health = await getCustomerHealthByCustomerId(customer_id);
      return NextResponse.json(health);
    }

    const list = await listCustomerHealth({ status, is_demo });
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.customer_id) {
      return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
    }

    const result = await calculateCustomerHealth(body.customer_id, body.product_id, body.is_demo);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
