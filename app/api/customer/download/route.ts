import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/database/client";
import { getProductArtifactById } from "@/database/repositories/product-repo";
import { EntitlementEngine } from "@/sales/entitlements";
import { CustomerEntitlement } from "@/types/sales";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const artifactId = url.searchParams.get("artifact_id");

    if (!token || !artifactId) {
      return NextResponse.json({ error: "token and artifact_id are required" }, { status: 400 });
    }

    // Verify token in customer_entitlements
    const entitlement = await queryOne<CustomerEntitlement>(
      `SELECT * FROM customer_entitlements WHERE token = $1 AND status = 'ACTIVE'`,
      [token]
    );

    if (!entitlement) {
      return NextResponse.json({ error: "Invalid or revoked access token" }, { status: 403 });
    }

    if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
      return NextResponse.json({ error: "Access entitlement has expired" }, { status: 403 });
    }

    if (entitlement.max_uses && entitlement.used_count >= entitlement.max_uses) {
      return NextResponse.json({ error: "Maximum download limit reached" }, { status: 403 });
    }

    // Retrieve product artifact
    const artifact = await getProductArtifactById(artifactId);
    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Verify artifact belongs to entitlement's product
    if (artifact.product_id !== entitlement.product_id) {
      return NextResponse.json({ error: "Artifact does not belong to authorized product" }, { status: 403 });
    }

    // Record usage
    await EntitlementEngine.recordUsage(entitlement.id);

    const filename = artifact.file_path.split("/").pop() ?? "download.txt";
    const content = artifact.content ?? "";

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
