import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { testAllConnections } from "@/distribution/adapters";
import { CHANNEL_CAPABILITIES } from "@/distribution/capabilities";
import type { ChannelType } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await distributionRepo.seedInitialChannelsIfEmpty();

    const dbChannels = await distributionRepo.listChannels();
    const liveTests = await testAllConnections();
    const liveMap = new Map(liveTests.map((t) => [t.channel_type, t.result]));

    const integrations = dbChannels.map((ch) => {
      const live = liveMap.get(ch.channel_type as ChannelType);
      const cap = CHANNEL_CAPABILITIES[ch.channel_type as ChannelType];

      return {
        id: ch.id,
        name: ch.name,
        channel_type: ch.channel_type,
        platform: ch.platform,
        status: ch.status,
        connection_status: live ? live.status : ch.connection_status,
        connected: live ? live.connected : false,
        automation_capability: ch.automation_capability,
        credentials_required: ch.credentials_required,
        manual_setup_required: ch.manual_setup_required,
        approval_required: ch.approval_required,
        daily_action_limit: ch.daily_action_limit,
        hourly_action_limit: ch.hourly_action_limit,
        cost_inr: ch.cost_inr,
        message: live?.message || "No connection test run yet",
        manual_setup_instructions: live?.manual_setup_instructions || cap?.manual_setup_instructions || [],
        policy_notes: cap?.policy_notes || [],
      };
    });

    return NextResponse.json({ integrations, total: integrations.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
