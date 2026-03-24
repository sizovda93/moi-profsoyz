import { getSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return Response.json({ user: null }, { status: 401 });
    }
    return Response.json({ user });
  } catch (err) {
    console.error("Session error:", err);
    return Response.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
