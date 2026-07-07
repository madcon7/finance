import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const category = searchParams.get('category');
  const country = searchParams.get('country');
  const search = searchParams.get('search');
  const status = searchParams.get('status');

  let query = 'SELECT * FROM assets WHERE user_id = ?';
  const params: any[] = [user.userId];

  if (year) { query += ' AND declaration_year = ?'; params.push(year); }
  if (month) { query += " AND strftime('%m', purchase_date) = ?"; params.push(month.padStart(2, '0')); }
  if (dateFrom) { query += ' AND purchase_date >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND purchase_date <= ?'; params.push(dateTo); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (country) { query += ' AND country = ?'; params.push(country); }
  if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (status) { query += ' AND status = ?'; params.push(status); }

  query += ' ORDER BY created_at DESC';
  return NextResponse.json(db.prepare(query).all(...params));
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    const extraData = JSON.stringify(body.extra_data || {});
    const total = parseFloat(body.amount_kzt) || 0;
    let cashAmt = parseFloat(body.cash_amount) || 0;
    let noncashAmt = parseFloat(body.noncash_amount) || 0;
    if (body.source_type === 'наличные') { cashAmt = total; noncashAmt = 0; }
    if (body.source_type === 'безналичные') { noncashAmt = total; cashAmt = 0; }

    const result = db.prepare(`
      INSERT INTO assets (user_id, name, category, country, city, amount_kzt,
        cash_amount, noncash_amount, purchase_date, declaration_year,
        source_type, is_foreign, needs_declaration, is_declared,
        status, comment, extra_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'активный', ?, ?)
    `).run(
      user.userId, body.name, body.category || 'другое',
      body.country || 'Казахстан', body.city || '',
      total, cashAmt, noncashAmt,
      body.purchase_date || null, body.declaration_year || null,
      body.source_type || 'безналичные',
      body.is_foreign ? 1 : 0, body.needs_declaration ? 1 : 0, body.is_declared ? 1 : 0,
      body.comment || '', extraData
    );
    return NextResponse.json(db.prepare('SELECT * FROM assets WHERE id=?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
