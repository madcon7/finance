'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/components/useApi';

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/warnings').then(r => r.json()).then(d => {
      setWarnings(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const red = warnings.filter(w => w.severity === 'red');
  const yellow = warnings.filter(w => w.severity === 'yellow');

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Предупреждения</h1>

        {loading && <p className="text-center text-slate-400 py-8">Загрузка...</p>}

        {!loading && warnings.length === 0 && (
          <div className="card text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-green-700">Всё в порядке!</p>
            <p className="text-sm text-slate-500 mt-1">Нет критичных предупреждений</p>
          </div>
        )}

        {red.length > 0 && (
          <div>
            <h2 className="font-semibold text-red-700 mb-2">🔴 Критичные ({red.length})</h2>
            <div className="space-y-2">
              {red.map((w, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-red-700 font-medium">{w.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {yellow.length > 0 && (
          <div>
            <h2 className="font-semibold text-amber-700 mb-2">🟡 Требует внимания ({yellow.length})</h2>
            <div className="space-y-2">
              {yellow.map((w, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-amber-700">{w.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
