'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';
import { formatKZT, CATEGORY_EMOJI } from '@/lib/format';
import NumInput from '@/components/NumInput';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const CATEGORIES = ['недвижимость','автомобиль','доля в бизнесе','банковский счет','ценные бумаги','криптовалюта','наличные','другое'];
const SOURCE_TYPES = ['наличные','безналичные','смешанный'];

const EMPTY: any = {
  name:'', category:'недвижимость', country:'Казахстан', city:'',
  amount_kzt:'', cash_amount:'', noncash_amount:'',
  purchase_date:'', declaration_year:'', source_type:'безналичные',
  is_foreign:false, needs_declaration:false, is_declared:false,
  comment:'', status:'активный', extra_data:{},
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [modal, setModal] = useState<'form'|'view'|'sell'|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [sellForm, setSellForm] = useState({ sold_date: new Date().toISOString().slice(0,10), sold_amount:'' });
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('активный');
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewAsset, setViewAsset] = useState<any>(null);
  const [mixedError, setMixedError] = useState('');
  const [taxForAsset, setTaxForAsset] = useState<any>(null);

  async function load() {
    const params = buildParams(dateFilter);
    if (search) params.set('search', search);
    if (catFilter) params.set('category', catFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await apiFetch(`/api/assets?${params}`).then(r => r.json());
    setAssets(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [search, dateFilter, catFilter, statusFilter]);

  async function reloadFiles(id: number) {
    const data = await apiFetch(`/api/files?related_type=asset&related_id=${id}`).then(r => r.json());
    setFiles(Array.isArray(data) ? data : []);
  }

  async function loadTax(assetId: number) {
    const taxes = await apiFetch('/api/taxes').then(r => r.json());
    const t = Array.isArray(taxes) ? taxes.find((x: any) => x.asset_id == assetId) : null;
    setTaxForAsset(t || null);
  }

  function validateMixed() {
    if (form.source_type !== 'смешанный') { setMixedError(''); return true; }
    const total = parseFloat(form.amount_kzt) || 0;
    const cash = parseFloat(form.cash_amount) || 0;
    const nc = parseFloat(form.noncash_amount) || 0;
    if (Math.abs(cash + nc - total) > 1) {
      setMixedError(`${(cash + nc).toLocaleString('ru')} ₸ ≠ ${total.toLocaleString('ru')} ₸`);
      return false;
    }
    setMixedError(''); return true;
  }

  async function save() {
    if (!validateMixed()) return;
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/assets/${form.id}` : '/api/assets';
    await apiFetch(url, { method, body: JSON.stringify({
      ...form,
      amount_kzt: parseFloat(form.amount_kzt) || 0,
      cash_amount: parseFloat(form.cash_amount) || 0,
      noncash_amount: parseFloat(form.noncash_amount) || 0,
      is_foreign: !!form.is_foreign,
      needs_declaration: !!form.needs_declaration,
      is_declared: !!form.is_declared,
    })});
    setModal(null); load();
  }

  async function doSell() {
    if (!viewAsset) return;
    const sold = parseFloat(sellForm.sold_amount) || 0;
    const profit = sold - (viewAsset.amount_kzt || 0);
    await apiFetch(`/api/assets/${viewAsset.id}`, { method:'PUT', body: JSON.stringify({
      ...viewAsset,
      amount_kzt: viewAsset.amount_kzt,
      cash_amount: viewAsset.cash_amount || 0,
      noncash_amount: viewAsset.noncash_amount || 0,
      is_foreign: !!viewAsset.is_foreign,
      needs_declaration: !!viewAsset.needs_declaration,
      is_declared: !!viewAsset.is_declared,
      extra_data: safeExtra(viewAsset),
      status:'продан', sold_date: sellForm.sold_date,
      sold_amount: sold, profit_loss: profit,
    })});
    setModal(null); load();
  }

  function safeExtra(a: any) {
    try { return typeof a.extra_data === 'string' ? JSON.parse(a.extra_data) : (a.extra_data || {}); }
    catch { return {}; }
  }

  async function del(id: number) {
    if (!confirm('Удалить актив?')) return;
    await apiFetch(`/api/assets/${id}`, { method:'DELETE' });
    load();
  }

  async function uploadFile(assetId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file); fd.append('related_type','asset'); fd.append('related_id', String(assetId));
    await fetch('/api/files', { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body: fd });
    await reloadFiles(assetId);
    setUploading(false); e.target.value = '';
  }

  function openEdit(a: any) {
    setForm({ ...a,
      amount_kzt: String(a.amount_kzt || ''),
      cash_amount: String(a.cash_amount || ''),
      noncash_amount: String(a.noncash_amount || ''),
      is_foreign: !!a.is_foreign, needs_declaration: !!a.needs_declaration, is_declared: !!a.is_declared,
      extra_data: safeExtra(a),
    });
    setMixedError(''); setModal('form');
  }

  function openView(a: any) {
    setViewAsset(a); reloadFiles(a.id); loadTax(a.id); setModal('view');
  }

  const setExtra = (k: string, v: any) => setForm((f: any) => ({ ...f, extra_data: { ...f.extra_data, [k]: v } }));
  const totalActive = assets.filter(a => a.status === 'активный').reduce((s, a) => s + (a.amount_kzt || 0), 0);
  const totalSold = assets.filter(a => a.status === 'продан').reduce((s, a) => s + (a.sold_amount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Активы</h1>
          <button onClick={() => { setForm(EMPTY); setMixedError(''); setModal('form'); }} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
        </div>

        {/* Search + Filters */}
        <input type="search" placeholder="🔍 Поиск..." className="input" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          <select className="input text-sm py-2 w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Все категории</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['активный','✅ Активные'],['продан','📦 Проданные'],['','📋 Все']].map(([s, label]) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {statusFilter === 'активный' && <div className="card bg-blue-50 border-blue-100 py-3"><p className="text-sm text-blue-700">Итого активных: <span className="font-bold text-lg">{formatKZT(totalActive)}</span></p></div>}
        {statusFilter === 'продан' && <div className="card bg-slate-50 border-slate-200 py-3"><p className="text-sm text-slate-700">Итого продано: <span className="font-bold text-lg">{formatKZT(totalSold)}</span></p></div>}

        {/* Asset list */}
        <div className="space-y-3">
          {assets.map((a: any) => {
            const isSold = a.status === 'продан';
            const profit = isSold ? (a.profit_loss || 0) : 0;
            const isForeignAlert = a.is_foreign && !a.is_declared && a.needs_declaration && !isSold;
            return (
              <div key={a.id} className={`card ${isForeignAlert ? 'border-red-200 bg-red-50' : isSold ? 'bg-slate-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-3xl mt-0.5 flex-shrink-0">{CATEGORY_EMOJI[a.category] || '📦'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate">{a.category} · {a.country}{a.city ? ` · ${a.city}` : ''}</p>

                      {/* Sold: show sale price as main figure */}
                      {isSold ? (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-base font-bold text-slate-800">Продано: {formatKZT(a.sold_amount)}</p>
                          <p className="text-xs text-slate-500">Покупка: {formatKZT(a.amount_kzt)}</p>
                          <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {profit >= 0 ? `▲ +${formatKZT(profit)}` : `▼ ${formatKZT(profit)}`}
                          </p>
                          {profit > 0 && <p className="text-xs text-orange-600">🧾 Налог: ~{formatKZT(profit * 0.1)}</p>}
                          {a.sold_date && <p className="text-xs text-slate-400">Дата продажи: {a.sold_date}</p>}
                        </div>
                      ) : (
                        <p className="text-base font-bold text-blue-700 mt-1">{formatKZT(a.amount_kzt)}</p>
                      )}

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {isSold ? <span className="badge-gray">Продан</span> : <span className="badge-green">Активный</span>}
                        {a.is_foreign && <span className="badge-yellow">🌍 Зарубежный</span>}
                        {a.declaration_year && <span className="badge-gray">{a.declaration_year} г.</span>}
                        {isForeignAlert && <span className="badge-red">⚠️ Не задекларирован</span>}
                        {a.is_declared && <span className="badge-green">✓ Задекларирован</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => openView(a)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">📎</button>
                    <button onClick={() => openEdit(a)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">✏️</button>
                    {!isSold && <button onClick={() => { setViewAsset(a); setSellForm({ sold_date: new Date().toISOString().slice(0,10), sold_amount:'' }); setModal('sell'); }} className="p-2 rounded-xl hover:bg-amber-100 text-amber-500 text-sm font-bold">💰</button>}
                    <button onClick={() => del(a.id)} className="p-2 rounded-xl hover:bg-red-100 text-red-400">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
          {assets.length === 0 && <p className="text-center text-slate-400 py-10">Нет активов</p>}
        </div>
      </div>

      {/* ===== FORM MODAL ===== */}
      {modal === 'form' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{form.id ? 'Редактировать' : 'Новый актив'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 text-2xl rounded-full hover:bg-slate-100">✕</button>
            </div>
            <div className="p-4 space-y-4 pb-6">
              <div>
                <label className="label">Название *</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Квартира, Lexus RX..." />
              </div>
              <div>
                <label className="label">Категория</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setForm({...form, category: c, extra_data:{}})}
                      className={`flex flex-col items-center p-2 rounded-xl border text-xs text-center leading-tight ${form.category===c ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                      <span className="text-xl mb-0.5">{CATEGORY_EMOJI[c]||'📦'}</span>{c}
                    </button>
                  ))}
                </div>
              </div>

              {form.category === 'ценные бумаги' && (
                <div className="bg-blue-50 rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">📈 Данные для декларации</p>
                  {[['company','Компания'],['ticker','Тикер'],['isin','ISIN'],['quantity','Кол-во акций'],['price_per_share','Цена за 1 акцию'],['broker','Брокер'],['broker_country','Страна брокера'],['account_number','Номер счёта'],['currency','Валюта']].map(([k,label]) => (
                    <div key={k}><label className="label text-blue-600">{label}</label><input className="input text-sm" value={form.extra_data[k]||''} onChange={e => setExtra(k, e.target.value)} /></div>
                  ))}
                </div>
              )}
              {form.category === 'криптовалюта' && (
                <div className="bg-yellow-50 rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-yellow-700">🪙 Данные криптовалюты</p>
                  {[['coin_name','Монета'],['coin_ticker','Тикер'],['quantity','Количество'],['price','Цена покупки'],['exchange','Биржа / Кошелёк'],['wallet_address','Адрес кошелька'],['exchange_country','Страна биржи']].map(([k,label]) => (
                    <div key={k}><label className="label text-yellow-700">{label}</label><input className="input text-sm" value={form.extra_data[k]||''} onChange={e => setExtra(k, e.target.value)} /></div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Страна</label><input className="input" value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></div>
                <div><label className="label">Город</label><input className="input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              </div>
              <div><label className="label">Стоимость (₸) *</label><NumInput value={form.amount_kzt} onChange={v => setForm({...form, amount_kzt: v})} placeholder="50 000 000" /></div>

              <div>
                <label className="label">Источник оплаты</label>
                <div className="flex gap-2">
                  {SOURCE_TYPES.map(s => (
                    <button key={s} onClick={() => { setForm({...form, source_type: s, cash_amount:'', noncash_amount:''}); setMixedError(''); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border ${form.source_type===s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                      {s==='наличные'?'💵 Нал':s==='безналичные'?'🏦 Безнал':'🔀 Смешанный'}
                    </button>
                  ))}
                </div>
              </div>
              {form.source_type === 'смешанный' && (
                <div className="bg-slate-50 rounded-2xl p-3 space-y-3">
                  <div><label className="label">💵 Наличными (₸)</label><NumInput value={form.cash_amount} onChange={v => { setForm({...form, cash_amount:v}); setMixedError(''); }} /></div>
                  <div><label className="label">🏦 Безналично (₸)</label><NumInput value={form.noncash_amount} onChange={v => { setForm({...form, noncash_amount:v}); setMixedError(''); }} /></div>
                  {mixedError && <p className="text-red-600 text-xs bg-red-50 rounded-xl p-2">⚠️ {mixedError}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Дата покупки</label><input className="input" type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} /></div>
                <div><label className="label">Год декларации</label><input className="input" type="number" value={form.declaration_year} onChange={e => setForm({...form, declaration_year: e.target.value})} placeholder="2024" /></div>
              </div>

              <div className="space-y-3">
                {[['is_foreign','🌍 Зарубежный актив'],['needs_declaration','📋 Нужно задекларировать'],['is_declared','✅ Уже задекларирован']].map(([key, lbl]) => (
                  <label key={key} className="flex items-center gap-3">
                    <div className={`w-12 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${form[key]?'bg-blue-600':'bg-slate-200'}`} onClick={() => setForm({...form,[key]:!form[key]})}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key]?'translate-x-6':''}`}/>
                    </div>
                    <span className="text-sm text-slate-700">{lbl}</span>
                  </label>
                ))}
              </div>
              <div><label className="label">Комментарий</label><textarea className="input" rows={2} value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} /></div>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={save} className="btn-primary flex-1" disabled={!form.name}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SELL MODAL ===== */}
      {modal === 'sell' && viewAsset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold">💰 Продажа актива</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 text-sm">
                <p className="font-semibold">{viewAsset.name}</p>
                <p className="text-slate-500">Покупка: {formatKZT(viewAsset.amount_kzt)}</p>
              </div>
              <div><label className="label">Дата продажи</label><input className="input" type="date" value={sellForm.sold_date} onChange={e => setSellForm({...sellForm, sold_date: e.target.value})} /></div>
              <div><label className="label">Сумма продажи (₸)</label><NumInput value={sellForm.sold_amount} onChange={v => setSellForm({...sellForm, sold_amount: v})} placeholder="0" /></div>
              {sellForm.sold_amount && (() => {
                const sold = parseFloat(sellForm.sold_amount)||0;
                const profit = sold - viewAsset.amount_kzt;
                return (
                  <div className={`rounded-xl p-3 text-sm space-y-1 ${profit>0?'bg-green-50':'bg-red-50'}`}>
                    <p className={profit>=0?'text-green-700':'text-red-700'}>
                      {profit>=0 ? `✅ Прибыль: +${formatKZT(profit)}` : `📉 Убыток: ${formatKZT(profit)}`}
                    </p>
                    {profit>0 && <p className="text-orange-600 text-xs">🧾 Налог ~{formatKZT(profit*0.1)} (10%)</p>}
                    {viewAsset.is_foreign && <p className="text-blue-600 text-xs">📋 Попадёт в декларации (зарубежный)</p>}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={doSell} className="btn-primary flex-1" disabled={!sellForm.sold_amount}>Продать</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW MODAL ===== */}
      {modal === 'view' && viewAsset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold truncate">{CATEGORY_EMOJI[viewAsset.category]||'📦'} {viewAsset.name}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 text-2xl flex-shrink-0">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Sold info */}
              {viewAsset.status === 'продан' ? (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Куплен за:</span>
                    <span className="font-medium">{formatKZT(viewAsset.amount_kzt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Продан за:</span>
                    <span className="font-bold text-lg">{formatKZT(viewAsset.sold_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-slate-500">Разница:</span>
                    <span className={`font-bold ${(viewAsset.profit_loss||0)>=0?'text-green-700':'text-red-700'}`}>
                      {(viewAsset.profit_loss||0)>=0?'+':''}{formatKZT(viewAsset.profit_loss||0)}
                    </span>
                  </div>
                  {(viewAsset.profit_loss||0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Налог (10%):</span>
                      <span className="font-bold text-orange-700">{formatKZT((viewAsset.profit_loss||0)*0.1)}</span>
                    </div>
                  )}
                  {taxForAsset && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Статус налога:</span>
                      <span className={taxForAsset.status==='оплачено'?'text-green-700 font-medium':'text-red-700 font-medium'}>{taxForAsset.status}</span>
                    </div>
                  )}
                  {viewAsset.sold_date && <div className="flex justify-between text-sm"><span className="text-slate-500">Дата продажи:</span><span>{viewAsset.sold_date}</span></div>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Стоимость:</span><br/><span className="font-bold text-blue-700 text-base">{formatKZT(viewAsset.amount_kzt)}</span></div>
                  <div><span className="text-slate-500">Категория:</span><br/><span>{viewAsset.category}</span></div>
                  <div><span className="text-slate-500">Страна:</span><br/><span>{viewAsset.country}</span></div>
                  <div><span className="text-slate-500">Год декл.:</span><br/><span>{viewAsset.declaration_year||'—'}</span></div>
                  {viewAsset.source_type === 'смешанный' && (<>
                    <div><span className="text-slate-500">Наличными:</span><br/><span className="text-green-700 font-medium">{formatKZT(viewAsset.cash_amount)}</span></div>
                    <div><span className="text-slate-500">Безналично:</span><br/><span className="text-blue-700 font-medium">{formatKZT(viewAsset.noncash_amount)}</span></div>
                  </>)}
                </div>
              )}

              {/* Extra data */}
              {(() => {
                const extra = safeExtra(viewAsset);
                const keys = Object.keys(extra).filter(k => extra[k]);
                if (!keys.length) return null;
                const labels: Record<string,string> = { company:'Компания', ticker:'Тикер', isin:'ISIN', quantity:'Кол-во', price_per_share:'Цена за акцию', broker:'Брокер', broker_country:'Страна брокера', account_number:'Счёт', currency:'Валюта', coin_name:'Монета', coin_ticker:'Тикер', price:'Цена', exchange:'Биржа', wallet_address:'Кошелёк', exchange_country:'Страна биржи' };
                return (
                  <div className="bg-slate-50 rounded-2xl p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Дополнительные данные</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {keys.map(k => <div key={k}><span className="text-slate-400">{labels[k]||k}:</span><br/><span className="font-medium">{extra[k]}</span></div>)}
                    </div>
                  </div>
                );
              })()}

              {viewAsset.comment && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{viewAsset.comment}</p>}

              {/* Files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700">Документы ({files.length})</h3>
                  <label className="btn-primary text-sm py-1.5 px-3 cursor-pointer">{uploading?'...':'+ Загрузить'}<input type="file" className="hidden" onChange={e => uploadFile(viewAsset.id, e)} /></label>
                </div>
                {files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0"><span>📄</span><span className="text-sm truncate">{f.file_name}</span></div>
                    <div className="flex gap-1 flex-shrink-0">
                      <a href={`/api/files/${f.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600" download>⬇️</a>
                      <button onClick={async () => { await apiFetch(`/api/files/${f.id}`,{method:'DELETE'}); reloadFiles(viewAsset.id); }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400">🗑️</button>
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
