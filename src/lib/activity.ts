import pool from '@/lib/db';

/**
 * Update last_activity_at on the agent record.
 * Called from all agent activity points:
 * - lead creation (POST /api/leads)
 * - learning progress (POST /api/learning/progress)
 * - web message sent (POST /api/conversations/[id])
 * - telegram inbound message (POST /api/telegram/webhook)
 * - document upload (POST /api/documents)
 *
 * Fire-and-forget — never blocks the main flow.
 */
export async function touchAgentActivity(agentId: string): Promise<void> {
  await pool.query(
    `UPDATE agents SET last_activity_at = now() WHERE id = $1`,
    [agentId]
  );
}

/**
 * Same as above but takes profile_id (user_id) instead of agent_id.
 * Useful when we only have the profile context (e.g., learning progress).
 */
export async function touchAgentActivityByProfile(profileId: string): Promise<void> {
  await pool.query(
    `UPDATE agents SET last_activity_at = now() WHERE user_id = $1`,
    [profileId]
  );
}
