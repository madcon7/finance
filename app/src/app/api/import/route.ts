import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    const preview: any[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      preview.push({ sheet: sheetName, rows: data.slice(0, 30) });
    }

    return NextResponse.json({ preview, sheets: wb.SheetNames });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка чтения файла' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const { assets } = await req.json();
    if (!Array.isArray(assets)) return NextResponse.json({ error: 'Неверный формат' }, { status: 400 });

    const db = getDb();
    let imported = 0;
    for (const a of assets) {
      if (!a.name) continue;
      db.prepare(`
        INSERT INTO assets (user_id, name, category, country, city, amount_kzt, purchase_date,
          declaration_year, source_type, is_foreign, needs_declaration, is_declared, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.userId, a.name, a.category || 'другое', a.country || 'Казахстан',
        a.city || '', parseFloat(a.amount_kzt) || 0, a.purchase_date || null,
        parseInt(a.declaration_year) || null, a.source_type || 'безналичные',
        a.is_foreign ? 1 : 0, a.needs_declaration ? 1 : 0, a.is_declared ? 1 : 0,
        a.comment || ''
      );
      imported++;
    }
    return NextResponse.json({ imported });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка импорта' }, { status: 500 });
  }
}
