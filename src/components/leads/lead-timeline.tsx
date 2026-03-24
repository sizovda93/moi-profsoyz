import { TimelineEvent } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const typeColors: Record<TimelineEvent["type"], string> = {
  status_change: "bg-info",
  message: "bg-primary",
  assignment: "bg-warning",
  note: "bg-secondary",
  payment: "bg-success",
};

interface LeadTimelineProps {
  events: TimelineEvent[];
}

export function LeadTimeline({ events }: LeadTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5", typeColors[event.type])} />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(event.date)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
