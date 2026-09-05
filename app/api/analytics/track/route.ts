import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/database/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId,
      visitorId,
      sessionToken,
      eventType = "PAGE_VIEW",
      eventName = "page_viewed",
      properties = {},
      isDemo = false,
    } = body;

    if (!productId || !visitorId) {
      return NextResponse.json(
        { error: "productId and visitorId are required" },
        { status: 400 }
      );
    }

    // 1. Resolve or provision customer lead for this visitor
    const anonEmail = `anon_${visitorId}@visitor.local`;
    const customerRow = await queryOne<{ id: string }>(
      `INSERT INTO customers (email, name, status, source, is_demo)
       VALUES ($1, $2, 'LEAD', 'PUBLIC_PRODUCT_PAGE', $3)
       ON CONFLICT (email) DO UPDATE 
         SET last_seen_at = NOW()
       RETURNING id`,
      [anonEmail, `Visitor ${visitorId.substring(0, 8)}`, isDemo]
    );

    if (!customerRow) {
      return NextResponse.json(
        { error: "Failed to resolve visitor customer record" },
        { status: 500 }
      );
    }
    const customerId = customerRow.id;

    // 2. Resolve or create customer session
    let sessionId: string | null = null;
    if (sessionToken) {
      const existingSession = await queryOne<{ id: string }>(
        `SELECT id FROM customer_sessions WHERE session_token = $1 LIMIT 1`,
        [sessionToken]
      );
      if (existingSession) {
        sessionId = existingSession.id;
        if (eventType === "PAGE_VIEW") {
          await query(
            `UPDATE customer_sessions SET page_views_count = page_views_count + 1 WHERE id = $1`,
            [sessionId]
          );
        } else if (eventType === "CORE_ACTION") {
          await query(
            `UPDATE customer_sessions SET actions_count = actions_count + 1 WHERE id = $1`,
            [sessionId]
          );
        }
      } else {
        const newSession = await queryOne<{ id: string }>(
          `INSERT INTO customer_sessions (
            customer_id, product_id, session_token, 
            page_views_count, actions_count, is_demo
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [
            customerId,
            productId,
            sessionToken,
            eventType === "PAGE_VIEW" ? 1 : 0,
            eventType === "CORE_ACTION" ? 1 : 0,
            isDemo,
          ]
        );
        sessionId = newSession?.id ?? null;
      }
    }

    // 3. Insert into customer_events
    const eventRow = await queryOne<{ id: string; created_at: string }>(
      `INSERT INTO customer_events (
        customer_id, product_id, session_id,
        event_type, event_name, properties,
        source, confidence, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, 'IN_APP', 100, $7)
      RETURNING id, created_at`,
      [
        customerId,
        productId,
        sessionId,
        eventType,
        eventName,
        JSON.stringify(properties),
        isDemo,
      ]
    );

    return NextResponse.json({
      success: true,
      eventId: eventRow?.id,
      customerId,
      sessionId,
      realm: isDemo ? "SIMULATION" : "REAL",
      recordedAt: eventRow?.created_at,
    });
  } catch (err: any) {
    console.error("Error ingesting analytics event:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record event" },
      { status: 500 }
    );
  }
}
