import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/dashboard/status-badges";
import { Lead } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { MapPin, Phone, Mail, Calendar, MessageSquare, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sourceLabels: Record<string, string> = {
  website: "Сайт",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  referral: "Реферал",
  cold: "Холодный",
  partner: "Партнёр",
};

interface LeadDetailsPanelProps {
  lead: Lead;
}

export function LeadDetailsPanel({ lead }: LeadDetailsPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{lead.fullName}</CardTitle>
            <LeadStatusBadge status={lead.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{lead.city}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Создан: {formatDate(lead.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{sourceLabels[lead.source] ?? lead.source}</Badge>
            </div>
            {lead.estimatedValue && (
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{formatCurrency(lead.estimatedValue)}</span>
              </div>
            )}
          </div>
          {lead.comment && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">{lead.comment}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
