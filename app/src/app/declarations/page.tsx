'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';
import DateFilter, { EMPTY_FILTER, DateFilterValue, buildParams } from '@/components/DateFilter';

const STATUS_COLORS: Record<string,string> = {
  'не подана': 'badge-error',
  'нужно проверить': 'badge-warning',
  'подана': 'badge-success',
  'принята': 'badge-success',
  'отклонена': 'badge-error',
};

const STATUSES = ['не подана','нужно проверить','подана','принята','отклонена'];

export default function DeclarationsPage() {
  const [decls, setDecls] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [viewDecl, setViewDecl] = useState<any>(null);
  const [form, setForm] = useState<any>({ year: new Date().getFullYear(), status:'не подана', comment:'', deadline:'' });
  const [uploading, setUploading] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(EMPTY_FILTER);

  async function load() {
    const params = buildParams(dateFilter);
    const res = await apiFetch(`/api/declarations?${params}`).then(r => r.json());
    setDecls(Array.isArray(res) ? res : []);
  }

  async function loadFiles(declId: number) {
    const res = await apiFetch(`/api/files?entity_type=declaration&entity_id=${declId}`).then(r => r.json());
    setFiles(Array.isArray(res) ? res : []);
  }

  useEffect(() => { load(); }, [dateFilter]);

  async function save() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/declarations/${form.id}` : '/api/declarations';
    await apiFetch(url, { method, body: JSON.stringify(form) });
    setModal(false); load();
  }

  async function del(id: number) {
    if (!confirm('Удалить декларацию?')) return;
    await apiFetch(`/api/declarations/${id}`, { method:'DELETE' });
    load();
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>, declId: number) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entity_type', 'declaration');
    fd.append('entity_id', String(declId));
    fd.append('description', file.name);
    await fetch('/api/files', { method:'POST', headers: { Authorization:`Bearer ${getToken()}` }, body: fd });
    await loadFiles(declId);
    setUploading(false);
  }

  async function openView(d: any) {
    setViewDecl(d);
    await loadFiles(d.id);
  }

  const toPrepare = decls.filter(d => d.status === 'не подана' || d.status === 'нужно проверить').length;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Декларации</h1>
          <button onClick={() => { setForm({ year: new Date().getFullYear(), status:'не подана', comment:'', deadline:'' }); setModal(true); }} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
        </div>

        {toPrepare > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm text-amber-700">
            ⚠️ {toPrepare} деклараций нужно подготовить или проверить
          </div>
        )}

        <DateFilter value={dateFilter} onChange={setDateFilter} />

        <div className="space-y-2">
          {decls.map((d: any) => (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800">{d.year} год</span>
                    <span className={`badge ${STATUS_COLORS[d.status]||'badge-neutral'}`}>{d.status}</span>
                  </div>
                  {d.deadline && <p className="text-xs text-slate-500 mt-0.5">⏰ Срок: {d.deadline}</p>}
                  {d.comment && (
                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-line line-clamp-3">{d.comment}</p>
                  )}
                  {d.submitted_at && <p className="text-xs text-green-600 mt-1">✅ Подана: {d.submitted_at?.slice(0,10)}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openView(d)} className="text-slate-300 hover:text-slate-600">👁️</button>
                  <button onClick={() => { setForm({...d}); setModal(true); }} className="text-slate-300 hover:text-slate-600">✏️</button>
                  <button onClick={() => del(d.id)} className="text-slate-200 hover:text-red-500">🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {decls.length === 0 && <p className="text-center text-slate-400 py-10">Нет деклараций</p>}
        </div>
      </div>

      {/* Edit/Add modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-bold">{form.id ? 'Редактировать' : 'Новая декларация'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-3 pb-6">
              <div><label className="label">Год</label><input className="input" type="number" value={form.year} onChange={e => setForm({...form, year:e.target.value})} /></div>
              <div>
                <label className="label">Статус</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setForm({...form, status:s})}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${form.status===s?'border-blue-500 bg-blue-50 text-blue-700':'border-slate-200 text-slate-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="label">Срок подачи</label><input className="input" type="date" value={form.deadline||''} onChange={e => setForm({...form, deadline:e.target.value})} /></div>
              {(form.status==='подана'||form.status==='принята') && (
                <div><label className="label">Дата подачи</label><input className="input" type="date" value={form.submitted_at?.slice(0,10)||''} onChange={e => setForm({...form, submitted_at:e.target.value})} /></div>
              )}
              <div><label className="label">Комментарий / Детали</label><textarea className="input" rows={4} value={form.comment||''} onChange={e => setForm({...form, comment:e.target.value})} placeholder="Активы, доходы, примечания..." /></div>
            </div>
            <div className="p-4 border-t sticky bottom-0 bg-white flex gap-2">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={save} className="btn-primary flex-1">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewDecl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b sticky top-0 bg-white flex items-center justify-between">
              <h2 className="font-bold">Декларация {viewDecl.year}</h2>
              <button onClick={() => setViewDecl(null)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="p-4 space-y-4 pb-6">
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_COLORS[viewDecl.status]||'badge-neutral'}`}>{viewDecl.status}</span>
                {viewDecl.deadline && <span className="text-xs text-slate-500">⏰ Срок: {viewDecl.deadline}</span>}
              </div>
              {viewDecl.comment && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-line">{viewDecl.comment}</div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Файлы</p>
                <label className={`block w-full py-2 text-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 cursor-pointer hover:border-blue-400 ${uploading?'opacity-50':''}`}>
                  {uploading ? 'Загрузка...' : '📎 Прикрепить файл'}
                  <input type="file" className="hidden" onChange={e => uploadFile(e, viewDecl.id)} disabled={uploading} />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f: any) => (
                      <a key={f.id} href={`/api/files/${f.id}/download`}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded-xl text-sm text-blue-700 hover:bg-blue-100">
                        📄 {f.description || f.original_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
