import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const role = req.nextUrl.searchParams.get("role") || auth.user.role;

  const { rows: modules } = await pool.query(
    `SELECT id, role, title, description, icon, sort_order, is_required
     FROM learning_modules
     WHERE role = $1
     ORDER BY sort_order`,
    [role]
  );

  const { rows: lessons } = await pool.query(
    `SELECT l.module_id, l.slug, l.title, l.duration,
            l.sections, l.next_action_label, l.next_action_href, l.sort_order
     FROM learning_lessons l
     JOIN learning_modules m ON m.id = l.module_id
     WHERE m.role = $1
     ORDER BY m.sort_order, l.sort_order`,
    [role]
  );

  const result = modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    icon: m.icon,
    isRequired: m.is_required,
    lessons: lessons
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        slug: l.slug,
        title: l.title,
        duration: l.duration,
        sections: l.sections,
        nextAction:
          l.next_action_label && l.next_action_href
            ? { label: l.next_action_label, href: l.next_action_href }
            : undefined,
      })),
  }));

  return Response.json(result);
}
