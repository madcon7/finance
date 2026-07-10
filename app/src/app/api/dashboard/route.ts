import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const uid = user.userId;
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const yearFilter = year ? ' AND year=?' : '';
  const yearParam = year ? [year] : [];

  // Property assets (real estate, cars, business etc) - active only
  const propertyAssets = (db.prepare(
    `SELECT COALESCE(SUM(amount_kzt),0) as total, COUNT(*) as cnt FROM assets
     WHERE user_id=? AND status='активный' AND category NOT IN ('наличные','банковский счет')${year ? ' AND declaration_year=?' : ''}`
  ).get(uid, ...yearParam) as any);

  // Cash (from transactions: income - expenses in cash)
  const cashTx = db.prepare(
    `SELECT type, SUM(amount_kzt) as total FROM transactions WHERE user_id=? AND payment_method IN ('наличные','смешанный')${yearFilter} GROUP BY type`
  ).all(uid, ...yearParam) as any[];

  // Noncash (from transactions)
  const noncashTx = db.prepare(
    `SELECT type, SUM(amount_kzt) as total FROM transactions WHERE user_id=? AND payment_method IN ('безналичные','смешанный')${yearFilter} GROUP BY type`
  ).all(uid, ...yearParam) as any[];

  // Also include cash/bank assets
  const cashAssets = (db.prepare(
    `SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND category='наличные' AND status='активный'`
  ).get(uid) as any)?.total || 0;

  const bankAssets = (db.prepare(
    `SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND category='банковский счет' AND status='активный'`
  ).get(uid) as any)?.total || 0;

  const INCOME_TYPES = ['доход', 'продажа актива', 'дивиденды', 'займ возврат'];
  const EXPENSE_TYPES = ['расход', 'покупка актива', 'займ выдача'];

  function calcBalance(txs: any[], types_in: string[], types_out: string[]) {
    let bal = 0;
    for (const tx of txs) {
      if (types_in.includes(tx.type)) bal += tx.total;
      if (types_out.includes(tx.type)) bal -= tx.total;
    }
    return bal;
  }

  const cashFromTx = calcBalance(cashTx, INCOME_TYPES, EXPENSE_TYPES);
  const noncashFromTx = calcBalance(noncashTx, INCOME_TYPES, EXPENSE_TYPES);

  const total_cash = Math.max(0, cashFromTx) + cashAssets;
  const total_noncash = Math.max(0, noncashFromTx) + bankAssets;
  const total_money = total_cash + total_noncash;
  const total_property = propertyAssets.total || 0;
  const total_capital = total_money + total_property;

  // Taxes to pay
  const taxesToPay = (db.prepare(
    `SELECT COALESCE(SUM(tax_amount),0) as total FROM taxes WHERE user_id=? AND status='нужно оплатить'`
  ).get(uid) as any)?.total || 0;

  // By category
  const byCategory = db.prepare(
    `SELECT category, SUM(amount_kzt) as total, COUNT(*) as cnt FROM assets WHERE user_id=? AND status='активный' GROUP BY category`
  ).all(uid);

  return NextResponse.json({
    total_cash, total_noncash, total_money,
    total_property, total_capital,
    asset_count: propertyAssets.cnt || 0,
    taxes_to_pay: taxesToPay,
    by_category: byCategory,
  });
}
