import { NextRequest, NextResponse } from "next/server";
import { executeResearchCycle } from "@/research/cycle";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ManualResearchSchema = z.object({
  target: z.string().min(5).max(4000), // Can be a URL or a problem statement
});

/**
 * POST /api/research/manual
 * Owner-initiated targeted research on a specific URL or problem topic.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ManualResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid manual research input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await executeResearchCycle({
      queries: [parsed.data.target],
      providers: ["web_manual"],
      triggerSource: "manual",
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] POST /api/research/manual error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
