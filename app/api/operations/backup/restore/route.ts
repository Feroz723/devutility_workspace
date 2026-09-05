import { NextRequest, NextResponse } from "next/server";
import { operationsBackupEngine } from "@/operations/backup-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = operationsBackupEngine.validateRestorePayload(body);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Backup validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Backup payload verified successfully with dry-run check.",
      version: body.version,
      checksum_sha256: body.checksum_sha256,
      table_records: Object.fromEntries(
        Object.entries(body.tables || {}).map(([k, v]) => [k, (v as any[]).length])
      ),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
