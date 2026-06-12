import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });

    const token = signToken(user.id, user.email);
    return NextResponse.json({ token, email: user.email });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
