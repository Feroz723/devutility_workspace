import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";
import { operationsBackupEngine } from "@/operations/backup-engine";

export async function GET(req: NextRequest) {
  try {
    const backups = await operationsRepo.listBackups();
    return NextResponse.json({ backups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backupType = body.backup_type || "FULL";

    const { backup, data } = await operationsBackupEngine.createBackupSnapshot(backupType);
    return NextResponse.json({ success: true, backup, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
