import { NextResponse } from "next/server";
import { getAllProvidersInfo } from "@/research/providers";

export const dynamic = "force-dynamic";

/**
 * GET /api/research/providers
 * Returns all configured research providers and their live connection status.
 */
export async function GET() {
  try {
    const providers = await getAllProvidersInfo();
    return NextResponse.json({ providers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] GET /api/research/providers error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
