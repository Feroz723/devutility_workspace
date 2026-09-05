import { NextResponse } from "next/server";
import { runtimeManager } from "@/runtime/runtime-manager";

export async function GET() {
  try {
    const status = await runtimeManager.getStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
