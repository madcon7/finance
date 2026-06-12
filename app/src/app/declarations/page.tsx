'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';

const STATUSES = ['сдана', 'не сдана', 'нужно проверить'];
const EMPTY = { year: new Date().getFullYear(), status: 'не сдана', comment: '' };

export default function DeclarationsPage() {
  const [decls, setDecls] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [dRes, aRes] = await Promise.all([
      apiFetch('/api/declarations').then(r => r.json()),
      apiFetch('/api/assets').then(r => r.json()),
    ]);
    setDecls(Array.isArray(dRes) ? dRes : []);
    setAssets(Array.isArray(aRes) ? aRes : []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/declarations/${form.id}` : '/api/declarations';
    await apiFetch(url, { method, body: JSON.stringify(form) });
    setModal(false);
    load();
  }

  async function del(id: number) {
    if (!confirm('Удалить декларацию?')) return;
    await apiFetch(`/api/declarations/${id}`, { method: 'DELETE' });
    load();
  }

  async function uploadFile(declId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('related_type', 'declaration');
    fd.append('related_id', String(declId));
    await fetch('/api/files', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
    setUploading(false);
    load();
  }

  function getStatusColor(s: string) {
    if (s === 'сдана') return 'badge-green';
    if (s === 'нужно проверить') return 'badge-yellow';
    return 'badge-red';
  }

  // Years with foreign assets but no declaration
  const declaredYears = new Set(decls.map(d => d.year));
  const foreignYears = Array.from(new Set(assets.filter((a: any) => a.is_foreign).map((a: any) => a.declaration_year).filter(Boolean)));
  const missingDecls = foreignYears.filter(y => !declaredYears.has(y));

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Декларации</h1>
          <button onClick={() => { setForm(EMPTY); setModal(true); }} className="btn-primary text-sm py-2 px-4">
            + Добавить
          </button>
        </div>

        {missingDecls.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-semibold text-red-700 mb-1">⚠️ Нет деклараций за годы с зарубежными активами:</p>
            {missingDecls.map(y => <p key={y} className="text-red-600 text-sm">{y} год</p>)}
          </div>
        )}

        {decls.map((d: any) => {
          const yearAssets = assets.filter((a: any) => a.declaration_year === d.year);
          const foreignAssets = yearAssets.filter((a: any) => a.is_foreign);
          return (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-bold text-slate-800 text-lg">{d.year} год</h2>
                    <span className={getStatusColor(d.status)}>{d.status}</span>
                  </div>
                  {d.comment && <p className="text-sm text-slate-500 mb-2">{d.comment}</p>}
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Активов за год: {yearAssets.length}</p>
                    {foreignAssets.length > 0 && (
                      <p className="text-amber-600">Зарубежных активов: {foreignAssets.length}</p>
                    )}
                  </div>
                  {foreignAssets.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {foreignAssets.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <span className={a.is_declared ? 'badge-green' : 'badge-red'}>
                            {a.is_declared ? '✓' : '✗'} {a.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <label className={`text-sm px-3 py-1.5 rounded-xl border cursor-pointer ${uploading ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                      📎 Загрузить файл
                      <input type="file" className="hidden" onChange={e => uploadFile(d.id, e)} />
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button onClick={() => { setForm({ ...d }); setModal(true); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">✏️</button>
                  <button onClick={() => del(d.id)} className="p-2 rounded-xl hover:bg-red-100 text-red-400">🗑️</button>
                </div>
              </div>
            </div>
          );
        })}

        {decls.length === 0 && <p className="text-center text-slate-400 py-8">Нет деклараций</p>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{form.id ? 'Редактировать' : 'Новая декларация'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Год</label>
                  <input className="input" type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Статус</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Комментарий</label>
                <textarea className="input" rows={3} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
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
