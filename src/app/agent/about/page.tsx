"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/dashboard/loading-skeleton";
import { formatDate } from "@/lib/utils";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Image as ImageIcon,
  Video,
  Loader2,
  Landmark,
  CalendarDays,
  History,
  HelpCircle,
  FolderOpen,
} from "lucide-react";

/* ---------- types ---------- */

interface UnionEvent {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  eventDate: string | null;
  mediaType: "image" | "video" | "none";
  mediaUrl: string | null;
  authorName: string | null;
  createdAt: string;
}

interface UnionDocument {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string | null;
  fileUrl: string;
  fileSize: number | null;
  createdAt: string;
}

/* ---------- static data ---------- */

const faqItems = [
  {
    id: "faq-1",
    title: "10 главных причин быть членом Электропрофсоюза",
    content:
      "Что делает профсоюз?\n\n\u2022 Протягивает руку помощи!\n\u2022 Решает социальные проблемы!\n\u2022 Отстаивает права и интересы человека труда!\n\u2022 Формирует на предприятии атмосферу социального мира!\n\u2022 Содействует росту заработной платы!\n\u2022 Осуществляет общественный контроль вопросов охраны труда!\n\u2022 Юридически поддерживает и защищает!\n\u2022 Знает, что делать и действует!\n\nТолько профсоюз \u2013 твоя настоящая трудовая гарантия!",
  },
  {
    id: "faq-2",
    title: "Цели и задачи Профсоюза",
    content:
      "Выявление, представительство и защита социально-трудовых прав и интересов своих членов, участие в формировании и реализации социальных программ, обеспечивающих достойный уровень жизни и благоприятные условия труда и быта членов Профсоюза и их семей.",
  },
  {
    id: "faq-3",
    title: "Устав Всероссийского Электропрофсоюза",
    content:
      'Устав Общероссийского объединения "Всероссийский Электропрофсоюз" определяет цели, задачи, структуру и порядок деятельности профсоюзной организации. Полный текст устава доступен в разделе "Документы".',
  },
];

const historySections = [
  {
    heading: "Становление (1957\u20131965)",
    text: "Днём рождения Саратовской областной организации профсоюза можно считается 9 февраля 1957 года \u2013 это дата проведения первой областной профсоюзной конференции, на которой был создан областной комитет профсоюза рабочих электростанций и электротехнической промышленности.\n\nВ пятидесятые \u2013 семидесятые годы, как и во всей стране, так и в Саратовской области происходит бурное развитие промышленности, особенно электроэнергетики, радиоэлектроники. Создаются мощные строительные организации \u2014 Саратовская ГЭС, ТЭЦ \u2013 2, ТЭЦ \u2013 3, ТЭЦ \u2013 4, завод \u00abЭлектрофидер\u00bb, научно-исследовательский институт химических источников тока, Саратовгэсстрой и другие.\n\nПервым председателем обкома в 1956 году был избран Иванов Александр Григорьевич, проработавший в этой должности до 1979 года.\n\nСекретарями обкома работали: Умнова Анна Ивановна, Карагодин Александр Иванович, а затем Каспарянц Эдуард Андроникович.\n\nВ 1965 году профсоюз разделился на два: профсоюз рабочих электростанций и электротехнической промышленности и профсоюз рабочих радиоэлектронной промышленности. К этому моменту в профсоюзе состояло 92 852 человека.",
  },
  {
    heading: "Развитие (1965\u20131990)",
    text: "С 1969 по 1979 годы секретарём обкома профсоюза работала Степачева Антонина Ивановна. Инструкторами работали Погребняк Мария Григорьевна, с 1962 года по 1994 годы Разумихин Михаил Тимофеевич.\n\nТехническим инспектором работал с 1966 по 1985 годы Крайнов Николай Васильевич, главным бухгалтером с 1969 по 1986 годы Галыгина Антонина Ивановна. Заместителем главного бухгалтера с 1969 по 1994 годы работала Ионова Валентина Васильевна.\n\nС 1956 по 2000 год работал секретарём на общественных началах Косырев Иван Фёдорович.\n\nС 1974 года в течение 20 лет работал в обкоме техническим инспектором Минаков Александр Алексеевич.\n\nС 1979 года по 2000 год вначале секретарём обкома, потом заместителем председателя областной организации работала Мамлина Любовь Дмитриевна.\n\nВ 1979 году председателем обкома профсоюза был избран Бондарев Василий Ильич. В 1986 году его избирают заместителем председателя Центрального комитета Профсоюза, затем председателем Международного объединения \u00abЭлектропрофсоюз\u00bb. С 2000 года Бондарев Василий Ильич был заместителем председателя Всероссийского Электропрофсоюза.",
  },
  {
    heading: "Современный этап (1990\u2013настоящее время)",
    text: "В 1990 году создана Федерация Независимых профсоюзов России, а 4 декабря 1990 года на учредительном съезде образован \u00abВсероссийский Электропрофсоюз\u00bb.\n\nС 1986 по 2006 год областную организацию возглавлял Тихонов Николай Васильевич.\n\nС 2000 по 2015 год заместителем председателя областной организации Электропрофсоюз работала Быстрицкая Галина Сергеевна.\n\nС 2007 по 2015 года областную организацию возглавлял Дьяченко Владимир Владимирович.\n\nС 2004 года по настоящее время в аппарате областного комитета работают главным бухгалтером Дементьева Галина Вадимовна, ведущим специалистом по организационным и социально-трудовым вопросам Филиппова Наталья Вячеславовна, с 2022 года техническим инспектором в обкоме работает Ананьев Алексей Николаевич.\n\nС 2000 по настоящее время правовое обслуживание областной организации осуществляет адвокат Саратовской специализированной коллегии адвокатов Лобызова Тамара Васильевна.\n\nС 2015 года по настоящее время областную организацию возглавляет Грядкин Сергей Александрович.",
  },
];

/* ---------- page ---------- */

export default function AgentAboutPage() {
  /* --- events state --- */
  const [events, setEvents] = useState<UnionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* --- documents state --- */
  const [documents, setDocuments] = useState<UnionDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  /* --- faq state --- */
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  /* ---------- fetch events ---------- */

  const loadEvents = useCallback(() => {
    setEventsLoading(true);
    fetch("/api/union-events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  /* ---------- fetch documents ---------- */

  const loadDocuments = useCallback(() => {
    setDocsLoading(true);
    fetch("/api/union-documents")
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
    loadDocuments();
  }, [loadEvents, loadDocuments]);

  /* ---------- helpers ---------- */

  const toggleEvent = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const formatFileSize = (size: number | null) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ---------- render ---------- */

  return (
    <div>
      <PageHeader
        title="О профсоюзе"
        description="Информация о профсоюзной организации"
        breadcrumbs={[
          { title: "О платформе", href: "/agent/dashboard" },
          { title: "О профсоюзе" },
        ]}
      />

      {/* Баннер */}
      <div className="mb-6 rounded-xl overflow-hidden border border-border">
        <img
          src="/about-union.png"
          alt="Саратовская областная организация Всероссийского Электропрофсоюза"
          className="w-full h-auto object-cover"
        />
      </div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="management" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Органы управления
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Мероприятия
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            История
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Частые вопросы
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Документы
          </TabsTrigger>
        </TabsList>

        {/* ==================== Tab 1: Органы управления ==================== */}
        <TabsContent value="management">
          <Card>
            <CardHeader>
              <CardTitle>Руководство профсоюзной организации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ФИО</p>
                  <p className="text-sm font-medium">Грядкин Сергей Александрович</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Должность</p>
                  <p className="text-sm font-medium">Председатель Правления</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Адрес</p>
                  <p className="text-sm font-medium">
                    410029, г. Саратов, ул. Сакко и Ванцетти, 55
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  <a
                    href="tel:+78452263356"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    8 (8452) 26-33-56
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Tab 2: Мероприятия ==================== */}
        <TabsContent value="events">
          {eventsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm">
                  Мероприятия пока не добавлены
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const expanded = expandedId === event.id;

                return (
                  <Card key={event.id} className="overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left p-4 sm:p-6 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleEvent(event.id)}
                    >
                      {/* thumbnail */}
                      {event.mediaType !== "none" && event.mediaUrl && (
                        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                          {event.mediaType === "image" ? (
                            <img
                              src={event.mediaUrl}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{event.title}</span>
                          {event.eventDate && (
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(event.eventDate)}
                            </Badge>
                          )}
                        </div>
                        {event.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {event.excerpt}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 pt-0.5 text-muted-foreground">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {/* expanded content */}
                    {expanded && (
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border pt-4 space-y-4">
                        {/* media full */}
                        {event.mediaType !== "none" && event.mediaUrl && (
                          <div className="rounded-lg overflow-hidden bg-muted">
                            {event.mediaType === "image" ? (
                              <img
                                src={event.mediaUrl}
                                alt={event.title}
                                className="w-full max-h-96 object-contain"
                              />
                            ) : (
                              <video
                                src={event.mediaUrl}
                                controls
                                className="w-full max-h-96"
                              />
                            )}
                          </div>
                        )}

                        <div className="text-sm whitespace-pre-line leading-relaxed">
                          {event.content}
                        </div>

                        {event.authorName && (
                          <p className="text-xs text-muted-foreground">
                            Автор: {event.authorName}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ==================== Tab 3: История ==================== */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>История профсоюзной организации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium text-primary mb-6">
                Отраслевому Профсоюзу 30 апреля 2026 года исполнится 120 лет.
              </p>

              <div className="space-y-8">
                {historySections.map((section, idx) => (
                  <div key={idx}>
                    <h3 className="text-base font-semibold mb-3">{section.heading}</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                      {section.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Tab 4: Частые вопросы ==================== */}
        <TabsContent value="faq">
          <div className="space-y-3">
            {faqItems.map((item) => {
              const expanded = expandedFaqId === item.id;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left p-4 sm:p-6 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => toggleFaq(item.id)}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <HelpCircle className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span className="flex-1 font-medium text-sm">{item.title}</span>
                    <div className="shrink-0 text-muted-foreground">
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border pt-4">
                      <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
                        {item.content}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ==================== Tab 5: Документы ==================== */}
        <TabsContent value="documents">
          {docsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm">
                  Документы пока не добавлены
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(doc.createdAt)}</span>
                        {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                      </div>
                    </div>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Скачать</span>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
