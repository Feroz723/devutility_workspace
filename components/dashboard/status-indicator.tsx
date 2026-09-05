import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "READY" | "RUNNING" | "STOPPED" | "ERROR" | "NOT_CONFIGURED";
  label?: string;
  showPulse?: boolean;
}

export function StatusIndicator({
  status,
  label,
  showPulse = true,
}: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case "READY":
        return "bg-emerald-500";
      case "RUNNING":
        return "bg-blue-500";
      case "ERROR":
        return "bg-red-500";
      case "NOT_CONFIGURED":
      case "STOPPED":
      default:
        return "bg-amber-500";
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {showPulse && status === "READY" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2.5 w-2.5", getStatusColor())}
        ></span>
      </span>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
      )}
    </div>
  );
}
