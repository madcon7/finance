import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), '..', 'uploads');

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const relatedType = searchParams.get('related_type');
  const relatedId = searchParams.get('related_id');

  const db = getDb();
  let query = 'SELECT * FROM files WHERE user_id = ?';
  const params: any[] = [user.userId];
  if (relatedType) { query += ' AND related_type = ?'; params.push(relatedType); }
  if (relatedId) { query += ' AND related_id = ?'; params.push(relatedId); }
  query += ' ORDER BY uploaded_at DESC';

  return NextResponse.json(db.prepare(query).all(...params));
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const relatedType = formData.get('related_type') as string;
    const relatedId = formData.get('related_id') as string;

    if (!file) return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const ext = path.extname(file.name);
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO files (user_id, related_type, related_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user.userId, relatedType, parseInt(relatedId), file.name, safeName, file.type);

    return NextResponse.json(db.prepare('SELECT * FROM files WHERE id=?').get(result.lastInsertRowid), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
