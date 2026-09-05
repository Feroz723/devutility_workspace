import { NextRequest, NextResponse } from "next/server";
import { SalesRunner } from "@/sales/runner";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  try {
    const result = await SalesRunner.runCycle();
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
