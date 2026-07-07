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
  const month = searchParams.get('month');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  function buildTxWhere(extraAnd = '') {
    let where = 'user_id=?';
    const p: any[] = [uid];
    if (year && !month && !dateFrom) { where += ' AND year=?'; p.push(year); }
    if (year && month) { where += ' AND year=? AND strftime(\'%m\', date)=?'; p.push(year, month.padStart(2,'0')); }
    if (dateFrom) { where += ' AND date>=?'; p.push(dateFrom); }
    if (dateTo) { where += ' AND date<=?'; p.push(dateTo); }
    if (extraAnd) where += extraAnd;
    return { where, p };
  }

  // If specific filter (month/date range), return single period
  if (month || dateFrom) {
    const { where, p } = buildTxWhere();
    const txs = db.prepare(
      `SELECT type, payment_method, SUM(amount_kzt) as total, SUM(cash_amount) as cash_total, SUM(noncash_amount) as noncash_total
       FROM transactions WHERE ${where} GROUP BY type, payment_method`
    ).all(...p) as any[];

    let income=0, expenses=0, asset_purchases=0, asset_sales=0;
    let cash_income=0, cash_expenses=0, noncash_income=0, noncash_expenses=0;
    for (const tx of txs) {
      const amt=tx.total||0, cashAmt=tx.cash_total||0, noncashAmt=tx.noncash_total||0;
      if (tx.type==='доход') { income+=amt; cash_income+=cashAmt; noncash_income+=noncashAmt; }
      else if (tx.type==='расход') { expenses+=amt; cash_expenses+=cashAmt; noncash_expenses+=noncashAmt; }
      else if (tx.type==='покупка актива') { asset_purchases+=amt; cash_expenses+=cashAmt; noncash_expenses+=noncashAmt; }
      else if (tx.type==='продажа актива') { asset_sales+=amt; cash_income+=cashAmt; noncash_income+=noncashAmt; }
    }
    const property_assets = (db.prepare(`SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND status='активный' AND category NOT IN ('наличные','банковский счет')`).get(uid) as any)?.total||0;
    const money_assets = (db.prepare(`SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND category IN ('наличные','банковский счет')`).get(uid) as any)?.total||0;
    const cash_balance=cash_income-cash_expenses, noncash_balance=noncash_income-noncash_expenses;
    const label = month ? `${year}-${month.padStart(2,'0')}` : `${dateFrom}–${dateTo||''}`;
    return NextResponse.json([{ date: label, income, expenses, asset_purchases, asset_sales, cash_balance, noncash_balance, property_assets, money_assets, total_capital: property_assets+cash_balance+noncash_balance+money_assets, end_balance: income+asset_sales-expenses-asset_purchases }]);
  }

  // By year
  let txYears: number[];
  if (year) {
    txYears = [parseInt(year)];
  } else {
    const yrRows = db.prepare('SELECT DISTINCT year FROM transactions WHERE user_id=? ORDER BY year').all(uid) as any[];
    const asYrRows = db.prepare('SELECT DISTINCT declaration_year FROM assets WHERE user_id=? AND declaration_year IS NOT NULL ORDER BY declaration_year').all(uid) as any[];
    txYears = Array.from(new Set([...yrRows.map((r:any) => r.year), ...asYrRows.map((r:any) => r.declaration_year)])).sort() as number[];
  }

  const rows = txYears.map(y => {
    const txs = db.prepare(
      'SELECT type, payment_method, SUM(amount_kzt) as total, SUM(cash_amount) as cash_total, SUM(noncash_amount) as noncash_total FROM transactions WHERE user_id=? AND year=? GROUP BY type, payment_method'
    ).all(uid, y) as any[];
    let income=0, expenses=0, asset_purchases=0, asset_sales=0;
    let cash_income=0, cash_expenses=0, noncash_income=0, noncash_expenses=0;
    for (const tx of txs) {
      const amt=tx.total||0, cashAmt=tx.cash_total||0, noncashAmt=tx.noncash_total||0;
      if (tx.type==='доход') { income+=amt; cash_income+=cashAmt; noncash_income+=noncashAmt; }
      else if (tx.type==='расход') { expenses+=amt; cash_expenses+=cashAmt; noncash_expenses+=noncashAmt; }
      else if (tx.type==='покупка актива') { asset_purchases+=amt; cash_expenses+=cashAmt; noncash_expenses+=noncashAmt; }
      else if (tx.type==='продажа актива') { asset_sales+=amt; cash_income+=cashAmt; noncash_income+=noncashAmt; }
    }
    const property_assets = (db.prepare(`SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND declaration_year=? AND status='активный' AND category NOT IN ('наличные','банковский счет')`).get(uid,y) as any)?.total||0;
    const money_assets = (db.prepare(`SELECT COALESCE(SUM(amount_kzt),0) as total FROM assets WHERE user_id=? AND declaration_year=? AND category IN ('наличные','банковский счет')`).get(uid,y) as any)?.total||0;
    const cash_balance=cash_income-cash_expenses, noncash_balance=noncash_income-noncash_expenses;
    return { year:y, income, expenses, asset_purchases, asset_sales, cash_income, noncash_income, cash_expenses, noncash_expenses, cash_balance, noncash_balance, property_assets, money_assets, total_capital: property_assets+cash_balance+noncash_balance+money_assets, end_balance: income+asset_sales-expenses-asset_purchases };
  });

  return NextResponse.json(rows);
}
