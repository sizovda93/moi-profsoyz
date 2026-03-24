import pool from "@/lib/db";
import { requireAuth } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { rows } = await pool.query(
      `SELECT * FROM union_partners WHERE is_active = true ORDER BY sort_order`
    );
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error("GET /api/partners error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
