import pool from "@/lib/db";

const MAX_SNIPPETS = 3;
const MAX_SNIPPET_LENGTH = 300;

/**
 * Classification → default learning module IDs.
 * These are always checked for the given classification.
 */
const CLASSIFICATION_TO_MODULES: Record<string, string[]> = {
  question:       ["agent-start", "agent-faq"],
  status_request: [], // relies on keyword matching for specificity
  document:       ["agent-docs"],
  lead:           ["agent-start"],
  objection:      ["agent-faq"],
  escalation:     ["agent-faq"],
  other:          [],
};

/**
 * Keyword fragments → module IDs.
 * Matched case-insensitively against the message text.
 */
const KEYWORD_TO_MODULES: [string, string[]][] = [
  ["выплат",    ["agent-finance"]],
  ["комисси",   ["agent-finance"]],
  ["процент",   ["agent-finance"]],
  ["ставк",     ["agent-finance"]],
  ["tier",      ["agent-finance"]],
  ["уровень",   ["agent-finance"]],
  ["баланс",    ["agent-finance"]],
  ["деньг",     ["agent-finance"]],
  ["зарабо",    ["agent-finance"]],
  ["реферал",   ["agent-comms"]],
  ["ссылк",     ["agent-comms"]],
  ["материал",  ["agent-comms"]],
  ["телеграм",  ["agent-comms"]],
  ["telegram",  ["agent-comms"]],
  ["документ",  ["agent-docs"]],
  ["загруз",    ["agent-docs"]],
  ["файл",      ["agent-docs"]],
  ["обучен",    ["agent-start"]],
  ["лид",       ["agent-start"]],
  ["клиент",    ["agent-start"]],
  ["статус",    ["agent-start"]],
];

/**
 * Keywords that signal a finance/commission question.
 * When matched, live commission rates from settings are injected.
 */
const FINANCE_KEYWORDS = ["выплат", "комисси", "процент", "ставк", "tier", "уровень", "баланс", "зарабо"];

/**
 * Keywords that signal referral/marketing relevance.
 * When matched, a marketing asset snippet is added.
 */
const MARKETING_KEYWORDS = ["реферал", "ссылк", "материал", "разместить", "привлеч", "пост", "cta"];

export interface KnowledgeResult {
  snippets: string[];
  sources: string[]; // "module_id:lesson_slug" format
}

/**
 * Retrieve relevant knowledge snippets for draft grounding.
 * Rule-based: classification mapping + keyword scan + DB query.
 * No vector DB, no embeddings — simple and predictable.
 */
export async function retrieveKnowledge(
  classification: string,
  messageText: string
): Promise<KnowledgeResult> {
  try {
    const textLower = messageText.toLowerCase();

    // 1. Keyword-based modules (higher priority — more specific)
    const keywordModules: string[] = [];
    for (const [keyword, modules] of KEYWORD_TO_MODULES) {
      if (textLower.includes(keyword)) {
        for (const m of modules) {
          if (!keywordModules.includes(m)) keywordModules.push(m);
        }
      }
    }

    // 2. Classification-based modules (fallback, lower priority)
    const classModules = CLASSIFICATION_TO_MODULES[classification] || [];
    const fallbackModules = classModules.filter((m) => !keywordModules.includes(m));

    // Keyword modules first, then classification fallback
    const orderedModuleIds = [...keywordModules, ...fallbackModules];

    // If nothing matched, return empty
    if (orderedModuleIds.length === 0) {
      return { snippets: [], sources: [] };
    }

    // 3. Query learning lessons — prioritize keyword modules via CASE ordering
    const { rows: lessons } = await pool.query(
      `SELECT l.slug, l.title, l.sections, m.id AS module_id
       FROM learning_lessons l
       JOIN learning_modules m ON m.id = l.module_id
       WHERE m.id = ANY($1)
       ORDER BY array_position($1, m.id), l.sort_order
       LIMIT $2`,
      [orderedModuleIds, MAX_SNIPPETS * 2]
    );

    const snippets: string[] = [];
    const sources: string[] = [];

    for (const lesson of lessons) {
      if (snippets.length >= MAX_SNIPPETS) break;

      const sections = lesson.sections as { heading: string; body: string }[];
      if (!sections || sections.length === 0) continue;

      // Take first section, trim to max length
      const section = sections[0];
      let text = `${section.heading}: ${section.body}`;
      if (text.length > MAX_SNIPPET_LENGTH) {
        text = text.substring(0, MAX_SNIPPET_LENGTH) + "...";
      }

      snippets.push(text);
      sources.push(`${lesson.module_id}:${lesson.slug}`);
    }

    // 4. Inject commission rates if finance keywords detected (always added, not competing with lesson slots)
    const hasFinanceKeyword = FINANCE_KEYWORDS.some((kw) => textLower.includes(kw));
    if (hasFinanceKeyword) {
      try {
        const { rows: rateRows } = await pool.query(
          `SELECT key, value FROM settings WHERE key LIKE 'commission_rate_%' ORDER BY key`
        );
        if (rateRows.length > 0) {
          const rateLines = rateRows.map((r) => {
            const tier = r.key.replace("commission_rate_", "");
            const pct = (parseFloat(r.value) * 100).toFixed(0);
            return `${tier}: ${pct}%`;
          });
          snippets.push(`Комиссионные ставки по уровням: ${rateLines.join(", ")}`);
          sources.push("settings:commission_rates");
        }
      } catch { /* skip if settings unavailable */ }
    }

    // 5. Inject marketing asset if referral/marketing keywords detected (always added)
    const hasMarketingKeyword = MARKETING_KEYWORDS.some((kw) => textLower.includes(kw));
    if (hasMarketingKeyword) {
      try {
        const { rows: assetRows } = await pool.query(
          `SELECT title, body FROM marketing_assets
           WHERE status = 'published' AND (category = 'howto' OR category = 'scripts')
           ORDER BY is_featured DESC, sort_order
           LIMIT 1`
        );
        if (assetRows.length > 0) {
          let text = `${assetRows[0].title}: ${assetRows[0].body}`;
          if (text.length > MAX_SNIPPET_LENGTH) {
            text = text.substring(0, MAX_SNIPPET_LENGTH) + "...";
          }
          snippets.push(text);
          sources.push("marketing:howto");
        }
      } catch { /* skip */ }
    }

    return { snippets, sources };
  } catch (err) {
    console.error("retrieveKnowledge error:", err instanceof Error ? err.message : err);
    return { snippets: [], sources: [] };
  }
}
