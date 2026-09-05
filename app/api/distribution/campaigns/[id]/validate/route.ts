import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { evaluateDistributionZeroCost } from "@/distribution/guard";
import { checkAntiSpamRules } from "@/distribution/safety";
import { getChannelAdapter } from "@/distribution/adapters";
import { getChannelCapability } from "@/distribution/capabilities";
import type { ChannelType } from "@/types/distribution";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await distributionRepo.getCampaign(params.id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const strategy = campaign.strategy_id
      ? await distributionRepo.getStrategy(campaign.strategy_id)
      : null;

    // 1. Zero Cost Check
    const zeroCostCheck = evaluateDistributionZeroCost({ campaign, strategy });

    // 2. Queue Items & Content Safety Checks
    const { items: queueItems } = await distributionRepo.listQueueItems({ campaign_id: campaign.id });
    const safetyChecks: Array<{
      queue_id: string;
      channel_type: ChannelType;
      passed: boolean;
      risk_score: number;
      reasons: string[];
    }> = [];

    const connectionChecks: Array<{
      channel_type: ChannelType;
      connected: boolean;
      status: string;
      message: string;
    }> = [];

    const checkedChannels = new Set<ChannelType>();

    for (const item of queueItems) {
      const asset = item.asset_id ? await distributionRepo.getAsset(item.asset_id) : null;
      const channel = await distributionRepo.getChannel(item.channel_id);
      const channelType: ChannelType = channel ? channel.channel_type : "OWNED_WEBSITE";

      const cap = getChannelCapability(channelType);
      const safety = checkAntiSpamRules({
        channel_type: channelType,
        title: asset?.title,
        body: asset?.body,
        hourly_limit: cap.hourly_action_limit,
        daily_limit: cap.daily_action_limit,
      });

      safetyChecks.push({
        queue_id: item.id,
        channel_type: channelType,
        passed: safety.passed,
        risk_score: safety.risk_score,
        reasons: safety.reasons,
      });

      if (!checkedChannels.has(channelType)) {
        checkedChannels.add(channelType);
        const adapter = getChannelAdapter(channelType);
        const conn = await adapter.testConnection();
        connectionChecks.push({
          channel_type: channelType,
          connected: conn.connected,
          status: conn.status,
          message: conn.message,
        });
      }
    }

    const allPassed = zeroCostCheck.compliant && safetyChecks.every((s) => s.passed);

    return NextResponse.json({
      valid: allPassed,
      zero_cost: zeroCostCheck,
      safety_checks: safetyChecks,
      connection_checks: connectionChecks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
