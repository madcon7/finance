'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';
import { formatKZT, CATEGORY_EMOJI } from '@/lib/format';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const STATUS_COLORS: Record<string,string> = {
  'нужно оплатить': 'badge-warning',
  'нужно проверить': 'badge-warning',
  'оплачено': 'badge-success',
  'не применимо': 'badge-neutral',
};

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ year: new Date().getFullYear(), description:'', buy_amount:'', sell_amount:'', tax_rate:'10', comment:'' });
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);

  async function load() {
    const params = buildParams(dateFilter);
    const res = await apiFetch(`/api/taxes?${params}`).then(r => r.json());
    setTaxes(Array.isArray(res) ? res : []);
  }

  useEffect(() => { load(); }, [dateFilter]);

  async function markPaid(id: number) {
    await apiFetch(`/api/taxes/${id}`, { method:'PUT', body: JSON.stringify({ status:'оплачено' }) });
    load();
  }

  async function save() {
    await apiFetch('/api/taxes', { method:'POST', body: JSON.stringify({
      ...form,
      buy_amount: parseFloat(form.buy_amount)||0,
      sell_amount: parseFloat(form.sell_amount)||0,
      tax_rate: parseFloat(form.tax_rate)||10,
    })});
    setModal(false); load();
  }

  async function del(id: number) {
    if (!confirm('Удалить запись?')) return;
    await apiFetch(`/api/taxes/${id}`, { method:'DELETE' });
    load();
  }

  const totalToPay = taxes.filter(t => t.status !== 'оплачено').reduce((s,t) => s + (t.tax_amount||0), 0);
  const totalPaid = taxes.filter(t => t.status === 'оплачено').reduce((s,t) => s + (t.tax_amount||0), 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Налоги</h1>
          <button onClick={() => setModal(true)} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-700">
          ⚠️ Расчёт предварительный. Проверьте с налоговым консультантом.
        </div>

        <DateFilter value={dateFilter} onChange={setDateFilter} />

        <div className="grid grid-cols-2 gap-2">
          <div className="card bg-red-50 border-red-100 py-3">
            <p className="text-xs text-red-600">К оплате</p>
            <p className="font-bold text-red-700">{formatKZT(totalToPay)}</p>
          </div>
          <div className="card bg-green-50 border-green-100 py-3">
            <p className="text-xs text-green-600">Оплачено</p>
            <p className="font-bold text-green-700">{formatKZT(totalPaid)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {taxes.map((t: any) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800">{t.description || `Налог ${t.year}`}</span>
                    <span className={`badge ${STATUS_COLORS[t.status]||'badge-neutral'}`}>{t.status}</span>
                  </div>
                  {t.asset_name && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {CATEGORY_EMOJI[t.asset_category]||'📦'} {t.asset_name}
                      {t.asset_country && t.asset_country !== 'Казахстан' && ` · 🌍 ${t.asset_country}`}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                    <span>📅 {t.year}</span>
                    {t.purchase_date && <span>Куплено: {t.purchase_date}</span>}
                    {t.asset_sold_date && <span>Продано: {t.asset_sold_date}</span>}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                      <p className="text-slate-400">Покупка</p>
                      <p className="font-medium">{formatKZT(t.buy_amount||0)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                      <p className="text-slate-400">Продажа</p>
                      <p className="font-medium">{formatKZT(t.sell_amount||0)}</p>
                    </div>
                    <div className={`rounded-lg p-1.5 text-center ${(t.profit||0)>0?'bg-green-50':'bg-red-50'}`}>
                      <p className="text-slate-400">Прибыль</p>
                      <p className={`font-medium ${(t.profit||0)>0?'text-green-700':'text-red-700'}`}>{formatKZT(t.profit||0)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Налог {t.tax_rate||10}%:</span>
                    <span className="font-bold text-base text-red-600">{formatKZT(t.tax_amount||0)}</span>
                  </div>
                  {t.comment && <p className="text-xs text-slate-400 mt-1">{t.comment}</p>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => del(t.id)} className="text-slate-200 hover:text-red-500 text-sm">🗑️</button>
                </div>
              </div>
              {t.status !== 'оплачено' && (
                <button onClick={() => markPaid(t.id)} className="mt-2 w-full py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium border border-green-200 hover:bg-green-100">
                  ✅ Отметить оплаченным
                </button>
              )}
            </div>
          ))}
          {taxes.length === 0 && <p className="text-center text-slate-400 py-10">Нет налоговых записей</p>}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-bold">Добавить налог</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-3 pb-6">
              <div><label className="label">Год</label><input className="input" type="number" value={form.year} onChange={e => setForm({...form, year:e.target.value})} /></div>
              <div><label className="label">Описание</label><input className="input" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Продажа квартиры..." /></div>
              <div><label className="label">Сумма покупки (₸)</label><input className="input" type="number" value={form.buy_amount} onChange={e => setForm({...form, buy_amount:e.target.value})} /></div>
              <div><label className="label">Сумма продажи (₸)</label><input className="input" type="number" value={form.sell_amount} onChange={e => setForm({...form, sell_amount:e.target.value})} /></div>
              <div><label className="label">Ставка налога (%)</label><input className="input" type="number" value={form.tax_rate} onChange={e => setForm({...form, tax_rate:e.target.value})} /></div>
              {form.buy_amount && form.sell_amount && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                  <p>Прибыль: <strong>{formatKZT(Math.max(0, parseFloat(form.sell_amount||0) - parseFloat(form.buy_amount||0)))}</strong></p>
                  <p>Налог: <strong className="text-red-600">{formatKZT(Math.max(0, parseFloat(form.sell_amount||0) - parseFloat(form.buy_amount||0)) * (parseFloat(form.tax_rate||10)/100))}</strong></p>
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
    </AppLayout>
  );
}
