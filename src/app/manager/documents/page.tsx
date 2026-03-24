"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { UploadZone } from "@/components/documents/upload-zone";
import { SearchInput } from "@/components/dashboard/search-input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { Document } from "@/types";

export default function ManagerDocumentsPage() {
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = useCallback(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  if (loading) return <CardSkeleton />;

  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Документы"
        description="Документы членов профсоюза"
        breadcrumbs={[
          { title: "Дашборд", href: "/manager/dashboard" },
          { title: "Документы" },
        ]}
      />

      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск документа..." />
      </div>
      <div className="mb-6">
        <DocumentTable documents={filtered} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Загрузка</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadZone onUploaded={() => loadDocs()} />
        </CardContent>
      </Card>
    </div>
  );
}
