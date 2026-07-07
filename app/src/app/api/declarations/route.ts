import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  let query = 'SELECT * FROM declarations WHERE user_id=?';
  const params: any[] = [user.userId];
  if (year) { query += ' AND year=?'; params.push(year); }
  query += ' ORDER BY year DESC';
  const decls = db.prepare(query).all(...params);
  return NextResponse.json(decls);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO declarations (user_id, year, status, comment, deadline, submitted_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user.userId, body.year, body.status || 'не подана', body.comment || '', body.deadline || null, body.submitted_at || null);
    const decl = db.prepare('SELECT * FROM declarations WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(decl, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
