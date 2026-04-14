"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Newspaper, Star, Play } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  mediaType: string;
  mediaUrl: string | null;
  isFeatured: boolean;
  publishedAt: string;
}

export function NewsBlock() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => setNews(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="h-32 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (news.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Новости профсоюза
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {news.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border p-4 hover:border-primary/20 transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Media thumbnail */}
                  {item.mediaType === "image" && item.mediaUrl && (
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                      <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {item.mediaType === "video" && item.mediaUrl && (
                    <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.isFeatured && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                      <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.publishedAt)}
                    </p>
                    {!isExpanded && item.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.excerpt}</p>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {item.mediaType === "image" && item.mediaUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img src={item.mediaUrl} alt={item.title} className="w-full max-h-80 object-cover" />
                      </div>
                    )}
                    {item.mediaType === "video" && item.mediaUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <video src={item.mediaUrl} controls className="w-full max-h-80" />
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-line leading-relaxed font-normal">
                      {item.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
