import { NextRequest, NextResponse } from "next/server";
import { listCustomers } from "@/database/repositories/sales-repo";
import { CustomerManager } from "@/sales/customer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeDemo = url.searchParams.get("include_demo") === "true";
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : 0;

    const customers = await listCustomers({ includeDemo, limit, offset });
    return NextResponse.json({ customers, total: customers.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json?.email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const customer = await CustomerManager.getOrCreateCustomer({
      email: json.email,
      name: json.name,
      phone: json.phone,
      country: json.country,
      source: json.source,
      isDemo: json.is_demo,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
