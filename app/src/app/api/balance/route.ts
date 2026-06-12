import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const uid = user.userId;

  const years: number[] = (db.prepare(
    'SELECT DISTINCT year FROM transactions WHERE user_id = ? ORDER BY year'
  ).all(uid) as any[]).map((r: any) => r.year);

  const assetYears: number[] = (db.prepare(
    'SELECT DISTINCT declaration_year FROM assets WHERE user_id = ? AND declaration_year IS NOT NULL ORDER BY declaration_year'
  ).all(uid) as any[]).map((r: any) => r.declaration_year);

  const allYears = Array.from(new Set([...years, ...assetYears])).sort();

  const rows = allYears.map(year => {
    const txs = db.prepare(
      'SELECT type, SUM(amount_kzt) as total, payment_method FROM transactions WHERE user_id=? AND year=? GROUP BY type, payment_method'
    ).all(uid, year) as any[];

    let income = 0, expenses = 0, asset_purchases = 0, asset_sales = 0;
    let cash_in = 0, cash_out = 0, noncash_in = 0, noncash_out = 0;

    for (const tx of txs) {
      const amt = tx.total || 0;
      const isCash = tx.payment_method === 'наличные';
      if (tx.type === 'доход') {
        income += amt;
        if (isCash) cash_in += amt; else noncash_in += amt;
      } else if (tx.type === 'расход') {
        expenses += amt;
        if (isCash) cash_out += amt; else noncash_out += amt;
      } else if (tx.type === 'покупка актива') {
        asset_purchases += amt;
        if (isCash) cash_out += amt; else noncash_out += amt;
      } else if (tx.type === 'продажа актива') {
        asset_sales += amt;
        if (isCash) cash_in += amt; else noncash_in += amt;
      }
    }

    const assets_total = (db.prepare(
      'SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND declaration_year=?'
    ).get(uid, year) as any)?.total || 0;

    return { year, income, expenses, asset_purchases, asset_sales, assets_total };
  });

  let running_cash = 0, running_noncash = 0;
  const result = rows.map((r, i) => {
    const prev = i > 0 ? rows[i - 1] : null;
    const start = prev ? prev.income + prev.asset_sales - prev.expenses - prev.asset_purchases : 0;
    const end = start + r.income + r.asset_sales - r.expenses - r.asset_purchases;
    return { ...r, start_balance: start, end_balance: end };
  });

  return NextResponse.json(result);
}
