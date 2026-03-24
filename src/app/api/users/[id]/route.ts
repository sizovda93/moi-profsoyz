import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';

type RouteContext = { params: Promise<{ id: string }> };

const VALID_GENDERS = ['male', 'female', 'not_specified'];
const VALID_MESSENGERS = ['telegram', 'max', 'vk'];

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;

    const isAdmin = user.role === 'admin';
    const isSelf = user.id === id;

    if (!isAdmin && !isSelf) {
      return Response.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const existing = await pool.query(`SELECT * FROM profiles WHERE id = $1`, [id]);
    if (existing.rows.length === 0) {
      return Response.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();

    // ========== PROFILES table fields ==========
    const profileUpdates: string[] = [];
    const profileValues: (string | null)[] = [];
    let pIdx = 1;

    const selfFields: Record<string, string> = {
      fullName: 'full_name',
      phone: 'phone',
      avatarUrl: 'avatar_url',
    };

    const adminFields: Record<string, string> = {
      role: 'role',
      status: 'status',
    };

    const allowedProfileFields = isAdmin ? { ...selfFields, ...adminFields } : selfFields;

    for (const [camelKey, dbCol] of Object.entries(allowedProfileFields)) {
      if (body[camelKey] !== undefined) {
        profileUpdates.push(`${dbCol} = $${pIdx}`);
        profileValues.push(body[camelKey]);
        pIdx++;
      }
    }

    // ========== AGENTS table fields (self or admin) ==========
    const agentUpdates: string[] = [];
    const agentValues: unknown[] = [];
    let aIdx = 1;

    // Validate & collect agent fields
    if (body.gender !== undefined) {
      if (!VALID_GENDERS.includes(body.gender)) {
        return Response.json({ error: `Недопустимый пол: ${body.gender}. Доступные: ${VALID_GENDERS.join(', ')}` }, { status: 400 });
      }
      agentUpdates.push(`gender = $${aIdx}`);
      agentValues.push(body.gender);
      aIdx++;
    }

    if (body.birthYear !== undefined) {
      const year = body.birthYear === null ? null : Number(body.birthYear);
      if (year !== null && (isNaN(year) || year < 1940 || year > 2010)) {
        return Response.json({ error: 'Год рождения должен быть от 1940 до 2010' }, { status: 400 });
      }
      agentUpdates.push(`birth_year = $${aIdx}`);
      agentValues.push(year);
      aIdx++;
    }

    if (body.profession !== undefined) {
      const prof = body.profession ? String(body.profession).trim() : null;
      if (prof && prof.length > 255) {
        return Response.json({ error: 'Профессия не должна превышать 255 символов' }, { status: 400 });
      }
      agentUpdates.push(`profession = $${aIdx}`);
      agentValues.push(prof);
      aIdx++;
    }

    if (body.preferredMessenger !== undefined) {
      if (!VALID_MESSENGERS.includes(body.preferredMessenger)) {
        return Response.json({ error: `Недопустимый мессенджер: ${body.preferredMessenger}. Доступные: ${VALID_MESSENGERS.join(', ')}` }, { status: 400 });
      }
      agentUpdates.push(`preferred_messenger = $${aIdx}`);
      agentValues.push(body.preferredMessenger);
      aIdx++;
    }

    if (body.city !== undefined) {
      const city = body.city ? String(body.city).trim() : '';
      agentUpdates.push(`city = $${aIdx}`);
      agentValues.push(city);
      aIdx++;
    }

    if (body.specialization !== undefined) {
      const spec = body.specialization ? String(body.specialization).trim() : '';
      agentUpdates.push(`specialization = $${aIdx}`);
      agentValues.push(spec);
      aIdx++;
    }

    if (profileUpdates.length === 0 && agentUpdates.length === 0) {
      return Response.json({ error: 'Нет полей для обновления' }, { status: 400 });
    }

    // Update profiles table
    let profileRow = null;
    if (profileUpdates.length > 0) {
      profileValues.push(id);
      const { rows } = await pool.query(
        `UPDATE profiles SET ${profileUpdates.join(', ')} WHERE id = $${pIdx} RETURNING id, role, full_name, email, phone, avatar_url, status, created_at`,
        profileValues
      );
      profileRow = rows[0];
    }

    // Update agents table
    if (agentUpdates.length > 0) {
      agentValues.push(id);
      await pool.query(
        `UPDATE agents SET ${agentUpdates.join(', ')}, updated_at = now() WHERE user_id = $${aIdx}`,
        agentValues
      );
    }

    // Audit log
    const allChanges = [...profileUpdates, ...agentUpdates].map((u) => u.split(' = ')[0]);
    await pool.query(
      `INSERT INTO audit_logs (action, user_email, details) VALUES ('user.updated', $1, $2)`,
      [user.email, `Пользователь ${id}: ${allChanges.join(', ')}`]
    );

    // Return updated profile + agent data
    if (profileRow) {
      return Response.json(toCamelCase(profileRow));
    }

    // If only agent fields changed, return fresh profile data
    const { rows: fresh } = await pool.query(
      `SELECT p.id, p.role, p.full_name, p.email, p.phone, p.avatar_url, p.status, p.created_at,
              a.city, a.specialization, a.gender, a.birth_year, a.profession, a.preferred_messenger
       FROM profiles p
       LEFT JOIN agents a ON a.user_id = p.id
       WHERE p.id = $1`,
      [id]
    );
    return Response.json(toCamelCase(fresh[0]));
  } catch (err) {
    console.error('PUT /api/users/[id] error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
