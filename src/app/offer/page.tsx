import Link from "next/link";
import { Scale } from "lucide-react";

export default function OfferPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Агентум Про</span>
            <span className="text-xs text-muted-foreground ml-2">система управления партнёрской сетью</span>
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-8">Публичная оферта</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-muted-foreground">
          <p>Настоящая публичная оферта (далее — «Оферта») определяет условия использования платформы Агентум Про (далее — «Платформа»).</p>
          <h2 className="text-lg font-medium text-foreground mt-8">1. Общие положения</h2>
          <p>1.1. Платформа предоставляет сервис для координации работы юридических партнёров, управления лидами и автоматизации коммуникаций.</p>
          <p>1.2. Регистрируясь на Платформе, Пользователь принимает условия настоящей Оферты в полном объёме.</p>
          <h2 className="text-lg font-medium text-foreground mt-8">2. Предмет оферты</h2>
          <p>2.1. Компания предоставляет Пользователю доступ к функциональности Платформы в соответствии с выбранным тарифным планом.</p>
          <p>2.2. Перечень доступных функций определяется ролью Пользователя в системе.</p>
          <h2 className="text-lg font-medium text-foreground mt-8">3. Условия использования</h2>
          <p>3.1. Пользователь обязуется использовать Платформу исключительно в законных целях.</p>
          <p>3.2. Пользователь несёт ответственность за сохранность своих учётных данных.</p>
          <p className="mt-8 text-xs">Дата публикации: 1 января 2026 г.</p>
        </div>
      </main>
    </div>
  );
}
