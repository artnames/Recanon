import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, suffix, trend, className }: MetricCardProps) {
  return (
    <div className={cn("metric-card", className)}>
      <div className="metric-label">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="metric-value">{value}</span>
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
        {trend && trend !== 'neutral' && (
          <span className={cn(
            "ml-auto",
            trend === 'up' ? "text-verified" : "text-destructive"
          )}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
