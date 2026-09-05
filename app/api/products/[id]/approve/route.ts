import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { validateProductStatusTransition } from "@/product-builder";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const transition = validateProductStatusTransition(product.status, "READY");
    if (!transition.valid) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const updated = await updateProduct(product.id, {
      status: "READY",
      publishing_status: "published",
    });

    await logAudit({
      entity_type: "product",
      entity_id: product.id,
      action: "PRODUCT_APPROVED",
      details: {
        previous_status: product.status,
        new_status: "READY",
        name: product.name,
      },
    }).catch(() => null);

    return NextResponse.json({
      message: "Product approved successfully and marked as READY",
      product: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
