import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  listProductVersions,
  createProductVersion,
} from "@/database/repositories/product-repo";
import { CreateProductVersionSchema } from "@/types/product";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const versions = await listProductVersions(params.id);
    return NextResponse.json({ product_id: params.id, versions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    const parsed = CreateProductVersionSchema.safeParse({ ...json, product_id: params.id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const version = await createProductVersion(parsed.data);
    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
