import { NextRequest, NextResponse } from "next/server";
import { getProductById, listProductArtifacts } from "@/database/repositories/product-repo";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const versionId = url.searchParams.get("version_id") || undefined;
    const artifacts = await listProductArtifacts(params.id, versionId);

    return NextResponse.json({
      product_id: params.id,
      artifacts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
