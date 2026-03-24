import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const { agentIds, managerId } = await request.json();

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return Response.json({ error: 'Выберите хотя бы одного члена' }, { status: 400 });
    }

    // Determine target manager
    const targetManagerId = user.role === 'admin' && managerId ? managerId : user.id;

    // For manager role: only allow assigning unassigned agents
    if (user.role === 'manager') {
      const { rows: check } = await pool.query(
        `SELECT id FROM agents WHERE id = ANY($1) AND manager_id IS NOT NULL AND manager_id != $2`,
        [agentIds, user.id]
      );
      if (check.length > 0) {
        return Response.json(
          { error: `${check.length} из выбранных членов уже закреплены за другим руководителем` },
          { status: 400 }
        );
      }
    }

    // Perform bulk update
    const { rowCount } = await pool.query(
      `UPDATE agents SET manager_id = $1 WHERE id = ANY($2)`,
      [targetManagerId, agentIds]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('agents.bulk_assigned', $1, $2)`,
      [user.email, `Назначено ${rowCount} членов руководителю ${targetManagerId}`]
    );

    return Response.json({ assigned: rowCount });
  } catch (err) {
    console.error('POST /api/agents/bulk-assign error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
