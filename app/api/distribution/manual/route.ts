import { NextRequest, NextResponse } from "next/server";
import { distributionRepo } from "@/database/repositories/distribution-repo";
import { CHANNEL_CAPABILITIES } from "@/distribution/capabilities";
import type { ChannelType } from "@/types/distribution";
import type { ManualActionItem } from "@/distribution/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const actionItems: ManualActionItem[] = [];

    // 1. Pending queue items needing manual review or action
    const { items: pendingQueue } = await distributionRepo.listQueueItems({
      status: "REQUIRES_MANUAL_ACTION",
    });

    const { items: reviewQueue } = await distributionRepo.listQueueItems({
      status: "READY_FOR_REVIEW",
    });

    const queueItemsToProcess = [...pendingQueue, ...reviewQueue];

    for (const item of queueItemsToProcess) {
      const asset = item.asset_id ? await distributionRepo.getAsset(item.asset_id) : null;
      const channel = await distributionRepo.getChannel(item.channel_id);
      const channelType = (channel?.channel_type || "OWNED_WEBSITE") as ChannelType;
      const cap = CHANNEL_CAPABILITIES[channelType];

      actionItems.push({
        id: `queue-${item.id}`,
        category: item.status === "READY_FOR_REVIEW" ? "CONTENT_APPROVAL" : "MANUAL_PUBLISH",
        title: `${item.status === "READY_FOR_REVIEW" ? "Review & Approve" : "Manual Post"}: ${asset?.title || "Distribution Post"}`,
        channel: channel?.name || channelType,
        why_needed: item.status === "READY_FOR_REVIEW"
          ? "Safety guard: Human approval required before publishing content to external platform."
          : (item.manual_action_required || cap?.policy_notes[0] || "Platform requires manual form submission."),
        exact_requirements: cap?.manual_setup_instructions || [
          "Review the draft content for factual claims.",
          "Ensure tone and links align with community guidelines.",
        ],
        current_status: item.status,
        action_url: asset?.tracking_url || asset?.canonical_url || undefined,
        draft_content: asset ? `### ${asset.title}\n\n${asset.body}` : undefined,
        next_software_step: item.status === "READY_FOR_REVIEW"
          ? "Approving this item will schedule it for automated dispatch if channel is connected."
          : "Once you complete manual submission, mark this item as published in the Queue.",
        queue_item_id: item.id,
        channel_id: item.channel_id,
      });
    }

    // 2. Integration / Credential setup items for unconnected channels
    const channels = await distributionRepo.listChannels();
    for (const ch of channels) {
      if (ch.connection_status === "NOT_CONNECTED" && ch.credentials_required) {
        const cap = CHANNEL_CAPABILITIES[ch.channel_type as ChannelType];
        actionItems.push({
          id: `channel-${ch.id}`,
          category: "CREDENTIAL_SETUP",
          title: `Connect Integration: ${ch.name}`,
          channel: ch.name,
          why_needed: `Autonomous actions on ${ch.name} require authenticated API credentials or manual setup.`,
          exact_requirements: cap?.manual_setup_instructions || ["Configure platform credentials in environment settings."],
          current_status: ch.connection_status,
          next_software_step: "After configuring credentials, test the connection in Integrations Settings.",
          channel_id: ch.id,
        });
      }
    }

    return NextResponse.json({
      items: actionItems,
      total: actionItems.length,
      pending_reviews: reviewQueue.length,
      manual_publishes: pendingQueue.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
