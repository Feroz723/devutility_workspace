import { NextRequest, NextResponse } from "next/server";
import { getProductById, updateProduct } from "@/database/repositories/product-repo";
import { logAudit } from "@/database/repositories/audit-repo";
import { validateProductStatusTransition } from "@/product-builder";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const json = await request.json().catch(() => ({}));
    const reason = (json?.reason || "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 }
      );
    }

    const transition = validateProductStatusTransition(product.status, "DRAFT");
    if (!transition.valid) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    const updated = await updateProduct(product.id, {
      status: "DRAFT",
      build_status: "NOT_STARTED",
      learning_data: {
        ...(product.learning_data || {}),
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
      },
    });

    await logAudit({
      entity_type: "product",
      entity_id: product.id,
      action: "PRODUCT_REJECTED",
      details: {
        reason,
        previous_status: product.status,
        new_status: "DRAFT",
      },
    }).catch(() => null);

    return NextResponse.json({
      message: "Product rejected and moved back to DRAFT for revision",
      product: updated,
      rejection_reason: reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
