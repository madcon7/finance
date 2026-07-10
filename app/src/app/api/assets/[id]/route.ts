import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  const asset = db.prepare('SELECT * FROM assets WHERE id=? AND user_id=?').get(params.id, user.userId);
  if (!asset) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  try {
    const body = await req.json();
    const db = getDb();
    const extraData = JSON.stringify(body.extra_data || {});
    const total = parseFloat(body.amount_kzt) || 0;
    let cashAmt = parseFloat(body.cash_amount) || 0;
    let noncashAmt = parseFloat(body.noncash_amount) || 0;
    if (body.source_type === 'наличные') { cashAmt = total; noncashAmt = 0; }
    if (body.source_type === 'безналичные') { noncashAmt = total; cashAmt = 0; }

    const beingSold = body.status === 'продан';
    const soldAmt = parseFloat(body.sold_amount) || 0;
    const profit = beingSold ? soldAmt - total : (parseFloat(body.profit_loss) || 0);

    db.prepare(`
      UPDATE assets SET name=?, category=?, country=?, city=?, amount_kzt=?,
        cash_amount=?, noncash_amount=?, purchase_date=?, declaration_year=?,
        source_type=?, is_foreign=?, needs_declaration=?, is_declared=?,
        status=?, sold_date=?, sold_amount=?, profit_loss=?,
        comment=?, extra_data=?, updated_at=datetime('now')
      WHERE id=? AND user_id=?
    `).run(
      body.name, body.category, body.country || 'Казахстан', body.city || '',
      total, cashAmt, noncashAmt,
      body.purchase_date || null, body.declaration_year || null,
      body.source_type,
      body.is_foreign ? 1 : 0, body.needs_declaration ? 1 : 0, body.is_declared ? 1 : 0,
      body.status || 'активный',
      body.sold_date || null, soldAmt, profit,
      body.comment || '', extraData,
      params.id, user.userId
    );

    // 1-year exemption rule: no tax if held for 365+ days
    const heldOneYear = body.purchase_date && body.sold_date
      ? (new Date(body.sold_date).getTime() - new Date(body.purchase_date).getTime()) >= 365 * 24 * 60 * 60 * 1000
      : false;

    // Auto-create tax on sale with profit
    if (beingSold && profit > 0 && !heldOneYear) {
      const hasTax = db.prepare('SELECT id FROM taxes WHERE asset_id=? AND user_id=?').get(params.id, user.userId);
      if (!hasTax) {
        const sellYear = body.sold_date ? new Date(body.sold_date).getFullYear() : new Date().getFullYear();
        db.prepare(`INSERT INTO taxes (user_id, asset_id, year, description, buy_amount, sell_amount, profit, tax_amount, tax_rate, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, 'нужно оплатить')`
        ).run(user.userId, params.id, sellYear,
          `Продажа: ${body.name}`, total, soldAmt, profit, profit * 0.1);
      }
    }

    // Auto-create declaration for sold foreign asset
    if (beingSold && body.is_foreign) {
      const declYear = body.declaration_year || (body.sold_date ? new Date(body.sold_date).getFullYear() : new Date().getFullYear());
      let decl = db.prepare('SELECT * FROM declarations WHERE user_id=? AND year=?').get(user.userId, declYear) as any;
      if (!decl) {
        db.prepare(`INSERT INTO declarations (user_id, year, status, comment) VALUES (?, ?, 'нужно проверить', ?)`
        ).run(user.userId, declYear,
          `Продан зарубежный актив: ${body.name} (${body.category})\nДата покупки: ${body.purchase_date}\nСумма покупки: ${total} ₸\nДата продажи: ${body.sold_date}\nСумма продажи: ${soldAmt} ₸\nПрибыль/убыток: ${profit} ₸`);
      } else {
        const note = `\n\nПродан зарубежный актив: ${body.name}. Продажа: ${soldAmt} ₸, Прибыль: ${profit} ₸`;
        if (!(decl.comment || '').includes(body.name)) {
          db.prepare('UPDATE declarations SET status=?, comment=? WHERE id=?')
            .run('нужно проверить', (decl.comment || '') + note, decl.id);
        }
      }
    }

    return NextResponse.json(db.prepare('SELECT * FROM assets WHERE id=?').get(params.id));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const db = getDb();
  db.prepare('DELETE FROM assets WHERE id=? AND user_id=?').run(params.id, user.userId);
  return NextResponse.json({ ok: true });
}
