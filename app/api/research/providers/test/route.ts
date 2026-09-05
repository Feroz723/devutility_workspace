import { NextRequest, NextResponse } from "next/server";
import { testProvider } from "@/research/providers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TestRequestSchema = z.object({
  providerId: z.string().min(1),
});

/**
 * POST /api/research/providers/test
 * Tests the live connectivity of a specified research provider.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TestRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing providerId in payload" }, { status: 400 });
    }

    const result = await testProvider(parsed.data.providerId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] POST /api/research/providers/test error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
