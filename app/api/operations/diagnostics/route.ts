import { NextRequest, NextResponse } from "next/server";
import { operationsDiagnosticsEngine } from "@/operations/diagnostics";

export async function GET(req: NextRequest) {
  try {
    const diagnostics = await operationsDiagnosticsEngine.runDiagnostics();
    const allPass = diagnostics.every((d) => d.status === "PASS");
    const hasFail = diagnostics.some((d) => d.status === "FAIL");

    return NextResponse.json({
      overall_status: hasFail ? "FAIL" : allPass ? "PASS" : "WARN",
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
