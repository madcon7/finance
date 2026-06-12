import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  let query = `SELECT t.*, a.name as asset_name FROM transactions t
    LEFT JOIN assets a ON t.asset_id = a.id
    WHERE t.user_id = ?`;
  const params: any[] = [user.userId];

  if (year) { query += ' AND t.year = ?'; params.push(year); }
  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (search) { query += ' AND t.description LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY t.date DESC';
  const txs = db.prepare(query).all(...params);
  return NextResponse.json(txs);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    const year = body.year || new Date(body.date).getFullYear();
    const result = db.prepare(`
      INSERT INTO transactions (user_id, asset_id, date, year, type, amount_kzt, payment_method, description, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.userId, body.asset_id || null, body.date, year,
      body.type, body.amount_kzt || 0, body.payment_method || 'безналичные',
      body.description || '', body.comment || ''
    );
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(tx, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
