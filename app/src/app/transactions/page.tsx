'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';
import { formatKZT } from '@/lib/format';

const TYPES = ['доход', 'расход', 'покупка актива', 'продажа актива', 'перевод'];
const METHODS = ['наличные', 'безналичные'];

const EMPTY = {
  date: new Date().toISOString().slice(0, 10), year: new Date().getFullYear(),
  type: 'доход', amount_kzt: '', payment_method: 'безналичные',
  description: '', asset_id: '', comment: '',
};

export default function TransactionsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [balances, setBalances] = useState<any[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (yearFilter) params.set('year', yearFilter);
    if (typeFilter) params.set('type', typeFilter);
    const [txRes, aRes, bRes] = await Promise.all([
      apiFetch(`/api/transactions?${params}`).then(r => r.json()),
      apiFetch('/api/assets').then(r => r.json()),
      apiFetch('/api/balance').then(r => r.json()),
    ]);
    setTxs(Array.isArray(txRes) ? txRes : []);
    setAssets(Array.isArray(aRes) ? aRes : []);
    setBalances(Array.isArray(bRes) ? bRes : []);
  }

  useEffect(() => { load(); }, [search, yearFilter, typeFilter]);

  function getYearBalance(year: number) {
    const b = balances.find((b: any) => b.year === year);
    if (!b) return null;
    return b.end_balance;
  }

  async function save() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/transactions/${form.id}` : '/api/transactions';
    await apiFetch(url, { method, body: JSON.stringify({ ...form, amount_kzt: parseFloat(form.amount_kzt) || 0, asset_id: form.asset_id || null }) });
    setModal(false);
    load();
  }

  async function del(id: number) {
    if (!confirm('Удалить транзакцию?')) return;
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    load();
  }

  const years = Array.from(new Set(txs.map((t: any) => t.year))).sort();

  const total = txs.reduce((s, t) => {
    if (t.type === 'доход' || t.type === 'продажа актива') return s + t.amount_kzt;
    if (t.type === 'расход' || t.type === 'покупка актива') return s - t.amount_kzt;
    return s;
  }, 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Транзакции</h1>
          <button onClick={() => { setForm(EMPTY); setModal(true); }} className="btn-primary text-sm py-2 px-4">
            + Добавить
          </button>
        </div>

        <input type="search" placeholder="🔍 Поиск..." className="input" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select className="input text-sm py-2 min-w-fit" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="">Все годы</option>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <select className="input text-sm py-2 min-w-fit" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Все типы</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className={`card ${total < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-sm">
            Итого за период: <span className={`font-bold ${total < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatKZT(total)}</span>
          </p>
        </div>

        <div className="space-y-2">
          {txs.map((t: any) => {
            const isExpense = t.type === 'расход' || t.type === 'покупка актива';
            const yBalance = getYearBalance(t.year);
            const isNegative = isExpense && yBalance !== null && yBalance < 0;
            return (
              <div key={t.id} className={`card ${isNegative ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
                        {isExpense ? '↓' : '↑'}
                      </span>
                      <p className="text-sm font-medium text-slate-800 truncate">{t.description || t.type}</p>
                    </div>
                    <p className="text-xs text-slate-400 ml-7">{t.date} · {t.payment_method}</p>
                    {t.asset_name && <p className="text-xs text-blue-600 ml-7">🏦 {t.asset_name}</p>}
                    {isNegative && (
                      <p className="text-xs text-red-600 ml-7 font-medium">⚠️ Недостаточно подтвержденного баланса</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`font-bold text-sm ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                      {isExpense ? '-' : '+'}{formatKZT(t.amount_kzt)}
                    </span>
                    <button onClick={() => { setForm({ ...t, amount_kzt: String(t.amount_kzt), asset_id: t.asset_id || '' }); setModal(true); }} className="p-1 text-slate-400 hover:text-slate-600">✏️</button>
                    <button onClick={() => del(t.id)} className="p-1 text-slate-300 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
          {txs.length === 0 && <p className="text-center text-slate-400 py-8">Нет транзакций</p>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{form.id ? 'Редактировать' : 'Новая транзакция'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Дата</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value, year: new Date(e.target.value).getFullYear() })} />
                </div>
                <div>
                  <label className="label">Тип</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Сумма (тенге) *</label>
                <input className="input" type="number" value={form.amount_kzt} onChange={e => setForm({ ...form, amount_kzt: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">Способ оплаты</label>
                <select className="input" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Описание</label>
                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Продажа квартиры, зарплата..." />
              </div>
              <div>
                <label className="label">Связанный актив</label>
                <select className="input" value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                  <option value="">Не выбран</option>
                  {assets.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Комментарий</label>
                <textarea className="input" rows={2} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={save} className="btn-primary flex-1">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
