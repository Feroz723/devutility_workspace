import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: string;
  isDemo?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  isDemo = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
        <span className="text-sm font-medium">{title}</span>
        {icon && <div className="text-[hsl(var(--primary))]">{icon}</div>}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white">
            {value}
          </span>
          {isDemo && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              DEMO
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
        {trend && (
          <p className="mt-1 text-xs text-emerald-400 font-medium">{trend}</p>
        )}
      </div>
    </Card>
  );
}
