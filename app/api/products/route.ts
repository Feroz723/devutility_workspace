import { NextRequest, NextResponse } from "next/server";
import { CreateProductSchema } from "@/types/product";
import { createProduct, listProducts } from "@/database/repositories/product-repo";
import { createAuditLog } from "@/database/repositories/audit-repo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const result = await listProducts({
      opportunity_id: url.searchParams.get("opportunity_id") ?? undefined,
      experiment_id: url.searchParams.get("experiment_id") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      build_status: url.searchParams.get("build_status") ?? undefined,
      product_type: url.searchParams.get("product_type") ?? undefined,
      is_demo: url.searchParams.get("is_demo") !== null ? url.searchParams.get("is_demo") === "true" : undefined,
      limit: url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
      offset: url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = CreateProductSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await createProduct(parsed.data);

    await createAuditLog({
      event_type: "PRODUCT_CREATED",
      entity_type: "product",
      entity_id: product.id,
      actor: "api",
      details: { name: product.name, product_type: product.product_type },
    }).catch(() => null);

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
