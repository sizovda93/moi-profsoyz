"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UnionData {
  id: string;
  name: string;
  shortName: string;
  divisions: { id: string; name: string }[];
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [consents, setConsents] = useState({ offer: false, personal_data: false });
  const [modalContent, setModalContent] = useState<"offer" | "pd" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [unions, setUnions] = useState<UnionData[]>([]);
  const [selectedUnionId, setSelectedUnionId] = useState("");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");

  useEffect(() => {
    fetch("/api/unions")
      .then((r) => r.json())
      .then((data: UnionData[]) => {
        setUnions(data);
        // Auto-select if only one union
        if (data.length === 1) {
          setSelectedUnionId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const selectedUnion = unions.find((u) => u.id === selectedUnionId);
  const divisions = selectedUnion?.divisions || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedUnionId || !selectedDivisionId) {
      setError("Выберите подразделение профсоюза");
      return;
    }

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
        body: JSON.stringify({
          ...form,
          unionId: selectedUnionId,
          divisionId: selectedDivisionId,
          consents: consentList,
        }),
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
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Регистрация</h1>
          <p className="text-sm text-muted-foreground mt-1">Профсоюзная платформа</p>
          <p className="text-xs text-muted-foreground">Мой Профсоюз</p>
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Минимум 8 символов"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Профсоюз — предвыбран, если один */}
          {selectedUnion && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Профсоюз</label>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                {selectedUnion.shortName || selectedUnion.name}
              </div>
            </div>
          )}

          {/* Подразделение */}
          {selectedUnionId && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Подразделение</label>
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Выберите подразделение</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                <button type="button" onClick={() => setModalContent("offer")} className="text-primary hover:underline">условия оферты</button>
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
                <button type="button" onClick={() => setModalContent("pd")} className="text-primary hover:underline">согласие на обработку ПД</button>
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

      {/* Modal for offer / PD */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalContent(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalContent(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            {modalContent === "offer" ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Пользовательское соглашение (Публичная оферта)</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground space-y-3">
                  <p>Настоящее Пользовательское соглашение определяет условия использования платформы «Мой Профсоюз».</p>
                  <p><strong className="text-foreground">1. Общие положения.</strong> Платформа предоставляет цифровой сервис для взаимодействия участников профсоюза, подачи обращений, обмена документами, получения юридических консультаций и прохождения обучения. Регистрируясь, Пользователь принимает условия в полном объёме.</p>
                  <p><strong className="text-foreground">2. Предмет соглашения.</strong> Администрация предоставляет доступ к функциональности: подача обращений, вопросы юристу, обмен документами, получение новостей, обучение, обмен сообщениями с руководителем.</p>
                  <p><strong className="text-foreground">3. Обязанности Пользователя.</strong> Предоставлять достоверные данные, не передавать доступ третьим лицам, соблюдать законодательство РФ, не использовать Платформу для распространения запрещённого контента.</p>
                  <p><strong className="text-foreground">4. Ответственность.</strong> Администрация не несёт ответственности за действия третьих лиц, технические сбои провайдеров, содержание сообщений Пользователей.</p>
                  <p><strong className="text-foreground">5. Прочие условия.</strong> Соглашение действует бессрочно. Споры решаются путём переговоров, при недостижении согласия — в суде по месту нахождения Администрации.</p>
                  <p>Контакт: 410029, г. Саратов, ул. Сакко и Ванцетти, 55, тел. 8 (8452) 26-33-56.</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4">Согласие на обработку персональных данных</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground space-y-3">
                  <p>Регистрируясь на платформе «Мой Профсоюз», вы даёте согласие на обработку персональных данных в соответствии с ФЗ-152 «О персональных данных».</p>
                  <p><strong className="text-foreground">1. Оператор.</strong> Саратовская областная организация «Всероссийский Электропрофсоюз», 410029, г. Саратов, ул. Сакко и Ванцетти, 55.</p>
                  <p><strong className="text-foreground">2. Категории данных.</strong> ФИО, email, телефон, город, должность, профессия, пол, год рождения, данные о членстве в профсоюзе.</p>
                  <p><strong className="text-foreground">3. Цели обработки.</strong> Обеспечение работы Платформы, идентификация Пользователя, обработка обращений, юридическое сопровождение, информирование о деятельности профсоюза.</p>
                  <p><strong className="text-foreground">4. Способы обработки.</strong> Сбор, запись, хранение, уточнение, использование, передача (руководителю профсоюза), удаление — с использованием средств автоматизации.</p>
                  <p><strong className="text-foreground">5. Срок.</strong> Согласие действует до момента отзыва. Отзыв направляется письменно по адресу Оператора или через Платформу.</p>
                  <p><strong className="text-foreground">6. Права субъекта.</strong> Вы имеете право на доступ, уточнение, блокирование и удаление персональных данных, обратившись к Оператору.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
