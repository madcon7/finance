import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return NextResponse.json({ error: 'Пользователь уже существует' }, { status: 400 });

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hash);
    const token = signToken(result.lastInsertRowid as number, email);

    return NextResponse.json({ token, email });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
