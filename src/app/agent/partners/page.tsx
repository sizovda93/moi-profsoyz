"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";

interface Partner {
  id: string;
  title: string;
  specialization: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  logoUrl: string | null;
}

export default function AgentPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/partners")
      .then((r) => r.json())
      .then((data) => setPartners(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CardSkeleton />;

  return (
    <div>
      <PageHeader
        title="Партнёры"
        description="Партнёрские организации профсоюза"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "Партнёры" },
        ]}
      />

      {partners.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Партнёры пока не добавлены</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {partners.map((partner) => {
            const isExpanded = expandedId === partner.id;
            return (
              <Card
                key={partner.id}
                className="hover:border-primary/20 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {partner.logoUrl ? (
                      <img
                        src={partner.logoUrl}
                        alt={partner.title}
                        className="h-12 w-12 rounded-lg object-contain shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{partner.title}</h3>
                      {partner.specialization && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {partner.specialization}
                        </p>
                      )}
                    </div>
                  </div>

                  {partner.shortDescription && !isExpanded && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {partner.shortDescription}
                    </p>
                  )}

                  {isExpanded && partner.fullDescription && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {partner.fullDescription}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : partner.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-3"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-3 w-3" /> Свернуть</>
                    ) : (
                      <><ChevronDown className="h-3 w-3" /> Подробнее</>
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
