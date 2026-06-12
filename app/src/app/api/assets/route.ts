import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const category = searchParams.get('category');
  const country = searchParams.get('country');
  const search = searchParams.get('search');

  let query = 'SELECT * FROM assets WHERE user_id = ?';
  const params: any[] = [user.userId];

  if (year) { query += ' AND declaration_year = ?'; params.push(year); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (country) { query += ' AND country = ?'; params.push(country); }
  if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY created_at DESC';
  const assets = db.prepare(query).all(...params);
  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO assets (user_id, name, category, country, city, amount_kzt, purchase_date,
        declaration_year, source_type, is_foreign, needs_declaration, is_declared, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.userId, body.name, body.category || 'другое', body.country || 'Казахстан',
      body.city || '', body.amount_kzt || 0, body.purchase_date || null,
      body.declaration_year || null, body.source_type || 'безналичные',
      body.is_foreign ? 1 : 0, body.needs_declaration ? 1 : 0, body.is_declared ? 1 : 0,
      body.comment || ''
    );
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(asset, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
