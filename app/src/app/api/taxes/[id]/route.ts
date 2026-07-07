import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  // If only status is sent, do partial update
  if (body.status && Object.keys(body).length === 1) {
    db.prepare(`UPDATE taxes SET status=?, updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(body.status, params.id, user.userId);
    return NextResponse.json(db.prepare('SELECT * FROM taxes WHERE id=?').get(params.id));
  }
  const profit = (body.sell_amount || 0) - (body.buy_amount || 0);
  const taxAmount = profit > 0 ? profit * (body.tax_rate || 10) / 100 : 0;
  db.prepare(`
    UPDATE taxes SET year=?, description=?, buy_amount=?, sell_amount=?, profit=?,
      tax_amount=?, tax_rate=?, status=?, comment=?, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).run(body.year, body.description, body.buy_amount || 0, body.sell_amount || 0,
    profit, taxAmount, body.tax_rate || 10, body.status, body.comment || '', params.id, user.userId);
  return NextResponse.json(db.prepare('SELECT * FROM taxes WHERE id=?').get(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM taxes WHERE id=? AND user_id=?').run(params.id, user.userId);
  return NextResponse.json({ ok: true });
}
