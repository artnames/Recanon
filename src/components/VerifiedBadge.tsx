import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  status: 'verified' | 'pending' | 'failed';
  className?: string;
}

export function VerifiedBadge({ status, className }: VerifiedBadgeProps) {
  const configs = {
    verified: {
      icon: ShieldCheck,
      label: "Verified",
      className: "verified-badge"
    },
    pending: {
      icon: Clock,
      label: "Pending",
      className: "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-warning/15 text-warning border border-warning/30"
    },
    failed: {
      icon: AlertTriangle,
      label: "Failed",
      className: "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-destructive/15 text-destructive border border-destructive/30"
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={cn(config.className, className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
