'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';
import { formatKZT, CATEGORY_EMOJI, CURRENCIES, CURRENCY_SYMBOL } from '@/lib/format';
import NumInput from '@/components/NumInput';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const TYPES = ['доход','расход','покупка актива','продажа актива','займ выдача','займ возврат','дивиденды'];
const METHODS = ['наличные','безналичные','смешанный'];
const CATEGORIES = ['недвижимость','автомобиль','доля в бизнесе','банковский счет','ценные бумаги','криптовалюта','наличные','дивиденды','займ выданный','другое'];

const EMPTY: any = {
  date: new Date().toISOString().slice(0,10), type:'доход',
  amount_kzt:'', payment_method:'безналичные', cash_amount:'', noncash_amount:'',
  description:'', asset_id:'', comment:'',
  new_asset_name:'', new_asset_category:'недвижимость',
  new_asset_country:'Казахстан', new_asset_city:'',
  new_asset_is_foreign:false, new_asset_needs_declaration:false,
  currency:'KZT', original_amount:'', exchange_rate:1,
};

const TYPE_ICON: Record<string,string> = {
  'доход':'↑', 'расход':'↓', 'покупка актива':'🛒',
  'продажа актива':'💰', 'займ выдача':'🤝', 'займ возврат':'↩️', 'дивиденды':'💰',
};

const TYPE_IS_OUT: Record<string,boolean> = {
  'расход':true, 'покупка актива':true, 'займ выдача':true,
  'доход':false, 'продажа актива':false, 'займ возврат':false, 'дивиденды':false,
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);
  const [typeFilter, setTypeFilter] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rates, setRates] = useState<Record<string,number>>({ KZT:1, USD:450, EUR:490, AED:122, TRY:13 });

  async function load() {
    const params = buildParams(dateFilter);
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    const [txRes, aRes] = await Promise.all([
      apiFetch(`/api/transactions?${params}`).then(r => r.json()),
      apiFetch('/api/assets').then(r => r.json()),
    ]);
    setTxs(Array.isArray(txRes) ? txRes : []);
    setAssets(Array.isArray(aRes) ? aRes : []);
  }

  async function loadRates() {
    try { const r = await apiFetch('/api/exchange-rate').then(x => x.json()); setRates(r); } catch {}
  }

  async function loadFiles(txId: number) {
    const data = await apiFetch(`/api/files?entity_type=transaction&entity_id=${txId}`).then(r => r.json());
    setFiles(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [search, dateFilter, typeFilter]);

  function handleCurrencyChange(currency: string) {
    const origAmt = parseFloat(form.original_amount) || 0;
    const rate = rates[currency] || 1;
    const kzt = currency === 'KZT' ? origAmt : Math.round(origAmt * rate);
    setForm((f: any) => ({ ...f, currency, exchange_rate: rate, amount_kzt: kzt ? String(kzt) : '' }));
  }

  function handleOrigAmountChange(v: string) {
    const origAmt = parseFloat(v) || 0;
    const rate = rates[form.currency] || 1;
    const kzt = form.currency === 'KZT' ? origAmt : Math.round(origAmt * rate);
    setForm((f: any) => ({ ...f, original_amount: v, amount_kzt: kzt ? String(kzt) : '' }));
  }

  async function openAdd() {
    await loadRates();
    setForm(EMPTY); setModal(true);
  }

  async function save() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/transactions/${form.id}` : '/api/transactions';
    const total = parseFloat(form.amount_kzt)||0;
    let cash = parseFloat(form.cash_amount)||0;
    let noncash = parseFloat(form.noncash_amount)||0;
    if (form.payment_method === 'наличные') { cash=total; noncash=0; }
    if (form.payment_method === 'безналичные') { noncash=total; cash=0; }
    await apiFetch(url, { method, body: JSON.stringify({
      ...form, amount_kzt:total, cash_amount:cash, noncash_amount:noncash,
      original_amount: parseFloat(form.original_amount)||total,
      asset_id: form.asset_id||null, year: new Date(form.date).getFullYear(),
    })});
    setModal(false); load();
  }

  async function del(id: number) {
    if (!confirm('Удалить?')) return;
    await apiFetch(`/api/transactions/${id}`, {method:'DELETE'}); load();
  }

  async function openView(tx: any) {
    setViewModal(tx);
    await loadFiles(tx.id);
  }

  async function uploadFile(txId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file); fd.append('entity_type','transaction'); fd.append('entity_id', String(txId));
    await fetch('/api/files', { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body: fd });
    await loadFiles(txId);
    setUploading(false); e.target.value = '';
  }

  const isBuying = form.type === 'покупка актива';
  const isSelling = form.type === 'продажа актива';
  const isLoanOut = form.type === 'займ выдача';
  const isDividend = form.type === 'дивиденды';

  const incomeTotal = txs.filter(t => !TYPE_IS_OUT[t.type]).reduce((s,t) => s+t.amount_kzt, 0);
  const expenseTotal = txs.filter(t => TYPE_IS_OUT[t.type]).reduce((s,t) => s+t.amount_kzt, 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Транзакции</h1>
          <button onClick={openAdd} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
        </div>

        <input type="search" placeholder="🔍 Поиск..." className="input" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <select className="input text-sm py-2 w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Все типы</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="card bg-green-50 border-green-100 py-3">
            <p className="text-xs text-green-600">↑ Поступления</p>
            <p className="text-base font-bold text-green-700">{formatKZT(incomeTotal)}</p>
          </div>
          <div className="card bg-red-50 border-red-100 py-3">
            <p className="text-xs text-red-600">↓ Расходы</p>
            <p className="text-base font-bold text-red-700">{formatKZT(expenseTotal)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {txs.map((t: any) => {
            const isOut = TYPE_IS_OUT[t.type] ?? false;
            return (
              <div key={t.id} className="card py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${isOut?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>
                      {TYPE_ICON[t.type]||'•'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.description||t.type}</p>
                      <p className="text-xs text-slate-400">{t.date} · {t.payment_method}</p>
                      {t.asset_name && <p className="text-xs text-blue-600 truncate">🔗 {t.asset_name}</p>}
                      {t.currency && t.currency !== 'KZT' && t.original_amount > 0 && (
                        <p className="text-xs text-slate-400">{CURRENCY_SYMBOL[t.currency]}{t.original_amount?.toLocaleString('ru')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 flex-shrink-0">
                    <span className={`font-bold text-sm ${isOut?'text-red-600':'text-green-600'}`}>{isOut?'−':'+'}{formatKZT(t.amount_kzt)}</span>
                    <button onClick={() => openView(t)} className="text-slate-300 hover:text-slate-600">📎</button>
                    <button onClick={() => { setForm({...t, amount_kzt:String(t.amount_kzt), cash_amount:String(t.cash_amount||''), noncash_amount:String(t.noncash_amount||''), original_amount:String(t.original_amount||t.amount_kzt||''), currency:t.currency||'KZT', asset_id:t.asset_id||''}); setModal(true); }} className="text-slate-300 hover:text-slate-600">✏️</button>
                    <button onClick={() => del(t.id)} className="text-slate-200 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
          {txs.length===0 && <p className="text-center text-slate-400 py-10">Нет транзакций</p>}
        </div>
      </div>

      {/* ===== ADD/EDIT MODAL ===== */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-bold">{form.id?'Редактировать':'Новая транзакция'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-4 pb-6">
              <div>
                <label className="label">Тип</label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(tp => (
                    <button key={tp} onClick={() => setForm({...form, type:tp, new_asset_name:'', asset_id:''})}
                      className={`py-2 rounded-xl text-xs font-medium border ${form.type===tp?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-600'}`}>
                      {TYPE_ICON[tp]} {tp}
                    </button>
                  ))}
                </div>
              </div>

              {(form.type === 'займ выдача' || form.type === 'займ возврат') && (
                <div className={`rounded-xl p-3 text-xs ${form.type==='займ выдача'?'bg-orange-50 text-orange-700':'bg-green-50 text-green-700'}`}>
                  {form.type==='займ выдача' ? '🤝 Деньги уйдут из вашего баланса (расход)' : '↩️ Деньги вернутся в ваш баланс (доход)'}
                </div>
              )}

              <div><label className="label">Дата</label><input className="input" type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} /></div>

              <div>
                <label className="label">Сумма *</label>
                <div className="flex gap-2">
                  <select className="input w-28 flex-shrink-0" value={form.currency} onChange={e => handleCurrencyChange(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_SYMBOL[c]} {c}</option>)}
                  </select>
                  <NumInput value={form.original_amount || form.amount_kzt} onChange={handleOrigAmountChange} placeholder="0" />
                </div>
                {form.currency !== 'KZT' && form.amount_kzt && (
                  <p className="text-xs text-slate-400 mt-1">≈ {formatKZT(parseFloat(form.amount_kzt))} · 1 {form.currency} = {rates[form.currency]} ₸</p>
                )}
              </div>

              <div>
                <label className="label">Способ</label>
                <div className="flex gap-2">
                  {METHODS.map(m => (
                    <button key={m} onClick={() => setForm({...form, payment_method:m})}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border ${form.payment_method===m?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-600'}`}>
                      {m==='наличные'?'💵':m==='безналичные'?'🏦':'🔀'} {m}
                    </button>
                  ))}
                </div>
              </div>
              {form.payment_method==='смешанный' && (
                <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-2 gap-3">
                  <div><label className="label">💵 Наличными (₸)</label><NumInput value={form.cash_amount} onChange={v => setForm({...form, cash_amount:v})} /></div>
                  <div><label className="label">🏦 Безналично (₸)</label><NumInput value={form.noncash_amount} onChange={v => setForm({...form, noncash_amount:v})} /></div>
                </div>
              )}
              <div><label className="label">Описание</label><input className="input" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Зарплата, продажа квартиры..." /></div>

              {isBuying && !form.id && (
                <div className="bg-blue-50 rounded-2xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-blue-700">🏠 Данные нового актива (создастся автоматически)</p>
                  <div><label className="label">Название *</label><input className="input" value={form.new_asset_name} onChange={e => setForm({...form, new_asset_name:e.target.value})} placeholder="Квартира, Lexus..." /></div>
                  <div><label className="label">Категория</label><select className="input" value={form.new_asset_category} onChange={e => setForm({...form, new_asset_category:e.target.value})}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="label">Страна</label><input className="input text-sm" value={form.new_asset_country} onChange={e => setForm({...form, new_asset_country:e.target.value})} /></div>
                    <div><label className="label">Город</label><input className="input text-sm" value={form.new_asset_city} onChange={e => setForm({...form, new_asset_city:e.target.value})} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.new_asset_is_foreign} onChange={e => setForm({...form, new_asset_is_foreign:e.target.checked})} />Зарубежный</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.new_asset_needs_declaration} onChange={e => setForm({...form, new_asset_needs_declaration:e.target.checked})} />Нужно задекларировать</label>
                </div>
              )}

              {isSelling && (
                <div>
                  <label className="label">Какой актив продаёте? *</label>
                  <select className="input" value={form.asset_id} onChange={e => setForm({...form, asset_id:e.target.value})}>
                    <option value="">Выберите актив...</option>
                    {assets.filter(a => a.status==='активный').map((a: any) => (
                      <option key={a.id} value={a.id}>{CATEGORY_EMOJI[a.category]||'📦'} {a.name} — {formatKZT(a.amount_kzt)}</option>
                    ))}
                  </select>
                  {form.asset_id && (() => {
                    const asset = assets.find(a => a.id==form.asset_id);
                    const sell = parseFloat(form.amount_kzt)||0;
                    if (!asset||!sell) return null;
                    const profit = sell - asset.amount_kzt;
                    const held1y = asset.purchase_date && form.date
                      ? (new Date(form.date).getTime() - new Date(asset.purchase_date).getTime()) >= 365*24*60*60*1000
                      : false;
                    return (
                      <div className={`mt-2 rounded-xl p-2 text-xs ${profit>0?'bg-green-50 text-green-700':'bg-slate-50 text-slate-600'}`}>
                        {profit>0 ? `✅ Прибыль: +${formatKZT(profit)}` : profit<0 ? `📉 Убыток: ${formatKZT(Math.abs(profit))}` : 'Нет прибыли'}
                        {profit>0 && held1y && <span className="ml-2 text-green-600 font-medium">✅ Владели 1+ год — налог 0</span>}
                        {profit>0 && !held1y && <span className="ml-2 text-orange-600">→ налог ~{formatKZT(profit*0.1)}</span>}
                        {asset.is_foreign && <span className="ml-2 text-blue-600">📋 Декларация</span>}
                      </div>
                    );
                  })()}
                </div>
              )}

              {isLoanOut && (
                <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
                  🤝 Можно привязать к активу "Займ выданный" для отслеживания
                </div>
              )}

              {isDividend && (
                <div className="bg-green-50 rounded-2xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-green-700">💰 Дивиденды — считаются как доход</p>
                  <div>
                    <label className="label">Компания / Эмитент *</label>
                    <input className="input" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Apple, Halyk Bank, КазМунайГаз..." />
                  </div>
                </div>
              )}

              {!isBuying && !isSelling && !isDividend && (
                <div>
                  <label className="label">Связанный актив (необязательно)</label>
                  <select className="input" value={form.asset_id} onChange={e => setForm({...form, asset_id:e.target.value})}>
                    <option value="">Не выбран</option>
                    {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              <div><label className="label">Комментарий</label><textarea className="input" rows={2} value={form.comment} onChange={e => setForm({...form, comment:e.target.value})} /></div>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={save} className="btn-primary flex-1">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW / FILES MODAL ===== */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold truncate">{viewModal.description || viewModal.type}</h2>
              <button onClick={() => setViewModal(null)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Дата:</span><br/><span className="font-medium">{viewModal.date}</span></div>
                <div><span className="text-slate-400">Сумма:</span><br/><span className="font-bold">{formatKZT(viewModal.amount_kzt)}</span></div>
                <div><span className="text-slate-400">Тип:</span><br/><span>{viewModal.type}</span></div>
                <div><span className="text-slate-400">Способ:</span><br/><span>{viewModal.payment_method}</span></div>
                {viewModal.currency && viewModal.currency !== 'KZT' && (
                  <div><span className="text-slate-400">Валюта:</span><br/><span>{CURRENCY_SYMBOL[viewModal.currency]}{viewModal.original_amount?.toLocaleString('ru')} {viewModal.currency}</span></div>
                )}
              </div>
              {viewModal.comment && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{viewModal.comment}</p>}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700">Документы ({files.length})</h3>
                  <label className="btn-primary text-sm py-1.5 px-3 cursor-pointer">{uploading?'...':'+ Загрузить'}<input type="file" className="hidden" onChange={e => uploadFile(viewModal.id, e)} /></label>
                </div>
                {files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0"><span>📄</span><span className="text-sm truncate">{f.original_name || f.file_name}</span></div>
                    <div className="flex gap-1 flex-shrink-0">
                      <a href={`/api/files/${f.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600" download>⬇️</a>
                      <button onClick={async () => { await apiFetch(`/api/files/${f.id}`,{method:'DELETE'}); loadFiles(viewModal.id); }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400">🗑️</button>
                    </div>
                  </div>
                ))}
                {files.length===0 && <p className="text-sm text-slate-400 py-2">Нет документов</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
