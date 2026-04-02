"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }

      if (data.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        setError("Если аккаунт существует, новый пароль будет отправлен на email.");
      }
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Восстановление пароля</h1>
          <p className="text-sm text-muted-foreground mt-1">Мой Профсоюз</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center space-y-3">
              <p className="text-sm font-medium text-green-700">Новый временный пароль:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold bg-background px-4 py-2 rounded-lg border border-border">
                  {tempPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Используйте этот пароль для входа. Рекомендуем сменить его в профиле.
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Войти с новым паролем
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="Введите email, указанный при регистрации"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Обработка..." : "Сбросить пароль"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline flex items-center justify-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Вернуться к входу
          </Link>
        </div>
      </div>
    </div>
  );
}
