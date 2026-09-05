import { NextRequest, NextResponse } from "next/server";
import { integrationRegistry } from "@/operations/integration-registry";

export async function GET(req: NextRequest) {
  try {
    const integrations = await integrationRegistry.checkAllIntegrations();
    return NextResponse.json({ integrations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
