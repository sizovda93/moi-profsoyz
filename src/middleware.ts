import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/", "/login", "/register", "/offer", "/privacy", "/consent"];

const rolePrefixes: Record<string, string[]> = {
  "/agent": ["agent"],
  "/manager": ["manager"],
  "/admin": ["admin"],
};

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Статика, _next, favicon — пропускаем только безопасные паттерны
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/avatar/") ||
    pathname === "/api/telegram/webhook" ||
    pathname === "/api/leads/public" ||
    pathname === "/api/unions" ||
    (pathname === "/api/referral" && request.method === "POST") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Публичные страницы
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // API-роуты (кроме /api/auth) — проверяем токен
  if (pathname.startsWith("/api")) {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await jwtVerify(token, getSecret());
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Защищённые страницы — проверяем токен + роль
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    // Проверка роли по префиксу пути
    for (const [prefix, allowedRoles] of Object.entries(rolePrefixes)) {
      if (pathname.startsWith(prefix) && !allowedRoles.includes(payload.role as string)) {
        const redirectPath =
          payload.role === "agent"
            ? "/agent/dashboard"
            : payload.role === "manager"
              ? "/manager/dashboard"
              : "/admin/dashboard";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
