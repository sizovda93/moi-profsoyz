import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <h1 className="text-2xl font-bold mb-6">Политика использования файлов cookie</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>Дата последнего обновления: 01.01.2026</p>

          <h2 className="text-base font-semibold text-foreground mt-6">1. Что такое cookie</h2>
          <p>
            Cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении платформы «Мой Профсоюз». Они помогают нам обеспечить корректную работу платформы, запоминать ваши настройки и улучшать качество обслуживания.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6">2. Какие cookie мы используем</h2>
          <p><strong className="text-foreground">Необходимые cookie</strong> — обеспечивают работу платформы. Без них невозможна авторизация и доступ к личному кабинету. К ним относится токен авторизации (JWT).</p>
          <p><strong className="text-foreground">Функциональные cookie</strong> — сохраняют ваши предпочтения: выбранная тема оформления (тёмная/светлая).</p>

          <h2 className="text-base font-semibold text-foreground mt-6">3. Срок хранения</h2>
          <p>
            Токен авторизации хранится до выхода из системы или до истечения срока действия сессии. Настройки темы хранятся в localStorage до их удаления вами.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6">4. Управление cookie</h2>
          <p>
            Вы можете управлять cookie через настройки вашего браузера: блокировать или удалять их. Обратите внимание, что отключение необходимых cookie может сделать невозможным использование платформы.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6">5. Сторонние cookie</h2>
          <p>
            Платформа «Мой Профсоюз» не использует сторонние cookie для рекламы или аналитики. Мы не передаём данные cookie третьим лицам.
          </p>

          <h2 className="text-base font-semibold text-foreground mt-6">6. Контакты</h2>
          <p>
            По вопросам использования cookie обращайтесь по адресу: 410029, г. Саратов, ул. Сакко и Ванцетти, 55, тел. 8 (8452) 26-33-56.
          </p>
        </div>
      </div>
    </div>
  );
}
