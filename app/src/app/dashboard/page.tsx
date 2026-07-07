'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';
import { formatKZT, CATEGORY_EMOJI } from '@/lib/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [balance, setBalance] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [recentAssets, setRecentAssets] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);

  async function load() {
    const params = buildParams(dateFilter);
    const [s, b, w, t, a] = await Promise.all([
      apiFetch(`/api/dashboard?${params}`).then(r => r.json()),
      apiFetch(`/api/balance?${params}`).then(r => r.json()),
      apiFetch('/api/warnings').then(r => r.json()),
      apiFetch('/api/taxes').then(r => r.json()),
      apiFetch('/api/assets').then(r => r.json()),
    ]);
    setSummary(s && !s.error ? s : null);
    setBalance(Array.isArray(b) ? b : []);
    setWarnings(Array.isArray(w) ? w : []);
    setTaxes(Array.isArray(t) ? t : []);
    setRecentAssets(Array.isArray(a) ? a.slice(0, 5) : []);
  }

  useEffect(() => { load(); }, [dateFilter]);

  const redWarnings = warnings.filter((w: any) => w.severity === 'red');
  const taxesToPay = taxes.filter((t: any) => t.status === 'нужно оплатить');
  const byCat = (summary?.by_category || []).filter((c: any) => c.total > 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Главная</h1>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        {(redWarnings.length > 0 || taxesToPay.length > 0) && (
          <div className="space-y-2">
            {taxesToPay.length > 0 && (
              <Link href="/taxes" className="block bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="font-semibold text-orange-700">🧾 Налог к оплате ({taxesToPay.length})</p>
                <p className="text-orange-600 text-sm">Итого: {formatKZT(taxesToPay.reduce((s: number, t: any) => s + t.tax_amount, 0))}</p>
              </Link>
            )}
            {redWarnings.length > 0 && (
              <Link href="/warnings" className="block bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="font-semibold text-red-700">⚠️ Требует внимания ({redWarnings.length})</p>
                <p className="text-red-600 text-sm">{redWarnings[0]?.message}</p>
              </Link>
            )}
          </div>
        )}

        {summary && (
          <>
            <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <p className="text-blue-100 text-sm mb-1">Общий капитал</p>
              <p className="text-3xl font-bold">{formatKZT(summary.total_capital)}</p>
              <p className="text-blue-200 text-xs mt-1">Деньги + Активы</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">💵 Наличные</p>
                <p className="text-lg font-bold text-green-700">{formatKZT(summary.total_cash)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏦 Безналичные</p>
                <p className="text-lg font-bold text-blue-700">{formatKZT(summary.total_noncash)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">💰 Денежный баланс</p>
                <p className="text-lg font-bold text-slate-800">{formatKZT(summary.total_money)}</p>
              </div>
              <div className="card">
                <p className="text-xs text-slate-500 mb-1">🏠 Стоимость активов</p>
                <p className="text-lg font-bold text-purple-700">{formatKZT(summary.total_property)}</p>
                <p className="text-xs text-slate-400">{summary.asset_count} объектов</p>
              </div>
            </div>
          </>
        )}

        {byCat.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-3">Структура активов</h2>
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byCat} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                    {byCat.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatKZT(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {byCat.map((c: any, i: number) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600">{CATEGORY_EMOJI[c.category] || '📦'} {c.category}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{formatKZT(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {balance.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-3">Денежный баланс по годам</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={balance} barGap={2}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}М`} />
                <Tooltip formatter={(v: any) => formatKZT(Number(v))} />
                <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Расходы" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="asset_purchases" name="Покупки" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {recentAssets.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700">Последние активы</h2>
              <Link href="/assets" className="text-blue-600 text-sm">Все →</Link>
            </div>
            {recentAssets.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORY_EMOJI[a.category] || '📦'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.category} · {a.country}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatKZT(a.amount_kzt)}</p>
                  {a.status === 'продан' && <span className="text-xs text-slate-400">Продан</span>}
                  {a.is_foreign && !a.is_declared && a.status !== 'продан' && (
                    <span className="text-xs text-red-500">⚠️</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
