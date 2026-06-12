'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';
import { formatKZT } from '@/lib/format';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const CATEGORIES = ['недвижимость', 'автомобиль', 'доля в бизнесе', 'банковский счет', 'ценные бумаги', 'криптовалюта', 'наличные', 'другое'];

export default function Dashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [year, setYear] = useState<string>('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/assets').then(r => r.json()),
      apiFetch('/api/balance').then(r => r.json()),
      apiFetch('/api/warnings').then(r => r.json()),
    ]).then(([a, b, w]) => {
      setAssets(Array.isArray(a) ? a : []);
      setBalance(Array.isArray(b) ? b : []);
      setWarnings(Array.isArray(w) ? w : []);
    });
  }, []);

  const years = Array.from(new Set(assets.map((a: any) => a.declaration_year).filter(Boolean))).sort();

  const filtered = year ? assets.filter((a: any) => a.declaration_year == year) : assets;
  const totalAssets = filtered.reduce((s: number, a: any) => s + (a.amount_kzt || 0), 0);
  const cashAssets = filtered.filter((a: any) => a.source_type === 'наличные' || a.category === 'наличные')
    .reduce((s: number, a: any) => s + a.amount_kzt, 0);
  const nonCashAssets = totalAssets - cashAssets;

  const byCat = CATEGORIES.map(cat => ({
    name: cat,
    value: filtered.filter((a: any) => a.category === cat).reduce((s: number, a: any) => s + a.amount_kzt, 0),
  })).filter(c => c.value > 0);

  const redWarnings = warnings.filter((w: any) => w.severity === 'red');

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Year filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setYear('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${!year ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            Все годы
          </button>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYear(String(y))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${year == String(y) ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Warnings banner */}
        {redWarnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-semibold text-red-700 mb-2">⚠️ Требует внимания ({redWarnings.length})</p>
            {redWarnings.slice(0, 3).map((w: any, i: number) => (
              <p key={i} className="text-red-600 text-sm">{w.message}</p>
            ))}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Всего активов</p>
            <p className="text-lg font-bold text-slate-800">{formatKZT(totalAssets)}</p>
            <p className="text-xs text-slate-400">{filtered.length} объектов</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Наличные</p>
            <p className="text-lg font-bold text-green-700">{formatKZT(cashAssets)}</p>
            <p className="text-xs text-slate-400">из активов</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Безналичные</p>
            <p className="text-lg font-bold text-blue-700">{formatKZT(nonCashAssets)}</p>
            <p className="text-xs text-slate-400">из активов</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Предупреждения</p>
            <p className="text-lg font-bold text-red-600">{warnings.length}</p>
            <p className="text-xs text-slate-400">{redWarnings.length} критичных</p>
          </div>
        </div>

        {/* Category breakdown */}
        {byCat.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-3">Структура активов</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatKZT(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1">
                {byCat.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 capitalize">{c.name}</span>
                    </div>
                    <span className="font-medium text-slate-800">{formatKZT(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Balance chart */}
        {balance.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-3">Активы по годам</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={balance}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}М`} />
                <Tooltip formatter={(v: any) => formatKZT(Number(v))} />
                <Bar dataKey="assets_total" name="Активы" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent assets */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Последние активы</h2>
          {filtered.slice(0, 5).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-400">{a.category} · {a.country}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{formatKZT(a.amount_kzt)}</p>
                {a.is_foreign && !a.is_declared && (
                  <span className="badge-red">Не задекларирован</span>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-slate-400 text-sm">Нет активов</p>}
        </div>
      </div>
    </AppLayout>
  );
}
