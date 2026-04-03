import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Shield,
  Bot,
  MessageCircle,
  FileText,
  GraduationCap,
  UserPlus,
  LogIn,
  Lock,
  Users,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Обращения к руководству",
    description: "Задайте вопрос руководителю профсоюза и отслеживайте ответ",
  },
  {
    icon: Shield,
    title: "Юридические консультации",
    description: "Получите помощь по трудовому праву от профсоюзного юриста",
  },
  {
    icon: Bot,
    title: "ИИ-помощник",
    description: "Мгновенные консультации по трудовым вопросам — 24/7",
  },
  {
    icon: MessageCircle,
    title: "Корпоративные чаты",
    description: "Общайтесь с руководителем и коллегами на платформе",
  },
  {
    icon: FileText,
    title: "Документы и новости",
    description: "Постановления, соглашения и актуальные новости профсоюза",
  },
  {
    icon: GraduationCap,
    title: "Опросы и обучение",
    description: "Участвуйте в опросах и проходите обучающие программы",
  },
];

const steps = [
  {
    num: "1",
    title: "Зарегистрируйтесь",
    description: "Укажите ФИО, email и выберите ваш профсоюз — это займёт 2 минуты",
  },
  {
    num: "2",
    title: "Войдите в личный кабинет",
    description: "Все сервисы доступны сразу после входа — ничего настраивать не нужно",
  },
  {
    num: "3",
    title: "Пользуйтесь сервисами",
    description: "Задавайте вопросы, читайте новости, общайтесь с коллегами",
  },
];

const trust = [
  {
    icon: Lock,
    title: "Данные защищены",
    description: "Платформа соответствует требованиям ФЗ-152 о персональных данных",
  },
  {
    icon: Users,
    title: "Только для участников",
    description: "Доступ имеют только зарегистрированные участники профсоюза",
  },
  {
    icon: Smartphone,
    title: "Всегда доступна",
    description: "Платформа работает круглосуточно с любого устройства",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div>
              <span className="font-extrabold text-base tracking-tight block leading-tight">Мой Профсоюз</span>
              <span className="text-xs text-[#6b7280] block leading-tight">профсоюзная платформа</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3b82f6] px-5 py-2.5 text-base font-bold text-white hover:bg-[#2563eb] transition-colors shadow-sm"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Войти в платформу</span>
              <span className="sm:hidden">Войти</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#3b82f6]/[0.04]" />
          <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full bg-[#3b82f6]/[0.03]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-1.5 text-sm font-semibold text-[#6b7280] mb-8 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#3b82f6]" />
            Официальная платформа профсоюза
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-[1.15]">
            Цифровая платформа
            <br />
            <span className="text-[#3b82f6]">вашего профсоюза</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-[#6b7280] max-w-xl mx-auto leading-relaxed font-medium">
            Все сервисы для участников профсоюза — обращения, консультации, документы и общение — в одном месте
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#3b82f6] px-8 py-3.5 text-base font-bold text-white hover:bg-[#2563eb] transition-colors shadow-md shadow-[#3b82f6]/20"
            >
              Войти в платформу
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] px-6 py-3.5 text-base font-bold text-[#374151] hover:bg-[#f9fafb] transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Создать аккаунт
            </Link>
          </div>

          <p className="mt-4 text-sm text-[#9ca3af]">
            Вход только для зарегистрированных участников профсоюза
          </p>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section className="py-16 lg:py-20 bg-[#f9fafb]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              Возможности платформы
            </h2>
            <p className="mt-3 text-base text-[#6b7280] font-medium max-w-md mx-auto">
              Всё необходимое для взаимодействия с профсоюзной организацией
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#e5e7eb] bg-white p-5 hover:border-[#3b82f6]/20 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/[0.08] flex items-center justify-center mb-3.5">
                  <f.icon className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <h3 className="text-base font-extrabold mb-1">{f.title}</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed font-medium">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              Как это работает
            </h2>
            <p className="mt-3 text-base text-[#6b7280] font-medium">
              Три простых шага — и все сервисы у вас под рукой
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line (desktop) */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-[2px] bg-[#e5e7eb]" />

            {steps.map((s) => (
              <div key={s.num} className="text-center relative">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#3b82f6] text-white text-lg font-extrabold mb-4 relative z-10 shadow-md shadow-[#3b82f6]/20">
                  {s.num}
                </div>
                <h3 className="text-base font-extrabold mb-1.5">{s.title}</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed font-medium max-w-[280px] mx-auto">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Trust ===== */}
      <section className="py-16 lg:py-20 bg-[#f9fafb]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              Безопасно и конфиденциально
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trust.map((t) => (
              <div key={t.title} className="flex items-start gap-4 rounded-2xl bg-white border border-[#e5e7eb] p-5">
                <div className="h-10 w-10 rounded-xl bg-[#10b981]/[0.08] flex items-center justify-center shrink-0">
                  <t.icon className="h-5 w-5 text-[#10b981]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold mb-1">{t.title}</h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed font-medium">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-3xl bg-gradient-to-br from-[#3b82f6]/[0.06] to-[#3b82f6]/[0.02] border border-[#3b82f6]/10 px-8 py-14 lg:py-16 text-center">
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight mb-3">
              Начните пользоваться платформой
            </h2>
            <p className="text-base text-[#6b7280] font-medium mb-8 max-w-md mx-auto">
              Все возможности доступны сразу после входа
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 rounded-xl bg-[#3b82f6] px-8 py-3.5 text-base font-bold text-white hover:bg-[#2563eb] transition-colors shadow-md shadow-[#3b82f6]/20"
              >
                Войти в платформу
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] px-6 py-3.5 text-base font-bold text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Создать аккаунт
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#e5e7eb] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#9ca3af] font-medium">
          <span>© 2026 Мой Профсоюз — цифровая платформа профсоюзной организации</span>
          <div className="flex items-center gap-5">
            <Link href="/offer" className="hover:text-[#374151] transition-colors">
              Пользовательское соглашение
            </Link>
            <Link href="/privacy" className="hover:text-[#374151] transition-colors">
              Политика конфиденциальности
            </Link>
            <Link href="/cookies" className="hover:text-[#374151] transition-colors">
              Куки
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
