"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Copy, Check, Link2, Star, ChevronDown, ChevronUp } from "lucide-react";

interface MarketingAsset {
  id: string;
  category: string;
  type: string;
  title: string;
  description?: string;
  body: string;
  isFeatured: boolean;
}

const categoryLabels: Record<string, string> = {
  social: "Соцсети",
  direct: "Личные сообщения",
  howto: "Как продвигать",
  scripts: "Скрипты и CTA",
};

const categoryIcons: Record<string, string> = {
  social: "📱",
  direct: "💬",
  howto: "📖",
  scripts: "🎯",
};

type Tab = "all" | "social" | "direct" | "howto" | "scripts";

export default function AgentMarketingPage() {
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [refLink, setRefLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/marketing/assets").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/profile").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([assetsData, profile]) => {
        setAssets(Array.isArray(assetsData) ? assetsData : []);
        if (profile?.refCode) {
          const appUrl = window.location.origin;
          setRefLink(`${appUrl}/?ref=${profile.refCode}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const personalize = useCallback(
    (text: string) => text.replace(/\{REF_LINK\}/g, refLink || "{{ваша ссылка}}"),
    [refLink]
  );

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(personalize(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyRefLink = async () => {
    if (!refLink) return;
    await navigator.clipboard.writeText(refLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <CardSkeleton />;

  const filtered = tab === "all" ? assets : assets.filter((a) => a.category === tab);
  const featured = assets.filter((a) => a.isFeatured);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `Все (${assets.length})` },
    ...Object.entries(categoryLabels).map(([key, label]) => ({
      key: key as Tab,
      label: `${label} (${assets.filter((a) => a.category === key).length})`,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Материалы"
        description="Полезные материалы и инструкции профсоюза"
        breadcrumbs={[
          { title: "Дашборд", href: "/agent/dashboard" },
          { title: "Материалы" },
        ]}
      />

      {/* Ref link block */}
      {refLink && (
        <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">Ваша ссылка:</span>
              <code className="text-xs bg-background px-2 py-1 rounded border truncate max-w-[300px]">{refLink}</code>
            </div>
            <Button size="sm" variant="outline" onClick={copyRefLink}>
              {copiedLink ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copiedLink ? "Скопировано" : "Скопировать"}
            </Button>
          </div>
        </Card>
      )}

      {/* Featured */}
      {tab === "all" && featured.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500" /> Рекомендуемые
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                personalize={personalize}
                expanded={expandedIds.has(asset.id)}
                onToggle={() => toggleExpand(asset.id)}
                onCopy={(text) => copyText(asset.id, text)}
                copied={copiedId === asset.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Assets grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            personalize={personalize}
            expanded={expandedIds.has(asset.id)}
            onToggle={() => toggleExpand(asset.id)}
            onCopy={(text) => copyText(asset.id, text)}
            copied={copiedId === asset.id}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 py-8 text-center">Нет материалов в этой категории</p>
        )}
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  personalize,
  expanded,
  onToggle,
  onCopy,
  copied,
}: {
  asset: MarketingAsset;
  personalize: (text: string) => string;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const categoryLabel = categoryLabels[asset.category] || asset.category;
  const icon = categoryIcons[asset.category] || "📄";

  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-semibold">{asset.title}</h4>
            {asset.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{asset.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {icon} {categoryLabel}
          </Badge>
        </div>

        {/* Preview / expand */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2 mb-2"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Свернуть" : "Показать текст"}
        </button>

        {expanded && (
          <div className="bg-muted/50 rounded-lg p-3 mb-3 text-sm whitespace-pre-line leading-relaxed">
            {personalize(asset.body)}
          </div>
        )}

        {/* Copy button */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(asset.body)}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? "Скопировано" : "Скопировать текст"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
