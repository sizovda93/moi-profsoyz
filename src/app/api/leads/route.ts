import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { normalizePhone } from '@/lib/phone';
import { touchAgentActivity } from '@/lib/activity';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    let query = `SELECT l.*,
       ag.id as agent_uuid,
       pa.full_name as agent_name,
       pm.full_name as manager_name,
       ag.division_id as agent_division_id
     FROM leads l
     LEFT JOIN agents ag ON ag.id = l.assigned_agent_id
     LEFT JOIN profiles pa ON pa.id = ag.user_id
     LEFT JOIN profiles pm ON pm.id = l.assigned_manager_id`;
    const conditions: string[] = [];
    const params: string[] = [];
    let idx = 1;

    if (user.role === 'agent' && user.agentId) {
      conditions.push(`l.assigned_agent_id = $${idx}`);
      params.push(user.agentId);
      idx++;
    } else if (user.role === 'manager') {
      conditions.push(`l.assigned_manager_id = $${idx}`);
      params.push(user.id);
      idx++;
    }

    // Division filter (manager/admin only)
    const divisionId = request.nextUrl.searchParams.get('divisionId');
    if (divisionId && divisionId.trim() && user.role !== 'agent') {
      conditions.push(`ag.division_id = $${idx}`);
      params.push(divisionId.trim());
      idx++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY l.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return Response.json(toCamelCase(rows));
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole('agent', 'manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { fullName, phone, email, city, source, assignedAgentId, comment, estimatedValue, refCode, requestType } = body;

    if (!fullName || !phone) {
      return Response.json({ error: 'ФИО и телефон обязательны' }, { status: 400 });
    }

    const validSources = ['website', 'telegram', 'whatsapp', 'referral', 'cold', 'partner'];
    const leadSource = validSources.includes(source) ? source : 'website';

    const validRequestTypes = ['complaint', 'request', 'initiative', 'consultation'];
    const leadRequestType = validRequestTypes.includes(requestType) ? requestType : 'consultation';

    const effectiveAgentId = user.role === 'agent' ? user.agentId : assignedAgentId;

    if (effectiveAgentId && user.role !== 'agent') {
      const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [effectiveAgentId]);
      if (agentCheck.rows.length === 0) {
        return Response.json({ error: 'Агент не найден' }, { status: 400 });
      }
    }

    // Determine assigned_manager_id
    let effectiveManagerId: string | null = user.id; // default: creator
    if (user.role === 'agent' && user.agentId) {
      // Agent creates lead → manager from binding
      const { rows: agentRows } = await pool.query(
        'SELECT manager_id FROM agents WHERE id = $1',
        [user.agentId]
      );
      effectiveManagerId = agentRows[0]?.manager_id || null;
    }

    // Validate ref_code
    let validRefCode: string | null = null;
    if (refCode && typeof refCode === "string") {
      const refCheck = await pool.query("SELECT id FROM agents WHERE ref_code = $1", [refCode.toUpperCase()]);
      if (refCheck.rows.length > 0) validRefCode = refCode.toUpperCase();
    }

    // ─── Duplicate detection ─────────────────────────
    const phoneNorm = normalizePhone(phone);
    let conflictLeadId: string | null = null;
    let conflictMatchType: string | null = null;

    // Check by phone
    if (phoneNorm) {
      const { rows: phoneMatches } = await pool.query(
        `SELECT id, full_name, assigned_agent_id FROM leads
         WHERE phone_normalized = $1 AND status NOT IN ('lost')
         ORDER BY created_at ASC LIMIT 1`,
        [phoneNorm]
      );
      if (phoneMatches.length > 0) {
        conflictLeadId = phoneMatches[0].id;
        conflictMatchType = 'phone';
      }
    }

    // Check by email
    if (email && typeof email === 'string' && email.trim()) {
      const { rows: emailMatches } = await pool.query(
        `SELECT id, full_name, assigned_agent_id FROM leads
         WHERE lower(email) = lower($1) AND status NOT IN ('lost')
         ORDER BY created_at ASC LIMIT 1`,
        [email.trim()]
      );
      if (emailMatches.length > 0) {
        if (conflictLeadId && conflictLeadId === emailMatches[0].id) {
          conflictMatchType = 'both';
        } else if (!conflictLeadId) {
          conflictLeadId = emailMatches[0].id;
          conflictMatchType = 'email';
        }
        // If phone matched a different lead than email, use phone match (first created)
      }
    }

    const hasConflict = conflictLeadId !== null;

    // ─── Insert lead ─────────────────────────────────
    const { rows } = await pool.query(
      `INSERT INTO leads (full_name, phone, phone_normalized, email, city, source,
                          assigned_agent_id, assigned_manager_id, comment, estimated_value,
                          ref_code, request_type, conflict_status, conflict_with_lead_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        fullName,
        phone,
        phoneNorm || null,
        email || null,
        city || '',
        validRefCode ? 'referral' : leadSource,
        effectiveAgentId || null,
        effectiveManagerId,
        comment || null,
        estimatedValue || null,
        validRefCode,
        leadRequestType,
        hasConflict ? 'open' : null,
        conflictLeadId,
      ]
    );

    const newLead = rows[0];

    // Update agent active_leads
    if (effectiveAgentId) {
      await pool.query(
        `UPDATE agents SET active_leads = (SELECT count(*) FROM leads WHERE assigned_agent_id = $1 AND status NOT IN ('won','lost'))
         WHERE id = $1`,
        [effectiveAgentId]
      );
      touchAgentActivity(effectiveAgentId).catch(() => {});
    }

    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('lead.created', $1, $2)`,
      [user.email, `Лид: ${fullName}, телефон: ${phone}${hasConflict ? ' [CONFLICT]' : ''}`]
    );

    // lead_events: creation
    await pool.query(
      `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'created', $2, $3)`,
      [newLead.id, user.email, `Создан лид: ${fullName}`]
    );

    // lead_events: ownership
    if (effectiveAgentId) {
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'ownership_assigned', $2, $3)`,
        [newLead.id, user.email, `Owner: agent ${effectiveAgentId}`]
      );
    }

    // lead_events: conflict detected
    if (hasConflict) {
      // Event on new lead
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'duplicate_detected', $2, $3)`,
        [newLead.id, user.email, `Совпадение по ${conflictMatchType} с лидом ${conflictLeadId}`]
      );
      // Event on existing lead
      await pool.query(
        `INSERT INTO lead_events (lead_id, event_type, actor_email, details) VALUES ($1, 'duplicate_detected', $2, $3)`,
        [conflictLeadId, user.email, `Возможный дубль: лид ${newLead.id}`]
      );
    }

    // Notify manager about new lead (in-app + Telegram)
    if (effectiveManagerId && user.role === 'agent') {
      const agentName = user.fullName || 'Агент';
      const notifText = `Новый лид от агента ${agentName}: ${fullName}, тел. ${phone}`;

      // In-app notification
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
        [effectiveManagerId, 'Новый лид', notifText]
      ).catch(() => {});

      // Telegram notification to manager
      import('@/lib/telegram').then(({ notifyAgent }) => {
        // notifyAgent looks up telegram by profile_id
        notifyAgent(effectiveManagerId!, notifText).catch(() => {});
      }).catch(() => {});
    }

    return Response.json(
      {
        ...toCamelCase(newLead),
        conflict: hasConflict,
        conflictMatchType: conflictMatchType,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/leads error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
