import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const body = await req.json();
  const db = getDb();
  db.prepare(`UPDATE declarations SET year=?, status=?, comment=?, deadline=?, submitted_at=? WHERE id=? AND user_id=?`)
    .run(body.year, body.status, body.comment || '', body.deadline || null, body.submitted_at || null, params.id, user.userId);
  return NextResponse.json(db.prepare('SELECT * FROM declarations WHERE id=?').get(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM declarations WHERE id=? AND user_id=?').run(params.id, user.userId);
  return NextResponse.json({ ok: true });
}
