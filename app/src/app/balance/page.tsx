'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';
import { formatKZT } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

export default function BalancePage() {
  const [data, setData] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);

  async function load() {
    const params = buildParams(dateFilter);
    const res = await apiFetch(`/api/balance?${params}`).then(r => r.json());
    setData(Array.isArray(res) ? res : []);
  }

  useEffect(() => { load(); }, [dateFilter]);

  const total = data.reduce((s, r) => ({
    income: s.income + (r.income || 0),
    expenses: s.expenses + (r.expenses || 0),
    asset_purchases: s.asset_purchases + (r.asset_purchases || 0),
    asset_sales: s.asset_sales + (r.asset_sales || 0),
    cash_balance: r.cash_balance || s.cash_balance,
    noncash_balance: r.noncash_balance || s.noncash_balance,
    property_assets: r.property_assets || s.property_assets,
    total_capital: r.total_capital || s.total_capital,
  }), { income:0, expenses:0, asset_purchases:0, asset_sales:0, cash_balance:0, noncash_balance:0, property_assets:0, total_capital:0 });

  const chartData = data.map(r => ({
    name: r.year || r.month || r.date || 'Период',
    Доходы: r.income || 0,
    Расходы: r.expenses || 0,
    Активы: r.property_assets || 0,
  }));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Баланс</h1>
        </div>

        <DateFilter value={dateFilter} onChange={setDateFilter} />

        <div className="grid grid-cols-2 gap-2">
          <div className="card bg-green-50 border-green-100 py-3">
            <p className="text-xs text-green-600">↑ Доходы</p>
            <p className="font-bold text-green-700">{formatKZT(total.income)}</p>
          </div>
          <div className="card bg-red-50 border-red-100 py-3">
            <p className="text-xs text-red-600">↓ Расходы</p>
            <p className="font-bold text-red-700">{formatKZT(total.expenses)}</p>
          </div>
          <div className="card bg-blue-50 border-blue-100 py-3">
            <p className="text-xs text-blue-600">🛒 Куплено активов</p>
            <p className="font-bold text-blue-700">{formatKZT(total.asset_purchases)}</p>
          </div>
          <div className="card bg-purple-50 border-purple-100 py-3">
            <p className="text-xs text-purple-600">💰 Продано активов</p>
            <p className="font-bold text-purple-700">{formatKZT(total.asset_sales)}</p>
          </div>
        </div>

        {data.length > 0 && (
          <div className="card space-y-2">
            <p className="text-sm font-semibold text-slate-700">Структура капитала</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">💵 Наличные</span>
              <span className="font-medium">{formatKZT(total.cash_balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">🏦 Безналичные</span>
              <span className="font-medium">{formatKZT(total.noncash_balance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">🏠 Имущество</span>
              <span className="font-medium">{formatKZT(total.property_assets)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold text-slate-700">Всего капитал</span>
              <span className="font-bold text-blue-700">{formatKZT(total.total_capital)}</span>
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-slate-700 mb-3">График</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(0)}M` : `${(v/1e3).toFixed(0)}K`} />
                <Tooltip formatter={(v: any) => formatKZT(v)} />
                <Legend />
                <Bar dataKey="Доходы" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="Расходы" fill="#ef4444" radius={[3,3,0,0]} />
                <Bar dataKey="Активы" fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.length > 1 && (
          <div className="card overflow-x-auto">
            <p className="text-sm font-semibold text-slate-700 mb-3">По периодам</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b">
                  <th className="text-left pb-2">Период</th>
                  <th className="text-right pb-2">Доходы</th>
                  <th className="text-right pb-2">Расходы</th>
                  <th className="text-right pb-2">Нетто</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r: any, i) => {
                  const bal = (r.income||0) - (r.expenses||0);
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{r.year || r.month || r.date}</td>
                      <td className="text-right text-green-600">{formatKZT(r.income||0)}</td>
                      <td className="text-right text-red-600">{formatKZT(r.expenses||0)}</td>
                      <td className={`text-right font-bold ${bal>=0?'text-green-700':'text-red-700'}`}>{formatKZT(bal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data.length === 0 && (
          <p className="text-center text-slate-400 py-10">Нет данных за выбранный период</p>
        )}
      </div>
    </AppLayout>
  );
}
