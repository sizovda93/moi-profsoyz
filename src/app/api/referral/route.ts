import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-server";
import { toCamelCase } from "@/lib/api-utils";
import crypto from "crypto";

// GET /api/referral — agent: my ref + stats; manager/admin: leaderboard
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return Response.json(auth, { status: 401 });

  const { user } = auth;
  const view = request.nextUrl.searchParams.get("view");

  // Agent view: my referral code + stats
  if (user.role === "agent") {
    if (!user.agentId) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const { rows: agentRows } = await pool.query(
      "SELECT ref_code FROM agents WHERE id = $1",
      [user.agentId]
    );
    if (agentRows.length === 0) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }

    const refCode = agentRows[0].ref_code;

    // Stats
    const { rows: clickRows } = await pool.query(
      "SELECT COUNT(*)::int AS total_clicks, COUNT(*) FILTER (WHERE is_unique) ::int AS unique_clicks FROM referral_clicks WHERE ref_code = $1",
      [refCode]
    );
    const { rows: leadRows } = await pool.query(
      "SELECT COUNT(*)::int AS total_leads FROM leads WHERE ref_code = $1",
      [refCode]
    );

    const totalClicks = clickRows[0]?.total_clicks || 0;
    const uniqueClicks = clickRows[0]?.unique_clicks || 0;
    const totalLeads = leadRows[0]?.total_leads || 0;
    const conversion = uniqueClicks > 0 ? ((totalLeads / uniqueClicks) * 100).toFixed(1) : "0.0";

    return Response.json({
      refCode,
      link: `${process.env.NEXT_PUBLIC_APP_URL}/?ref=${refCode}`,
      stats: {
        totalClicks,
        uniqueClicks,
        totalLeads,
        conversion: parseFloat(conversion),
      },
    });
  }

  // Manager / Admin view: leaderboard
  if (view === "leaderboard" || user.role === "manager" || user.role === "admin") {
    const { rows } = await pool.query(`
      SELECT
        a.ref_code,
        p.full_name,
        p.email,
        (SELECT COUNT(*)::int FROM referral_clicks rc WHERE rc.ref_code = a.ref_code) AS total_clicks,
        (SELECT COUNT(*)::int FROM referral_clicks rc WHERE rc.ref_code = a.ref_code AND rc.is_unique) AS unique_clicks,
        (SELECT COUNT(*)::int FROM leads l WHERE l.ref_code = a.ref_code) AS referral_leads
      FROM agents a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.ref_code IS NOT NULL
      ORDER BY referral_leads DESC, unique_clicks DESC
    `);

    return Response.json({ leaderboard: rows.map(toCamelCase) });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

// POST /api/referral — track click (public, no auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { refCode } = parsed;
    if (!refCode || typeof refCode !== "string" || refCode.length > 16) {
      return Response.json({ error: "Invalid ref_code" }, { status: 400 });
    }

    // Validate ref_code exists
    const { rows } = await pool.query(
      "SELECT id FROM agents WHERE ref_code = $1",
      [refCode.toUpperCase()]
    );
    if (rows.length === 0) {
      return Response.json({ error: "Unknown ref_code" }, { status: 404 });
    }

    // Dedup by IP hash within last hour
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + refCode.toUpperCase()).digest("hex").substring(0, 16);
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    const { rows: recent } = await pool.query(
      "SELECT id FROM referral_clicks WHERE ip_hash = $1 AND ref_code = $2 AND created_at > now() - interval '1 hour'",
      [ipHash, refCode.toUpperCase()]
    );

    const isUnique = recent.length === 0;

    await pool.query(
      "INSERT INTO referral_clicks (ref_code, ip_hash, user_agent, referrer, is_unique) VALUES ($1, $2, $3, $4, $5)",
      [refCode.toUpperCase(), ipHash, userAgent.substring(0, 500), referrer.substring(0, 500), isUnique]
    );

    return Response.json({ ok: true, isUnique });
  } catch (err) {
    console.error("Referral click error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
