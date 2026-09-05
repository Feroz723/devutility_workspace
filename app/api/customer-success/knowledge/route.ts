import { NextRequest, NextResponse } from "next/server";
import { getProductKnowledgeBase, searchKnowledgeBase } from "@/customer-success/knowledge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product_name = searchParams.get("product_name") || "Product";
    const product_id = searchParams.get("product_id") || undefined;
    const query = searchParams.get("q") || "";

    const allArticles = getProductKnowledgeBase(product_name, product_id);
    const filtered = searchKnowledgeBase(query, allArticles);

    return NextResponse.json(filtered);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
