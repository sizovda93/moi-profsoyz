import { Card, CardContent } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/dashboard/status-badges";
import { Lead } from "@/types";
import { formatDate } from "@/lib/utils";
import { MapPin, Phone, Calendar } from "lucide-react";
import Link from "next/link";

interface LeadCardProps {
  lead: Lead;
  href: string;
}

export function LeadCard({ lead, href }: LeadCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/30 transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-medium group-hover:text-primary transition-colors">
              {lead.fullName}
            </h3>
            <LeadStatusBadge status={lead.status} />
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{lead.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{lead.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(lead.createdAt)}</span>
            </div>
          </div>
          {lead.comment && (
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2 border-t border-border pt-3">
              {lead.comment}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
