import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'finance.db');

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    // Redirect to login if no token (direct browser link)
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!fs.existsSync(DB_PATH)) return NextResponse.json({ error: 'База данных не найдена' }, { status: 404 });

  const buffer = fs.readFileSync(DB_PATH);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="finance_backup_${date}.db"`,
    },
  });
}
