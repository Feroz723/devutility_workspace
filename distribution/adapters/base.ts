import type {
  ChannelType,
  ConnectionStatus,
  DistributionQueueItem,
  DistributionAsset,
} from "@/types/distribution";

export interface ConnectionTestResult {
  connected: boolean;
  status: ConnectionStatus;
  message: string;
  details?: Record<string, unknown>;
  manual_action_required?: boolean;
  manual_setup_instructions?: string[];
}

export interface PublishResult {
  success: boolean;
  external_id?: string;
  external_url?: string;
  requires_manual_action?: boolean;
  manual_instructions?: string;
  error?: string;
}

export interface ChannelAdapter {
  channel_type: ChannelType;
  testConnection(): Promise<ConnectionTestResult>;
  publish(
    queueItem: DistributionQueueItem,
    asset: DistributionAsset
  ): Promise<PublishResult>;
}
