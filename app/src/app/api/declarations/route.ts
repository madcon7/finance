import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  const decls = db.prepare('SELECT * FROM declarations WHERE user_id = ? ORDER BY year DESC').all(user.userId);
  return NextResponse.json(decls);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO declarations (user_id, year, status, file_path, comment) VALUES (?, ?, ?, ?, ?)'
    ).run(user.userId, body.year, body.status || 'не сдана', body.file_path || '', body.comment || '');
    const decl = db.prepare('SELECT * FROM declarations WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(decl, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
