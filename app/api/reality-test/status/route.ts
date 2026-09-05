import { NextResponse } from "next/server";
import { realityRunner } from "@/simulation/reality-runner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await realityRunner.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch reality test status" },
      { status: 500 }
    );
  }
}
