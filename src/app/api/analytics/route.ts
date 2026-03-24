import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { computeLifecycle } from '@/lib/lifecycle';
import type { UserStatus, OnboardingStatus } from '@/types';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    // Agent gets only their own rank
    if (user.role === 'agent') {
      return Response.json(await buildAgentAnalytics(user.agentId));
    }

    // Manager/Admin get full analytics
    // Manager filter: leads by assigned_manager_id
    const isManager = user.role === 'manager';
    const managerId = isManager ? user.id : null;

    const [summary, funnel, segments, topAgents, referral, tiers, onboarding] = await Promise.all([
      buildSummary(managerId),
      buildFunnel(managerId),
      buildSegments(managerId),
      buildTopAgents(managerId),
      buildReferral(managerId),
      buildTiers(),
      buildOnboarding(),
    ]);

    return Response.json({
      summary,
      funnel,
      segments,
      topAgents,
      referral,
      tiers: isManager ? null : tiers,
      onboarding: isManager ? null : onboarding,
      agentRank: null,
    });
  } catch (err) {
    console.error('GET /api/analytics error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// ─── Summary ─────────────────────────────────────────────

async function buildSummary(managerId: string | null) {
  const monthStart = "date_trunc('month', now())";

  const leadFilter = managerId
    ? `WHERE assigned_manager_id = $1`
    : '';
  const params = managerId ? [managerId] : [];

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total_leads,
       COUNT(*) FILTER (WHERE status NOT IN ('won','lost'))::int AS active_leads,
       COUNT(*) FILTER (WHERE status = 'won' AND updated_at >= ${monthStart})::int AS won_this_month,
       COUNT(*) FILTER (WHERE conflict_status = 'open')::int AS open_conflicts
     FROM leads ${leadFilter}`,
    params
  );

  // Revenue this month from paid payouts
  const payoutFilter = managerId
    ? `WHERE p.agent_id IN (SELECT DISTINCT l.assigned_agent_id FROM leads l WHERE l.assigned_manager_id = $1 AND l.assigned_agent_id IS NOT NULL)`
    : '';
  const { rows: revRows } = await pool.query(
    `SELECT COALESCE(SUM(p.amount), 0)::numeric(12,2) AS revenue_this_month
     FROM payouts p
     ${payoutFilter}
     ${payoutFilter ? 'AND' : 'WHERE'} p.status = 'paid' AND p.created_at >= ${monthStart}`,
    managerId ? [managerId] : []
  );

  // Agent count
  const { rows: agentRows } = await pool.query(
    `SELECT COUNT(DISTINCT a.id)::int AS total_agents
     FROM agents a
     JOIN profiles p ON p.id = a.user_id
     WHERE p.status = 'active'`
  );

  return {
    totalLeads: rows[0].total_leads,
    activeLeads: rows[0].active_leads,
    wonThisMonth: rows[0].won_this_month,
    revenueThisMonth: Number(revRows[0].revenue_this_month),
    openConflicts: rows[0].open_conflicts,
    totalAgents: agentRows[0].total_agents,
  };
}

// ─── Funnel ──────────────────────────────────────────────

async function buildFunnel(managerId: string | null) {
  const filter = managerId ? `WHERE assigned_manager_id = $1` : '';
  const params = managerId ? [managerId] : [];

  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count,
            COALESCE(SUM(estimated_value), 0)::numeric(12,2) AS total_value
     FROM leads ${filter}
     GROUP BY status`,
    params
  );

  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const result: Record<string, { count: number; totalValue: number }> = {};
  for (const s of statuses) {
    const row = rows.find((r) => r.status === s);
    result[s] = { count: row?.count ?? 0, totalValue: Number(row?.total_value ?? 0) };
  }

  const total = rows.reduce((s, r) => s + r.count, 0);
  const won = result.won.count;

  return {
    stages: result,
    totalLeads: total,
    conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
  };
}

// ─── Segments ────────────────────────────────────────────

async function buildSegments(managerId: string | null) {
  // Get all agents with lifecycle data
  let agentQuery = `
    SELECT a.id, a.onboarding_status, a.total_leads, p.status AS user_status
    FROM agents a
    JOIN profiles p ON p.id = a.user_id`;

  const params: string[] = [];
  if (managerId) {
    agentQuery += ` WHERE a.id IN (
      SELECT DISTINCT l.assigned_agent_id FROM leads l
      WHERE l.assigned_manager_id = $1 AND l.assigned_agent_id IS NOT NULL
    )`;
    params.push(managerId);
  }

  const { rows: agents } = await pool.query(agentQuery, params);

  // Get agents with recent leads (for sleeping detection)
  const { rows: recentRows } = await pool.query(
    `SELECT DISTINCT assigned_agent_id AS id
     FROM leads
     WHERE created_at > now() - interval '30 days' AND assigned_agent_id IS NOT NULL`
  );
  const recentAgentIds = new Set(recentRows.map((r) => r.id));

  const counts = {
    registered: 0,
    learning: 0,
    activated: 0,
    active: 0,
    sleeping: 0,
    inactive: 0,
    blocked: 0,
  };

  for (const a of agents) {
    const lc = computeLifecycle(
      a.user_status as UserStatus,
      a.onboarding_status as OnboardingStatus,
      a.total_leads
    );

    if (lc === 'active' && !recentAgentIds.has(a.id)) {
      counts.sleeping++;
    } else if (lc === 'registered') counts.registered++;
    else if (lc === 'learning_in_progress') counts.learning++;
    else if (lc === 'activated') counts.activated++;
    else if (lc === 'active') counts.active++;
    else if (lc === 'inactive') counts.inactive++;
    else if (lc === 'blocked' || lc === 'rejected') counts.blocked++;
  }

  return counts;
}

// ─── Top Agents (ranking) ────────────────────────────────

async function buildTopAgents(managerId: string | null) {
  let filter = '';
  const params: string[] = [];

  if (managerId) {
    filter = `WHERE a.id IN (
      SELECT DISTINCT l.assigned_agent_id FROM leads l
      WHERE l.assigned_manager_id = $1 AND l.assigned_agent_id IS NOT NULL
    )`;
    params.push(managerId);
  }

  const { rows } = await pool.query(
    `SELECT a.id, p.full_name, a.tier, a.total_leads, a.total_revenue,
            (SELECT COUNT(*)::int FROM leads l WHERE l.assigned_agent_id = a.id AND l.status = 'won') AS won_leads,
            (SELECT COUNT(*)::int FROM leads l WHERE l.ref_code = a.ref_code) AS referral_leads
     FROM agents a
     JOIN profiles p ON p.id = a.user_id
     JOIN profiles p2 ON p2.id = a.user_id AND p2.status = 'active'
     ${filter}
     ORDER BY won_leads DESC, total_revenue DESC, total_leads DESC
     LIMIT 10`,
    params
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    fullName: r.full_name,
    tier: r.tier,
    wonLeads: r.won_leads,
    totalLeads: r.total_leads,
    revenue: Number(r.total_revenue),
    referralLeads: r.referral_leads,
  }));
}

// ─── Referral ────────────────────────────────────────────

async function buildReferral(managerId: string | null) {
  // Overall referral stats
  const { rows: clickRows } = await pool.query(
    `SELECT COUNT(*)::int AS total_clicks,
            COUNT(*) FILTER (WHERE is_unique)::int AS unique_clicks
     FROM referral_clicks`
  );

  const leadFilter = managerId
    ? `AND l.assigned_manager_id = $1`
    : '';
  const params = managerId ? [managerId] : [];

  const { rows: leadRows } = await pool.query(
    `SELECT COUNT(*)::int AS referral_leads,
            COUNT(*) FILTER (WHERE status = 'won')::int AS referral_won
     FROM leads l
     WHERE l.ref_code IS NOT NULL ${leadFilter}`,
    params
  );

  const uniqueClicks = clickRows[0]?.unique_clicks ?? 0;
  const referralLeads = leadRows[0]?.referral_leads ?? 0;

  return {
    totalClicks: clickRows[0]?.total_clicks ?? 0,
    uniqueClicks,
    referralLeads,
    referralWon: leadRows[0]?.referral_won ?? 0,
    clickToLeadConversion: uniqueClicks > 0 ? Math.round((referralLeads / uniqueClicks) * 100) : 0,
  };
}

// ─── Tiers (admin only) ──────────────────────────────────

async function buildTiers() {
  const { rows: tierDist } = await pool.query(
    `SELECT tier, COUNT(*)::int AS count FROM agents GROUP BY tier`
  );

  const { rows: tierFinance } = await pool.query(
    `SELECT tier_at_creation AS tier,
            COUNT(*)::int AS payouts_count,
            COALESCE(SUM(amount), 0)::numeric(12,2) AS total_amount,
            COALESCE(AVG(amount), 0)::numeric(12,2) AS avg_amount
     FROM payouts WHERE status = 'paid' AND tier_at_creation IS NOT NULL
     GROUP BY tier_at_creation`
  );

  const tiers = ['base', 'silver', 'gold'];
  return tiers.map((t) => {
    const dist = tierDist.find((r) => r.tier === t);
    const fin = tierFinance.find((r) => r.tier === t);
    return {
      tier: t,
      agentCount: dist?.count ?? 0,
      payoutsCount: fin?.payouts_count ?? 0,
      totalRevenue: Number(fin?.total_amount ?? 0),
      avgPayout: Number(fin?.avg_amount ?? 0),
    };
  });
}

// ─── Onboarding (admin only) ─────────────────────────────

async function buildOnboarding() {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE a.onboarding_status != 'pending')::int AS started_learning,
       COUNT(*) FILTER (WHERE a.onboarding_status = 'completed')::int AS completed_learning,
       COUNT(*) FILTER (WHERE a.onboarding_status = 'completed' AND a.total_leads > 0)::int AS with_first_lead
     FROM agents a
     JOIN profiles p ON p.id = a.user_id
     WHERE p.status != 'blocked'`
  );

  const r = rows[0];
  return {
    total: r.total,
    startedLearning: r.started_learning,
    completedLearning: r.completed_learning,
    withFirstLead: r.with_first_lead,
    learningDropoff: r.total > 0 ? Math.round(((r.total - r.started_learning) / r.total) * 100) : 0,
    activationRate: r.total > 0 ? Math.round((r.with_first_lead / r.total) * 100) : 0,
  };
}

// ─── Agent-only analytics ────────────────────────────────

async function buildAgentAnalytics(agentId: string | null) {
  if (!agentId) {
    return { summary: null, funnel: null, segments: null, topAgents: null, referral: null, tiers: null, onboarding: null, agentRank: null };
  }

  // Get agent's rank
  const { rows: allAgents } = await pool.query(
    `SELECT a.id,
            (SELECT COUNT(*)::int FROM leads l WHERE l.assigned_agent_id = a.id AND l.status = 'won') AS won_leads,
            a.total_revenue, a.total_leads
     FROM agents a
     JOIN profiles p ON p.id = a.user_id
     WHERE p.status = 'active'
     ORDER BY won_leads DESC, total_revenue DESC, total_leads DESC`
  );

  const totalAgents = allAgents.length;
  const myIndex = allAgents.findIndex((a) => a.id === agentId);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myData = myIndex >= 0 ? allAgents[myIndex] : null;

  return {
    summary: null,
    funnel: null,
    segments: null,
    topAgents: null,
    referral: null,
    tiers: null,
    onboarding: null,
    agentRank: {
      rank: myRank,
      totalAgents,
      wonLeads: myData?.won_leads ?? 0,
      totalLeads: myData?.total_leads ?? 0,
      revenue: Number(myData?.total_revenue ?? 0),
    },
  };
}
