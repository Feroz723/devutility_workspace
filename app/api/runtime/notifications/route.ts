import { NextRequest, NextResponse } from "next/server";
import { runtimeRepo } from "@/database/repositories/runtime-repo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unacknowledgedOnly = searchParams.get("unacknowledged") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const notifications = await runtimeRepo.listNotifications({
      isAcknowledged: unacknowledgedOnly ? false : undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error: any) {
    logger.error("Failed to list notifications", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list notifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notification_id, acknowledged_by } = body;

    if (action === "acknowledge") {
      if (!notification_id) {
        return NextResponse.json(
          { success: false, error: "notification_id is required" },
          { status: 400 }
        );
      }

      await runtimeRepo.acknowledgeNotification(
        notification_id,
        acknowledged_by || "OPERATOR"
      );

      return NextResponse.json({
        success: true,
        message: "Notification acknowledged",
      });
    }

    if (action === "acknowledge_all") {
      const unack = await runtimeRepo.listNotifications({
        isAcknowledged: false,
        limit: 100,
      });

      for (const n of unack) {
        await runtimeRepo.acknowledgeNotification(
          n.id,
          acknowledged_by || "OPERATOR"
        );
      }

      return NextResponse.json({
        success: true,
        message: `Acknowledged ${unack.length} notifications`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    logger.error("Failed to process notification action", { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process notification action" },
      { status: 500 }
    );
  }
}
