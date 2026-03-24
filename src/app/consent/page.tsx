import Link from "next/link";
import { Scale } from "lucide-react";

export default function ConsentPage() {
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
        <h1 className="text-2xl font-semibold mb-8">Согласие на обработку персональных данных</h1>
        <div className="prose prose-invert prose-sm max-w-none space-y-4 text-muted-foreground">
          <p>Регистрируясь на Платформе, Пользователь даёт своё согласие на обработку персональных данных в соответствии с Федеральным законом от 27.07.2006 №152-ФЗ «О персональных данных».</p>
          <h2 className="text-lg font-medium text-foreground mt-8">Перечень данных</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Фамилия, имя, отчество</li>
            <li>Адрес электронной почты</li>
            <li>Номер телефона</li>
            <li>Город проживания</li>
            <li>Сведения о профессиональной деятельности</li>
          </ul>
          <h2 className="text-lg font-medium text-foreground mt-8">Цели обработки</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Предоставление доступа к функциям Платформы</li>
            <li>Связь с пользователем по вопросам предоставления услуг</li>
            <li>Статистический анализ использования Платформы</li>
          </ul>
          <h2 className="text-lg font-medium text-foreground mt-8">Срок действия</h2>
          <p>Согласие действует с момента его предоставления и до момента отзыва путём направления письменного уведомления.</p>
          <p className="mt-8 text-xs">Дата публикации: 1 января 2026 г.</p>
        </div>
      </main>
    </div>
  );
}
