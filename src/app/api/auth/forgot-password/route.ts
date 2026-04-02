import { NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: "Укажите email" }, { status: 400 });
    }

    // Find user
    const { rows } = await pool.query(
      `SELECT id, full_name, email FROM profiles WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      // Don't reveal if email exists or not
      return Response.json({ success: true });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      `UPDATE profiles SET password_hash = $1 WHERE id = $2`,
      [hash, rows[0].id]
    );

    // In production, send email. For now, return the temp password.
    return Response.json({
      success: true,
      tempPassword,
      message: "Временный пароль создан. Используйте его для входа, затем смените в профиле.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
