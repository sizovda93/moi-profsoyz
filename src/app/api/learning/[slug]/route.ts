import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const role = req.nextUrl.searchParams.get("role") || auth.user.role;

  const { rows } = await pool.query(
    `SELECT l.slug, l.title, l.duration, l.sections,
            l.next_action_label, l.next_action_href,
            m.id AS module_id, m.title AS module_title,
            m.description AS module_description, m.icon AS module_icon
     FROM learning_lessons l
     JOIN learning_modules m ON m.id = l.module_id
     WHERE l.slug = $1 AND m.role = $2`,
    [slug, role]
  );

  if (rows.length === 0) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const r = rows[0];
  return Response.json({
    module: {
      id: r.module_id,
      title: r.module_title,
      description: r.module_description,
      icon: r.module_icon,
    },
    lesson: {
      slug: r.slug,
      title: r.title,
      duration: r.duration,
      sections: r.sections,
      nextAction:
        r.next_action_label && r.next_action_href
          ? { label: r.next_action_label, href: r.next_action_href }
          : undefined,
    },
  });
}
