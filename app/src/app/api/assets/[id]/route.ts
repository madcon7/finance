import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?').get(params.id, user.userId);
  if (!asset) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    db.prepare(`
      UPDATE assets SET name=?, category=?, country=?, city=?, amount_kzt=?, purchase_date=?,
        declaration_year=?, source_type=?, is_foreign=?, needs_declaration=?, is_declared=?,
        comment=?, updated_at=datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      body.name, body.category, body.country, body.city, body.amount_kzt,
      body.purchase_date, body.declaration_year, body.source_type,
      body.is_foreign ? 1 : 0, body.needs_declaration ? 1 : 0, body.is_declared ? 1 : 0,
      body.comment, params.id, user.userId
    );
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(params.id);
    return NextResponse.json(asset);
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM assets WHERE id = ? AND user_id = ?').run(params.id, user.userId);
  return NextResponse.json({ ok: true });
}
