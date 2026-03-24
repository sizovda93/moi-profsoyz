import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Wallet,
  FileText,
  MessageSquare,
  LayoutDashboard,
  UserPlus,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Wallet,
  FileText,
  MessageSquare,
  LayoutDashboard,
  UserPlus,
  Target,
  Activity,
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon }: StatCardProps) {
  const Icon = iconMap[icon] ?? Activity;

  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === "positive" && (
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                )}
                {changeType === "negative" && (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                {changeType === "neutral" && (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    changeType === "positive" && "text-success",
                    changeType === "negative" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
