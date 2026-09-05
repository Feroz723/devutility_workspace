import { NextResponse } from "next/server";
import { realityRunner } from "@/simulation/reality-runner";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await realityRunner.resetSimulation();
    return NextResponse.json({
      success: true,
      message: "Simulation data reset successfully. Production tables remain untouched.",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reset simulation data" },
      { status: 500 }
    );
  }
}
