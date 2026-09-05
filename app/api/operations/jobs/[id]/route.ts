import { NextRequest, NextResponse } from "next/server";
import { operationsRepo } from "@/database/repositories/operations-repo";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await operationsRepo.getJobById(params.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const history = await operationsRepo.listJobHistory(params.id);

    return NextResponse.json({ job, history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
