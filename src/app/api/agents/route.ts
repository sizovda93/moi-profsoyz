import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireRole } from '@/lib/auth-server';
import { toCamelCase } from '@/lib/api-utils';
import { computeLifecycle } from '@/lib/lifecycle';
import type { UserStatus, OnboardingStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole('manager', 'admin');
    if (auth.error) return auth.error;
    const { user } = auth;

    const sp = request.nextUrl.searchParams;

    // ?unassigned=true — show agents without manager (for "claim" UI)
    const showUnassigned = sp.get('unassigned') === 'true';

    // Check if union tables exist (migration may not be applied yet)
    let hasUnionTables = true;
    try {
      await pool.query(`SELECT 1 FROM unions LIMIT 0`);
    } catch {
      hasUnionTables = false;
    }

    let query = hasUnionTables
      ? `SELECT a.*, p.full_name, p.email, p.phone, p.avatar_url, p.status as user_status,
                pm.full_name as manager_name,
                ud.name as division_name,
                u.name as union_name, u.short_name as union_short_name
         FROM agents a
         JOIN profiles p ON p.id = a.user_id
         LEFT JOIN profiles pm ON pm.id = a.manager_id
         LEFT JOIN union_divisions ud ON ud.id = a.division_id
         LEFT JOIN unions u ON u.id = a.union_id`
      : `SELECT a.*, p.full_name, p.email, p.phone, p.avatar_url, p.status as user_status,
                pm.full_name as manager_name
         FROM agents a
         JOIN profiles p ON p.id = a.user_id
         LEFT JOIN profiles pm ON pm.id = a.manager_id`;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    // Scope: manager sees own, admin sees all, unassigned override
    if (showUnassigned) {
      conditions.push(`a.manager_id IS NULL`);
    } else if (user.role === 'manager') {
      conditions.push(`a.manager_id = $${idx}`);
      params.push(user.id);
      idx++;
    }

    // Filter: gender
    const gender = sp.get('gender');
    if (gender && ['male', 'female', 'not_specified'].includes(gender)) {
      conditions.push(`a.gender = $${idx}`);
      params.push(gender);
      idx++;
    }

    // Filter: city (ILIKE)
    const city = sp.get('city');
    if (city && city.trim()) {
      conditions.push(`a.city ILIKE $${idx}`);
      params.push(`%${city.trim()}%`);
      idx++;
    }

    // Filter: profession (ILIKE)
    const profession = sp.get('profession');
    if (profession && profession.trim()) {
      conditions.push(`a.profession ILIKE $${idx}`);
      params.push(`%${profession.trim()}%`);
      idx++;
    }

    // Filter: age range via birth_year
    const currentYear = new Date().getFullYear();
    const minAge = sp.get('minAge');
    if (minAge && !isNaN(Number(minAge))) {
      // minAge=25 → birth_year <= currentYear - 25
      conditions.push(`a.birth_year <= $${idx}`);
      params.push(currentYear - Number(minAge));
      idx++;
    }
    const maxAge = sp.get('maxAge');
    if (maxAge && !isNaN(Number(maxAge))) {
      // maxAge=40 → birth_year >= currentYear - 40
      conditions.push(`a.birth_year >= $${idx}`);
      params.push(currentYear - Number(maxAge));
      idx++;
    }

    // Filter: search (name or email)
    const search = sp.get('search');
    if (search && search.trim()) {
      conditions.push(`(p.full_name ILIKE $${idx} OR p.email ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    // Filter: divisionId
    const divisionId = sp.get('divisionId');
    if (divisionId && divisionId.trim()) {
      conditions.push(`a.division_id = $${idx}`);
      params.push(divisionId.trim());
      idx++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    // Sorting
    const sort = sp.get('sort') || 'newest';
    const orderMap: Record<string, string> = {
      newest: 'a.created_at DESC',
      oldest: 'a.created_at ASC',
      age_asc: 'a.birth_year DESC NULLS LAST',   // younger first = higher birth_year
      age_desc: 'a.birth_year ASC NULLS LAST',    // older first = lower birth_year
      name_asc: 'p.full_name ASC',
      name_desc: 'p.full_name DESC',
      leads_desc: 'a.total_leads DESC',
      revenue_desc: 'a.total_revenue DESC',
    };
    query += ` ORDER BY ${orderMap[sort] || orderMap.newest}`;

    const { rows } = await pool.query(query, params);

    const result = rows.map((row) => {
      const lifecycle = computeLifecycle(
        row.user_status as UserStatus,
        row.onboarding_status as OnboardingStatus,
        row.total_leads
      );
      return { ...(toCamelCase(row) as Record<string, unknown>), lifecycle };
    });

    return Response.json(result);
  } catch (err) {
    console.error('GET /api/agents error:', err);
    return Response.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
