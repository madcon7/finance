'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';
import { formatKZT } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

export default function BalancePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/balance').then(r => r.json()).then(d => {
      setData(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <AppLayout><p className="text-center py-12 text-slate-400">Загрузка...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Баланс по годам</h1>
          <button onClick={async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/export', { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url;
              a.download = `finance_export_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
            }
          }} className="btn-secondary text-sm py-2 px-3">📥 Excel</button>
        </div>

        {/* Chart */}
        {data.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-3">Доходы и расходы</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} barGap={2}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000000).toFixed(0)}М`} />
                <Tooltip formatter={(v: any) => formatKZT(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Расходы" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="asset_purchases" name="Покупки" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="asset_sales" name="Продажи" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table by year */}
        <div className="space-y-3">
          {data.map((row: any) => {
            const isNeg = row.end_balance < 0;
            return (
              <div key={row.year} className={`card ${isNeg ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`text-lg font-bold ${isNeg ? 'text-red-700' : 'text-slate-800'}`}>{row.year} год</h2>
                  {isNeg && <span className="badge-red">Минус</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Доходы</span>
                    <span className="font-medium text-green-700">{formatKZT(row.income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Расходы</span>
                    <span className="font-medium text-red-600">{formatKZT(row.expenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Покупки актив.</span>
                    <span className="font-medium text-amber-600">{formatKZT(row.asset_purchases)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Продажи актив.</span>
                    <span className="font-medium text-blue-600">{formatKZT(row.asset_sales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Активы итого</span>
                    <span className="font-medium text-slate-700">{formatKZT(row.assets_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Остаток</span>
                    <span className={`font-bold ${isNeg ? 'text-red-700' : 'text-green-700'}`}>
                      {formatKZT(row.end_balance)}
                    </span>
                  </div>
                </div>
                {isNeg && (
                  <div className="mt-3 bg-red-100 rounded-xl p-2 text-xs text-red-700">
                    ⚠️ Конечный баланс отрицательный — расходы превышают доходы
                  </div>
                )}
              </div>
            );
          })}
          {data.length === 0 && <p className="text-center text-slate-400 py-8">Нет данных. Добавьте транзакции.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
