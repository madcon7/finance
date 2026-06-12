import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), '..', 'uploads');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id=? AND user_id=?').get(params.id, user.userId) as any;
  if (!file) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });

  const filePath = path.join(UPLOADS_DIR, file.file_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'Файл не найден на диске' }, { status: 404 });

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.file_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name)}"`,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id=? AND user_id=?').get(params.id, user.userId) as any;
  if (!file) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });

  try {
    const filePath = path.join(UPLOADS_DIR, file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}

  db.prepare('DELETE FROM files WHERE id=?').run(params.id);
  return NextResponse.json({ ok: true });
}
