"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import { Plus, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Asset {
  id: string;
  category: string;
  type: string;
  title: string;
  description?: string;
  body: string;
  sortOrder: number;
  isFeatured: boolean;
  status: string;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  social: "Соцсети", direct: "Личные сообщения", howto: "Инструкции", scripts: "Скрипты",
};
const typeLabels: Record<string, string> = {
  post: "Пост", message: "Сообщение", guide: "Руководство", cta: "CTA",
};
const statusLabels: Record<string, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  published: { label: "Опубликован", variant: "success" },
  draft: { label: "Черновик", variant: "secondary" },
  archived: { label: "В архиве", variant: "destructive" },
};

export default function AdminMarketingPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "social", type: "post",
    body: "", sortOrder: 0, isFeatured: false, status: "draft",
  });

  const loadAssets = () =>
    fetch("/api/marketing/assets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAssets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

  useEffect(() => { loadAssets(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", category: "social", type: "post", body: "", sortOrder: 0, isFeatured: false, status: "draft" });
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      title: asset.title, description: asset.description || "", category: asset.category,
      type: asset.type, body: asset.body, sortOrder: asset.sortOrder,
      isFeatured: asset.isFeatured, status: asset.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.body) return;
    setSaving(true);
    const url = editing ? `/api/marketing/assets/${editing.id}` : "/api/marketing/assets";
    const method = editing ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        loadAssets();
      }
    } finally { setSaving(false); }
  };

  const handleArchive = async (id: string) => {
    await fetch(`/api/marketing/assets/${id}`, { method: "DELETE" });
    loadAssets();
  };

  if (loading) return <LoadingSkeleton />;

  const columns = [
    {
      key: "title",
      title: "Название",
      render: (a: Asset) => (
        <div>
          <p className="font-medium flex items-center gap-1">
            {a.isFeatured && <Star className="h-3 w-3 text-yellow-500" />}
            {a.title}
          </p>
          {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
        </div>
      ),
    },
    {
      key: "category",
      title: "Категория",
      render: (a: Asset) => <Badge variant="outline">{categoryLabels[a.category] || a.category}</Badge>,
    },
    {
      key: "type",
      title: "Тип",
      render: (a: Asset) => <span className="text-sm text-muted-foreground">{typeLabels[a.type] || a.type}</span>,
    },
    {
      key: "status",
      title: "Статус",
      render: (a: Asset) => {
        const cfg = statusLabels[a.status] || statusLabels.draft;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Маркетинговые материалы"
        description="Управление библиотекой материалов"
        breadcrumbs={[
          { title: "Дашборд", href: "/admin/dashboard" },
          { title: "Материалы" },
        ]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Добавить материал
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={assets}
        onRowClick={(a: Asset) => openEdit(a)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать материал" : "Новый материал"}</DialogTitle>
            <DialogDescription>Заполните данные материала</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Название *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Описание</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Категория</label>
                <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Тип</label>
                <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Текст материала *</label>
              <p className="text-xs text-muted-foreground mb-1">Используйте {"{REF_LINK}"} для ссылки для приглашения</p>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[200px]"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Статус</label>
                <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликован</option>
                  <option value="archived">В архиве</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Порядок</label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" id="featured" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                <label htmlFor="featured" className="text-sm">Рекомендуемый</label>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              {editing && (
                <Button variant="destructive" size="sm" onClick={() => { handleArchive(editing.id); setDialogOpen(false); }}>
                  В архив
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
