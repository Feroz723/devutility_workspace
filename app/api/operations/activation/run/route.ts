import { NextResponse } from "next/server";
import { realBusinessCycleRunner } from "@/operations/real-cycle";

export async function POST() {
  try {
    const result = await realBusinessCycleRunner.runRealCycle();
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("Error executing real business cycle:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute real cycle" },
      { status: 500 }
    );
  }
}
