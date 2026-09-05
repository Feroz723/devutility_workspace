import { NextResponse } from "next/server";
import { realityRunner } from "@/simulation/reality-runner";
import { ScenarioId } from "@/types/reality-test";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is allowed, defaults to run all
    }

    const { scenario_id, triggered_by } = body;

    if (scenario_id) {
      const parsedScenario = ScenarioId.safeParse(scenario_id);
      if (!parsedScenario.success) {
        return NextResponse.json(
          { success: false, error: `Invalid scenario_id: ${scenario_id}` },
          { status: 400 }
        );
      }

      const result = await realityRunner.runSingleScenario(parsedScenario.data, {
        triggeredBy: triggered_by || "OPERATOR_UI",
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    const result = await realityRunner.runAllScenarios({
      triggeredBy: triggered_by || "OPERATOR_UI",
      triggerMode: "MANUAL",
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute reality test suite" },
      { status: 500 }
    );
  }
}
