import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "./db";
import { UserRole } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_NAME = "token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  agentId: string | null;
}

// --- JWT ---

export function signToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, {
    expiresIn: TOKEN_MAX_AGE,
  });
}

export async function setAuthCookie(userId: string, role: UserRole) {
  const token = signToken(userId, role);
  (await cookies()).set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function clearAuthCookie() {
  (await cookies()).set(TOKEN_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

// --- Session ---

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = (await cookies()).get(TOKEN_NAME)?.value;
    if (!token) return null;

    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };

    const { rows } = await pool.query(
      `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status,
              a.id as agent_id
       FROM profiles p
       LEFT JOIN agents a ON a.user_id = p.id
       WHERE p.id = $1`,
      [payload.sub]
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    if (r.status === "blocked") return null;

    return {
      id: r.id,
      role: r.role,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      avatarUrl: r.avatar_url,
      status: r.status,
      agentId: r.agent_id,
    };
  } catch {
    return null;
  }
}

// --- Role guards ---

export async function requireAuth(): Promise<
  | { user: SessionUser; error?: never }
  | { user?: never; error: Response }
> {
  const user = await getSession();
  if (!user) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireRole(
  ...roles: UserRole[]
): Promise<
  | { user: SessionUser; error?: never }
  | { user?: never; error: Response }
> {
  const result = await requireAuth();
  if (result.error) return result;
  if (!roles.includes(result.user.role)) {
    return {
      error: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return result;
}
