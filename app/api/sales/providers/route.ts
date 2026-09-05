import { NextRequest, NextResponse } from "next/server";
import { testAllProviders } from "@/sales/providers";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const statuses = await testAllProviders();
    return NextResponse.json({ providers: statuses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
