"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/dashboard/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";

interface Division {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

interface UnionData {
  id: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
  divisions: Division[];
}

export default function AdminUnionsPage() {
  const [unions, setUnions] = useState<UnionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnion, setExpandedUnion] = useState<string | null>(null);

  // Create union dialog
  const [showCreateUnion, setShowCreateUnion] = useState(false);
  const [newUnionName, setNewUnionName] = useState("");
  const [newUnionShort, setNewUnionShort] = useState("");
  const [creating, setCreating] = useState(false);

  // Create division dialog
  const [showCreateDiv, setShowCreateDiv] = useState(false);
  const [createDivUnionId, setCreateDivUnionId] = useState("");
  const [newDivName, setNewDivName] = useState("");
  const [creatingDiv, setCreatingDiv] = useState(false);

  // Inline edit
  const [editingDiv, setEditingDiv] = useState<string | null>(null);
  const [editDivName, setEditDivName] = useState("");
  const [savingDiv, setSavingDiv] = useState(false);

  const loadData = useCallback(() => {
    fetch("/api/admin/unions")
      .then((r) => r.json())
      .then((data) => setUnions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateUnion = async () => {
    if (!newUnionName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/unions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUnionName, shortName: newUnionShort }),
      });
      if (res.ok) {
        setShowCreateUnion(false);
        setNewUnionName("");
        setNewUnionShort("");
        loadData();
      }
    } finally { setCreating(false); }
  };

  const handleToggleUnion = async (unionId: string, currentActive: boolean) => {
    await fetch(`/api/admin/unions/${unionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    loadData();
  };

  const handleCreateDiv = async () => {
    if (!newDivName.trim() || !createDivUnionId) return;
    setCreatingDiv(true);
    try {
      const res = await fetch(`/api/admin/unions/${createDivUnionId}/divisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDivName }),
      });
      if (res.ok) {
        setShowCreateDiv(false);
        setNewDivName("");
        loadData();
      }
    } finally { setCreatingDiv(false); }
  };

  const handleToggleDiv = async (unionId: string, divId: string, currentActive: boolean) => {
    await fetch(`/api/admin/unions/${unionId}/divisions/${divId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    loadData();
  };

  const handleSaveDiv = async (unionId: string, divId: string) => {
    if (!editDivName.trim()) return;
    setSavingDiv(true);
    try {
      await fetch(`/api/admin/unions/${unionId}/divisions/${divId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDivName }),
      });
      setEditingDiv(null);
      loadData();
    } finally { setSavingDiv(false); }
  };

  if (loading) return <LoadingSkeleton />;

  const totalDivisions = unions.reduce((sum, u) => sum + u.divisions.length, 0);
  const activeDivisions = unions.reduce((sum, u) => sum + u.divisions.filter((d) => d.isActive).length, 0);

  return (
    <div>
      <PageHeader
        title="Профсоюзы и подразделения"
        description="Управление справочником профсоюзов"
        breadcrumbs={[
          { title: "Платформа", href: "/admin/dashboard" },
          { title: "Профсоюзы" },
        ]}
        actions={
          <Button size="sm" onClick={() => setShowCreateUnion(true)}>
            <Plus className="h-4 w-4 mr-1" /> Добавить профсоюз
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Профсоюзов</p>
          <p className="text-2xl font-semibold mt-1">{unions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Подразделений</p>
          <p className="text-2xl font-semibold mt-1">{totalDivisions}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Активных подразделений</p>
          <p className="text-2xl font-semibold mt-1">{activeDivisions}</p>
        </Card>
      </div>

      {/* Unions list */}
      <div className="space-y-4">
        {unions.map((union) => {
          const isExpanded = expandedUnion === union.id;
          return (
            <Card key={union.id}>
              <CardHeader className="cursor-pointer" onClick={() => setExpandedUnion(isExpanded ? null : union.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <CardTitle className="text-base">{union.shortName || union.name}</CardTitle>
                      {union.shortName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{union.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={union.isActive ? "success" : "secondary"}>
                      {union.isActive ? "Активен" : "Отключён"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {union.divisions.length} подр.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleUnion(union.id, union.isActive)}
                    >
                      {union.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="flex justify-end mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setCreateDivUnionId(union.id); setShowCreateDiv(true); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Подразделение
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {union.divisions.map((div) => (
                      <div
                        key={div.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                      >
                        {editingDiv === div.id ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <Input
                              className="h-8 text-sm"
                              value={editDivName}
                              onChange={(e) => setEditDivName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveDiv(union.id, div.id)}
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleSaveDiv(union.id, div.id)} disabled={savingDiv}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingDiv(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${!div.isActive ? "text-muted-foreground line-through" : ""}`}>
                                {div.name}
                              </span>
                              {!div.isActive && <Badge variant="secondary" className="text-[10px]">Отключено</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setEditingDiv(div.id); setEditDivName(div.name); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleToggleDiv(union.id, div.id, div.isActive)}
                              >
                                {div.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {union.divisions.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">Нет подразделений</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {unions.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Нет профсоюзов. Создайте первый.
          </Card>
        )}
      </div>

      {/* Create union dialog */}
      <Dialog open={showCreateUnion} onOpenChange={setShowCreateUnion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый профсоюз</DialogTitle>
            <DialogDescription>Добавьте профсоюзную организацию</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Полное название *</label>
              <Input
                className="mt-1"
                value={newUnionName}
                onChange={(e) => setNewUnionName(e.target.value)}
                placeholder="Название профсоюзной организации"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Краткое название</label>
              <Input
                className="mt-1"
                value={newUnionShort}
                onChange={(e) => setNewUnionShort(e.target.value)}
                placeholder="Сокращённое название"
              />
            </div>
            <Button className="w-full" onClick={handleCreateUnion} disabled={creating || !newUnionName.trim()}>
              {creating ? "Создание..." : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create division dialog */}
      <Dialog open={showCreateDiv} onOpenChange={setShowCreateDiv}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новое подразделение</DialogTitle>
            <DialogDescription>Добавьте подразделение в профсоюз</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Название *</label>
              <Input
                className="mt-1"
                value={newDivName}
                onChange={(e) => setNewDivName(e.target.value)}
                placeholder="ППО «Название»"
              />
            </div>
            <Button className="w-full" onClick={handleCreateDiv} disabled={creatingDiv || !newDivName.trim()}>
              {creatingDiv ? "Создание..." : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
