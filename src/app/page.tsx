import Link from "next/link";
import { Shield, ArrowRight, Users, Zap, MessageSquare, GraduationCap } from "lucide-react";
import { Suspense } from "react";
import { RefCapture } from "@/components/referral/ref-capture";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense><RefCapture /></Suspense>
      {/* Шапка */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Мой Профсоюз</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">профсоюзная платформа</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Регистрация
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Главный блок */}
      <section className="py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Платформа для членов профсоюза
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Ваш профсоюз —{" "}
            <span className="text-primary">всегда на связи</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Единая платформа для обращений, документов, обучения и связи
            с руководством профсоюзной организации
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Зарегистрироваться
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              Войти в систему
            </Link>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Обращения и связь</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Подавайте обращения, получайте ответы от руководства и отслеживайте статус в личном кабинете
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Обучение и материалы</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Изучайте свои трудовые права, получайте полезные материалы и шаблоны документов
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold mb-2">Единое пространство</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Все члены профсоюза, документы, объявления и обучение — в одном месте
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Подвал */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© 2026 Мой Профсоюз. Все права защищены.</span>
          <div className="flex items-center gap-6">
            <Link href="/offer" className="hover:text-foreground transition-colors">Оферта</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Конфиденциальность</Link>
            <Link href="/consent" className="hover:text-foreground transition-colors">Согласие на обработку ПД</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
