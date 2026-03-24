import Link from "next/link";
import { Scale } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-semibold mb-8">Политика конфиденциальности</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-muted-foreground">
          <p>Настоящая Политика конфиденциальности описывает порядок сбора, хранения и обработки персональных данных пользователей Платформы.</p>
          <h2 className="text-lg font-medium text-foreground mt-8">1. Сбор информации</h2>
          <p>1.1. Мы собираем персональные данные, которые вы предоставляете при регистрации: ФИО, email, телефон.</p>
          <p>1.2. Также автоматически собираются технические данные: IP-адрес, тип браузера, время посещения.</p>
          <h2 className="text-lg font-medium text-foreground mt-8">2. Использование данных</h2>
          <p>2.1. Персональные данные используются для предоставления услуг Платформы и связи с пользователем.</p>
          <p>2.2. Мы не передаём персональные данные третьим лицам без согласия пользователя.</p>
          <h2 className="text-lg font-medium text-foreground mt-8">3. Защита данных</h2>
          <p>3.1. Мы применяем организационные и технические меры для защиты персональных данных в соответствии с требованиями 152-ФЗ.</p>
          <p className="mt-8 text-xs">Дата публикации: 1 января 2026 г.</p>
        </div>
      </main>
    </div>
  );
}
