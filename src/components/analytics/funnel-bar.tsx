"use client";

const stageLabels: Record<string, string> = {
  new: "Новый",
  contacted: "Контакт",
  qualified: "Квалиф.",
  proposal: "Предложение",
  negotiation: "Переговоры",
  won: "Выигран",
  lost: "Потерян",
};

const stageColors: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-blue-400",
  qualified: "bg-blue-300",
  proposal: "bg-yellow-400",
  negotiation: "bg-yellow-500",
  won: "bg-green-500",
  lost: "bg-red-400",
};

interface FunnelBarProps {
  stages: Record<string, { count: number; totalValue: number }>;
  conversionRate: number;
}

export function FunnelBar({ stages, conversionRate }: FunnelBarProps) {
  const order = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  const maxCount = Math.max(...order.map((s) => stages[s]?.count ?? 0), 1);

  return (
    <div className="space-y-2">
      {order.map((key) => {
        const stage = stages[key];
        if (!stage) return null;
        const pct = (stage.count / maxCount) * 100;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
              {stageLabels[key] || key}
            </span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${stageColors[key] || "bg-primary"} transition-all`}
                style={{ width: `${Math.max(pct, stage.count > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8 text-right">{stage.count}</span>
          </div>
        );
      })}
      <div className="flex justify-end text-xs text-muted-foreground pt-1">
        Конверсия: {conversionRate}%
      </div>
    </div>
  );
}
