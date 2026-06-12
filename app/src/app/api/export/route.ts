import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const db = getDb();

  const assets = db.prepare(
    year ? 'SELECT * FROM assets WHERE user_id=? AND declaration_year=?' : 'SELECT * FROM assets WHERE user_id=?'
  ).all(...(year ? [user.userId, year] : [user.userId])) as any[];

  const transactions = db.prepare(
    year ? 'SELECT * FROM transactions WHERE user_id=? AND year=?' : 'SELECT * FROM transactions WHERE user_id=?'
  ).all(...(year ? [user.userId, year] : [user.userId])) as any[];

  const wb = XLSX.utils.book_new();

  const assetRows = assets.map(a => ({
    'Название': a.name,
    'Категория': a.category,
    'Страна': a.country,
    'Город': a.city,
    'Сумма (₸)': a.amount_kzt,
    'Дата покупки': a.purchase_date,
    'Год декларации': a.declaration_year,
    'Источник': a.source_type,
    'Зарубежный': a.is_foreign ? 'Да' : 'Нет',
    'Задекларирован': a.is_declared ? 'Да' : 'Нет',
    'Комментарий': a.comment,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetRows), 'Активы');

  const txRows = transactions.map(t => ({
    'Дата': t.date,
    'Год': t.year,
    'Тип': t.type,
    'Сумма (₸)': t.amount_kzt,
    'Способ': t.payment_method,
    'Описание': t.description,
    'Комментарий': t.comment,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Транзакции');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="finance_export_${year || 'all'}_${date}.xlsx"`,
    },
  });
}
