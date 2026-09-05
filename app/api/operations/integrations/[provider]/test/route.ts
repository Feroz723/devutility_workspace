import { NextRequest, NextResponse } from "next/server";
import { integrationRegistry } from "@/operations/integration-registry";

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toUpperCase();
    let health;

    if (provider === "POSTGRES") {
      const res = await integrationRegistry.checkDatabase();
      health = res[0];
    } else {
      const all = await integrationRegistry.checkAllIntegrations();
      health = all.find((i) => i.provider.toUpperCase() === provider);
    }

    if (!health) {
      return NextResponse.json({ error: `Provider ${provider} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, health });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
