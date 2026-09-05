export const APP_CONFIG = {
  name: "Autonomous Business OS",
  shortName: "ABOS",
  version: "0.1.0",
  foundationOnly: true,
  spendingPolicy: {
    hardLimitCents: 0,
    currency: "INR",
    requireApprovalForSensitiveActions: true
  }
} as const;

export type AppConfig = typeof APP_CONFIG;