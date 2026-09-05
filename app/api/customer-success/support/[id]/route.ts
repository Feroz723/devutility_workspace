import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerSupportRequestById,
  listCustomerSupportMessages,
} from "@/database/repositories/customer-success-repo";
import {
  addTicketMessage,
  resolveSupportTicket,
} from "@/customer-success/support";
import { triageSupportTicketWithAI } from "@/customer-success/ai-support";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const ticket = await getCustomerSupportRequestById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messages = await listCustomerSupportMessages(ticketId);
    return NextResponse.json({ ticket, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await req.json();

    if (body.action === "ai_triage") {
      const triage = await triageSupportTicketWithAI(ticketId);
      return NextResponse.json(triage);
    }

    if (!body.body) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const msg = await addTicketMessage(
      ticketId,
      body.sender_type || "AGENT",
      body.body,
      body.sender_name
    );
    return NextResponse.json(msg);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await req.json();

    if (body.action === "resolve") {
      const updated = await resolveSupportTicket(
        ticketId,
        body.resolution || "Resolved by operator",
        body.resolved_by || "operator"
      );
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
