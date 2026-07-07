import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');

  let query = `SELECT t.*, a.name as asset_name, a.category as asset_category,
    a.country as asset_country, a.purchase_date, a.sold_date as asset_sold_date
    FROM taxes t LEFT JOIN assets a ON t.asset_id = a.id
    WHERE t.user_id = ?`;
  const params: any[] = [user.userId];
  if (year) { query += ' AND t.year = ?'; params.push(year); }
  query += ' ORDER BY t.year DESC, t.created_at DESC';

  return NextResponse.json(db.prepare(query).all(...params));
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  const buy = parseFloat(body.buy_amount) || 0;
  const sell = parseFloat(body.sell_amount) || 0;
  const profit = sell - buy;
  const taxAmt = profit > 0 ? profit * (parseFloat(body.tax_rate) || 10) / 100 : 0;
  const result = db.prepare(`
    INSERT INTO taxes (user_id, asset_id, year, description, buy_amount, sell_amount, profit, tax_amount, tax_rate, status, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.userId, body.asset_id || null, body.year, body.description || '',
    buy, sell, profit, taxAmt,
    parseFloat(body.tax_rate) || 10, body.status || 'нужно проверить', body.comment || '');
  return NextResponse.json(db.prepare('SELECT * FROM taxes WHERE id=?').get(result.lastInsertRowid), { status: 201 });
}
