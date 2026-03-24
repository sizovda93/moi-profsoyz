import { clearAuthCookie } from "@/lib/auth-server";

export async function POST() {
  try {
    await clearAuthCookie();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    return Response.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
