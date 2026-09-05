import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { getChannelAdapter } from "@/distribution/adapters";
import { logAudit } from "@/database/repositories/audit-repo";
import type { ChannelType } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { channel: string } }
) {
  try {
    const channelType = params.channel.toUpperCase() as ChannelType;
    const adapter = getChannelAdapter(channelType);
    const testResult = await adapter.testConnection();

    // Update DB record if exists
    const dbChannel = await distributionRepo.getChannelByType(channelType);
    if (dbChannel) {
      await distributionRepo.updateChannel(dbChannel.id, {
        connection_status: testResult.status,
        last_connection_test_at: new Date().toISOString(),
        last_connection_error: testResult.connected ? null : testResult.message,
      });
    }

    await logAudit({
      entity_type: "distribution_channel",
      entity_id: dbChannel?.id || channelType,
      action: "CHANNEL_CONNECTION_TESTED",
      details: {
        channel: channelType,
        connected: testResult.connected,
        status: testResult.status,
        message: testResult.message,
      },
    });

    return NextResponse.json({
      channel: channelType,
      connected: testResult.connected,
      status: testResult.status,
      message: testResult.message,
      manual_action_required: testResult.manual_action_required ?? false,
      manual_setup_instructions: testResult.manual_setup_instructions ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
