import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const agentFilter = user.role === 'agent' && user.agentId;

    const leadStats = await pool.query(
      agentFilter
        ? `SELECT count(*) as total,
             count(*) filter (where status = 'new') as new_count,
             count(*) filter (where status = 'won') as won_count,
             coalesce(sum(estimated_value) filter (where status = 'won'), 0) as total_revenue
           FROM leads WHERE assigned_agent_id = $1`
        : `SELECT count(*) as total,
             count(*) filter (where status = 'new') as new_count,
             count(*) filter (where status = 'won') as won_count,
             coalesce(sum(estimated_value) filter (where status = 'won'), 0) as total_revenue
           FROM leads`,
      agentFilter ? [user.agentId] : []
    );

    const agentStats = await pool.query(
      `SELECT count(*) as total,
         count(*) filter (where onboarding_status = 'completed') as active
       FROM agents`
    );

    const conversationStats = await pool.query(
      agentFilter
        ? `SELECT count(*) as total,
             count(*) filter (where status = 'active') as active,
             count(*) filter (where status = 'escalated') as escalated
           FROM conversations WHERE agent_id = $1`
        : `SELECT count(*) as total,
             count(*) filter (where status = 'active') as active,
             count(*) filter (where status = 'escalated') as escalated
           FROM conversations`,
      agentFilter ? [user.agentId] : []
    );

    const payoutStats = await pool.query(
      agentFilter
        ? `SELECT
             coalesce(sum(amount) filter (where status = 'paid'), 0) as total_paid,
             coalesce(sum(amount) filter (where status = 'processing'), 0) as processing,
             coalesce(sum(amount) filter (where status = 'pending'), 0) as pending
           FROM payouts WHERE agent_id = $1`
        : `SELECT
             coalesce(sum(amount) filter (where status = 'paid'), 0) as total_paid,
             coalesce(sum(amount) filter (where status = 'processing'), 0) as processing,
             coalesce(sum(amount) filter (where status = 'pending'), 0) as pending
           FROM payouts`,
      agentFilter ? [user.agentId] : []
    );

    return Response.json(toCamelCase({
      leads: leadStats.rows[0],
      agents: agentStats.rows[0],
      conversations: conversationStats.rows[0],
      payouts: payoutStats.rows[0],
    }));
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
