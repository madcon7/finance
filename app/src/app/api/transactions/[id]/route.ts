import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const year = body.year || new Date(body.date).getFullYear();
    db.prepare(`
      UPDATE transactions SET asset_id=?, date=?, year=?, type=?, amount_kzt=?,
        payment_method=?, description=?, comment=?
      WHERE id = ? AND user_id = ?
    `).run(body.asset_id || null, body.date, year, body.type, body.amount_kzt,
      body.payment_method, body.description, body.comment, params.id, user.userId);
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(params.id);
    return NextResponse.json(tx);
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(params.id, user.userId);
  return NextResponse.json({ ok: true });
}
