import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const uid = user.userId;
  const warnings: { type: string; message: string; severity: 'red' | 'yellow' }[] = [];

  // Foreign undeclared active assets
  const foreignUndeclared = db.prepare(
    `SELECT name FROM assets WHERE user_id=? AND is_foreign=1 AND needs_declaration=1 AND is_declared=0 AND status='активный'`
  ).all(uid) as any[];
  for (const a of foreignUndeclared) {
    warnings.push({ type: 'declaration', message: `Зарубежный актив не задекларирован: ${a.name}`, severity: 'red' });
  }

  // Assets without files
  const assetsNoFiles = db.prepare(`
    SELECT a.name FROM assets a
    WHERE a.user_id=? AND a.status='активный'
    AND NOT EXISTS (SELECT 1 FROM files f WHERE f.related_type='asset' AND f.related_id=a.id)
  `).all(uid) as any[];
  for (const a of assetsNoFiles) {
    warnings.push({ type: 'no_docs', message: `Нет документов у актива: ${a.name}`, severity: 'yellow' });
  }

  // Taxes to pay
  const taxesToPay = db.prepare(
    `SELECT description, tax_amount FROM taxes WHERE user_id=? AND status='нужно оплатить'`
  ).all(uid) as any[];
  for (const t of taxesToPay) {
    const fmt = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(t.tax_amount);
    warnings.push({ type: 'tax', message: `Налог к оплате: ${t.description} — ${fmt} ₸`, severity: 'red' });
  }

  // Missing declarations for years with foreign assets
  const foreignYears = db.prepare(
    `SELECT DISTINCT declaration_year FROM assets WHERE user_id=? AND is_foreign=1 AND declaration_year IS NOT NULL`
  ).all(uid) as any[];
  for (const { declaration_year } of foreignYears) {
    const decl = db.prepare('SELECT id FROM declarations WHERE user_id=? AND year=?').get(uid, declaration_year);
    if (!decl) {
      warnings.push({ type: 'missing_decl', message: `Декларация за ${declaration_year} год не загружена (есть зарубежные активы)`, severity: 'red' });
    }
  }

  // Negative balance years
  const txYears = db.prepare('SELECT DISTINCT year FROM transactions WHERE user_id=? ORDER BY year').all(uid) as any[];
  for (const { year } of txYears) {
    const txs = db.prepare(
      'SELECT type, SUM(amount_kzt) as total FROM transactions WHERE user_id=? AND year=? GROUP BY type'
    ).all(uid, year) as any[];
    let net = 0;
    for (const tx of txs) {
      if (tx.type === 'доход' || tx.type === 'продажа актива') net += tx.total;
      else if (tx.type === 'расход' || tx.type === 'покупка актива') net -= tx.total;
    }
    if (net < 0) {
      const fmt = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(Math.abs(Math.round(net)));
      warnings.push({ type: 'negative_balance', message: `Отрицательный баланс в ${year} году: −${fmt} ₸`, severity: 'red' });
    }
  }

  return NextResponse.json(warnings);
}
