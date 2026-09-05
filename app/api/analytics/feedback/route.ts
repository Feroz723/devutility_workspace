import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/database/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      visitorId,
      rating = 5,
      category = "USABILITY",
      comment = "",
      source = "IN_APP",
      isDemo = false,
    } = body;

    if (!productId || !comment.trim()) {
      return NextResponse.json(
        { error: "productId and comment are required" },
        { status: 400 }
      );
    }

    // 1. Resolve or provision customer lead for this visitor
    const anonEmail = visitorId ? `anon_${visitorId}@visitor.local` : `anon_${Date.now()}@visitor.local`;
    const customerRow = await queryOne<{ id: string }>(
      `INSERT INTO customers (email, name, status, source, is_demo)
       VALUES ($1, $2, 'LEAD', 'PUBLIC_PRODUCT_PAGE', $3)
       ON CONFLICT (email) DO UPDATE 
         SET last_seen_at = NOW()
       RETURNING id`,
      [anonEmail, `Visitor Feedback`, isDemo]
    );

    if (!customerRow) {
      return NextResponse.json(
        { error: "Failed to resolve visitor customer record" },
        { status: 500 }
      );
    }
    const customerId = customerRow.id;

    // 2. Deterministic sentiment estimation based on rating
    let sentiment = "NEUTRAL";
    if (rating >= 4) sentiment = "POSITIVE";
    else if (rating <= 2) sentiment = "NEGATIVE";

    // 3. Insert into customer_feedback
    const feedbackRow = await queryOne<{ id: string; created_at: string }>(
      `INSERT INTO customer_feedback (
        customer_id, product_id, feedback_type,
        score, comment, topic, sentiment,
        source, confidence, is_demo
      ) VALUES ($1, $2, 'SATISFACTION', $3, $4, $5, $6, $7, 100, $8)
      RETURNING id, created_at`,
      [
        customerId,
        productId,
        rating,
        comment.trim(),
        category,
        sentiment,
        source,
        isDemo,
      ]
    );

    return NextResponse.json({
      success: true,
      feedbackId: feedbackRow?.id,
      customerId,
      realm: isDemo ? "SIMULATION" : "REAL",
      recordedAt: feedbackRow?.created_at,
    });
  } catch (err: any) {
    console.error("Error submitting user feedback:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record feedback" },
      { status: 500 }
    );
  }
}
