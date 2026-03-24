"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [consents, setConsents] = useState({ offer: false, personal_data: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!consents.offer || !consents.personal_data) {
      setError("Необходимо принять оферту и согласие на обработку ПД");
      return;
    }

    setLoading(true);

    try {
      const consentList: string[] = [];
      if (consents.offer) consentList.push("offer");
      if (consents.personal_data) consentList.push("personal_data");

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consents: consentList }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }

      router.push("/agent/dashboard");
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Scale className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Регистрация</h1>
          <p className="text-sm text-muted-foreground mt-1">Станьте партнёром Агентум Про</p>
          <p className="text-xs text-muted-foreground">система управления партнёрской сетью</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">ФИО</label>
            <Input
              placeholder="Иванов Иван Иванович"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
            <Input
              type="tel"
              placeholder="+7 (900) 000-00-00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Пароль</label>
            <Input
              type="password"
              placeholder="Минимум 8 символов"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.offer}
                onChange={(e) => setConsents({ ...consents, offer: e.target.checked })}
                className="mt-1 rounded border-border"
              />
              <span className="text-xs text-muted-foreground">
                Принимаю{" "}
                <Link href="/offer" className="text-primary hover:underline" target="_blank">условия оферты</Link>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consents.personal_data}
                onChange={(e) => setConsents({ ...consents, personal_data: e.target.checked })}
                className="mt-1 rounded border-border"
              />
              <span className="text-xs text-muted-foreground">
                Даю{" "}
                <Link href="/consent" className="text-primary hover:underline" target="_blank">согласие на обработку ПД</Link>
              </span>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline">Войти</Link>
        </div>
      </div>
    </div>
  );
}
