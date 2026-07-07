import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  let query = `SELECT t.*, a.name as asset_name, a.category as asset_category
    FROM transactions t LEFT JOIN assets a ON t.asset_id = a.id
    WHERE t.user_id = ?`;
  const params: any[] = [user.userId];

  if (year) { query += ' AND t.year = ?'; params.push(year); }
  if (month) { query += " AND strftime('%m', t.date) = ?"; params.push(month.padStart(2, '0')); }
  if (dateFrom) { query += ' AND t.date >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND t.date <= ?'; params.push(dateTo); }
  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (search) { query += ' AND (t.description LIKE ? OR a.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY t.date DESC, t.id DESC';
  return NextResponse.json(db.prepare(query).all(...params));
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDb();
    const year = body.year || new Date(body.date).getFullYear();

    let assetId: number | null = body.asset_id ? Number(body.asset_id) : null;

    // ── Auto-create asset on purchase ──
    if (body.type === 'покупка актива' && body.new_asset_name) {
      const extraData = JSON.stringify(body.extra_data || {});
      const total = parseFloat(body.amount_kzt) || 0;
      let cashAmt = parseFloat(body.cash_amount) || 0;
      let noncashAmt = parseFloat(body.noncash_amount) || 0;
      if (body.payment_method === 'наличные') { cashAmt = total; noncashAmt = 0; }
      if (body.payment_method === 'безналичные') { noncashAmt = total; cashAmt = 0; }

      const r = db.prepare(`
        INSERT INTO assets (user_id, name, category, country, city, amount_kzt,
          cash_amount, noncash_amount, purchase_date, declaration_year,
          source_type, is_foreign, needs_declaration, comment, extra_data, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'активный')
      `).run(
        user.userId, body.new_asset_name, body.new_asset_category || 'другое',
        body.new_asset_country || 'Казахстан', body.new_asset_city || '',
        total, cashAmt, noncashAmt,
        body.date, year, body.payment_method || 'безналичные',
        body.new_asset_is_foreign ? 1 : 0,
        body.new_asset_needs_declaration ? 1 : 0,
        body.description || '', extraData
      );
      assetId = r.lastInsertRowid as number;
    }

    // ── Handle asset sale ──
    if (body.type === 'продажа актива' && assetId) {
      const asset = db.prepare('SELECT * FROM assets WHERE id=? AND user_id=?').get(assetId, user.userId) as any;
      if (asset) {
        const sellAmt = parseFloat(body.amount_kzt) || 0;
        const profit = sellAmt - (asset.amount_kzt || 0);

        // Update asset status
        db.prepare(`UPDATE assets SET status='продан', sold_date=?, sold_amount=?, profit_loss=?, updated_at=datetime('now')
          WHERE id=? AND user_id=?`
        ).run(body.date, sellAmt, profit, assetId, user.userId);

        // Auto-create tax if profit > 0
        if (profit > 0) {
          const hasTax = db.prepare('SELECT id FROM taxes WHERE asset_id=? AND user_id=?').get(assetId, user.userId);
          if (!hasTax) {
            db.prepare(`INSERT INTO taxes (user_id, asset_id, year, description, buy_amount, sell_amount, profit, tax_amount, tax_rate, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, 'нужно оплатить')`
            ).run(user.userId, assetId, year,
              `Продажа: ${asset.name}`, asset.amount_kzt, sellAmt, profit, profit * 0.1);
          }
        }

        // Auto-create declaration entry for foreign assets
        if (asset.is_foreign) {
          const declYear = asset.declaration_year || year;
          let decl = db.prepare('SELECT * FROM declarations WHERE user_id=? AND year=?').get(user.userId, declYear) as any;
          if (!decl) {
            db.prepare(`INSERT INTO declarations (user_id, year, status, comment)
              VALUES (?, ?, 'нужно проверить', ?)`
            ).run(user.userId, declYear,
              `Продан зарубежный актив: ${asset.name}. Покупка: ${asset.amount_kzt} ₸, Продажа: ${sellAmt} ₸, Прибыль: ${profit} ₸`);
          } else if (decl.status === 'не сдана') {
            const note = `\nПродан зарубежный актив: ${asset.name}. Продажа: ${sellAmt} ₸`;
            db.prepare('UPDATE declarations SET status=?, comment=? WHERE id=?')
              .run('нужно проверить', (decl.comment || '') + note, decl.id);
          }
        }
      }
    }

    const total = parseFloat(body.amount_kzt) || 0;
    let cashAmt = parseFloat(body.cash_amount) || 0;
    let noncashAmt = parseFloat(body.noncash_amount) || 0;
    if (body.payment_method === 'наличные') { cashAmt = total; noncashAmt = 0; }
    if (body.payment_method === 'безналичные') { noncashAmt = total; cashAmt = 0; }

    const result = db.prepare(`
      INSERT INTO transactions (user_id, asset_id, date, year, type, amount_kzt,
        cash_amount, noncash_amount, payment_method, description, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.userId, assetId, body.date, year,
      body.type, total, cashAmt, noncashAmt,
      body.payment_method || 'безналичные',
      body.description || '', body.comment || '');

    return NextResponse.json({
      tx: db.prepare('SELECT * FROM transactions WHERE id=?').get(result.lastInsertRowid),
      created_asset_id: body.type === 'покупка актива' ? assetId : null,
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Ошибка сохранения' }, { status: 500 });
  }
}
