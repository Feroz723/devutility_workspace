import { NextResponse } from "next/server";
import { getAllScenarioDefinitions } from "@/simulation/scenarios/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const definitions = getAllScenarioDefinitions().map((def) => ({
      id: def.id,
      name: def.name,
      category: def.category,
      description: def.description,
    }));

    return NextResponse.json({
      success: true,
      data: definitions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch scenario definitions" },
      { status: 500 }
    );
  }
}
