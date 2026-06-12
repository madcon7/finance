'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { apiFetch, getToken } from '@/components/useApi';
import { formatKZT } from '@/lib/format';

const CATEGORIES = ['недвижимость', 'автомобиль', 'доля в бизнесе', 'банковский счет', 'ценные бумаги', 'криптовалюта', 'наличные', 'другое'];
const SOURCE_TYPES = ['наличные', 'безналичные', 'смешанный'];

const EMPTY = {
  name: '', category: 'недвижимость', country: 'Казахстан', city: '', amount_kzt: '',
  purchase_date: '', declaration_year: '', source_type: 'безналичные',
  is_foreign: false, needs_declaration: false, is_declared: false, comment: '',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewAsset, setViewAsset] = useState<any>(null);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (yearFilter) params.set('year', yearFilter);
    if (catFilter) params.set('category', catFilter);
    const res = await apiFetch(`/api/assets?${params}`);
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load(); }, [search, yearFilter, catFilter]);

  async function loadFiles(assetId: number) {
    const res = await apiFetch(`/api/files?related_type=asset&related_id=${assetId}`);
    const data = await res.json();
    setFiles(Array.isArray(data) ? data : []);
  }

  async function save() {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/assets/${form.id}` : '/api/assets';
    await apiFetch(url, { method, body: JSON.stringify({ ...form, amount_kzt: parseFloat(form.amount_kzt) || 0 }) });
    setModal(null);
    load();
  }

  async function del(id: number) {
    if (!confirm('Удалить актив?')) return;
    await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  }

  async function uploadFile(assetId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('related_type', 'asset');
    fd.append('related_id', String(assetId));
    await fetch('/api/files', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
    await loadFiles(assetId);
    setUploading(false);
  }

  const years = Array.from(new Set(assets.map((a: any) => a.declaration_year).filter(Boolean))).sort();

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Активы</h1>
          <button onClick={() => { setForm(EMPTY); setModal('form'); }} className="btn-primary text-sm py-2 px-4">
            + Добавить
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <input
            type="search"
            placeholder="🔍 Поиск по названию..."
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select className="input text-sm py-2 min-w-fit" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">Все годы</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="input text-sm py-2 min-w-fit" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">Все категории</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Total */}
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-600">Итого активов: <span className="font-bold">{formatKZT(assets.reduce((s, a) => s + (a.amount_kzt || 0), 0))}</span></p>
        </div>

        {/* List */}
        <div className="space-y-3">
          {assets.map((a: any) => (
            <div key={a.id} className={`card ${a.is_foreign && !a.is_declared ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.category} · {a.country}{a.city ? ` · ${a.city}` : ''}</p>
                  <p className="text-sm font-bold text-blue-700 mt-1">{formatKZT(a.amount_kzt)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="badge-gray">{a.source_type}</span>
                    {a.declaration_year && <span className="badge-gray">{a.declaration_year} г.</span>}
                    {a.is_foreign && <span className="badge-yellow">Зарубежный</span>}
                    {a.is_foreign && a.needs_declaration && !a.is_declared && (
                      <span className="badge-red">⚠️ Не задекларирован</span>
                    )}
                    {a.is_declared && <span className="badge-green">Задекларирован</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={() => { setViewAsset(a); loadFiles(a.id); setModal('view'); }}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 text-sm"
                  >📎</button>
                  <button
                    onClick={() => { setForm({ ...a, amount_kzt: String(a.amount_kzt), is_foreign: !!a.is_foreign, needs_declaration: !!a.needs_declaration, is_declared: !!a.is_declared }); setModal('form'); }}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 text-sm"
                  >✏️</button>
                  <button onClick={() => del(a.id)} className="p-2 rounded-xl hover:bg-red-100 text-red-400 text-sm">🗑️</button>
                </div>
              </div>
            </div>
          ))}
          {assets.length === 0 && <p className="text-center text-slate-400 py-8">Нет активов. Нажмите + Добавить</p>}
        </div>
      </div>

      {/* Form Modal */}
      {modal === 'form' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{form.id ? 'Редактировать актив' : 'Новый актив'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Название *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Квартира, Lexus RX..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Категория</label>
                  <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Источник</label>
                  <select className="input" value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })}>
                    {SOURCE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Страна</label>
                  <input className="input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
                </div>
                <div>
                  <label className="label">Город</label>
                  <input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Сумма (тенге) *</label>
                <input className="input" type="number" value={form.amount_kzt} onChange={e => setForm({ ...form, amount_kzt: e.target.value })} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Дата покупки</label>
                  <input className="input" type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
                </div>
                <div>
                  <label className="label">Год декларации</label>
                  <input className="input" type="number" value={form.declaration_year} onChange={e => setForm({ ...form, declaration_year: e.target.value })} placeholder="2024" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_foreign} onChange={e => setForm({ ...form, is_foreign: e.target.checked })} className="w-4 h-4" />
                  <span>Зарубежный актив</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.needs_declaration} onChange={e => setForm({ ...form, needs_declaration: e.target.checked })} className="w-4 h-4" />
                  <span>Нужно задекларировать</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_declared} onChange={e => setForm({ ...form, is_declared: e.target.checked })} className="w-4 h-4" />
                  <span>Уже задекларирован</span>
                </label>
              </div>
              <div>
                <label className="label">Комментарий</label>
                <textarea className="input" rows={2} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Отмена</button>
              <button onClick={save} className="btn-primary flex-1" disabled={!form.name}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* View/Files Modal */}
      {modal === 'view' && viewAsset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 truncate">{viewAsset.name}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Сумма:</span> <span className="font-semibold">{formatKZT(viewAsset.amount_kzt)}</span></div>
                <div><span className="text-slate-500">Категория:</span> <span>{viewAsset.category}</span></div>
                <div><span className="text-slate-500">Страна:</span> <span>{viewAsset.country}</span></div>
                <div><span className="text-slate-500">Год:</span> <span>{viewAsset.declaration_year}</span></div>
              </div>
              {viewAsset.comment && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{viewAsset.comment}</p>}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-700">Документы ({files.length})</h3>
                  <label className="btn-primary text-sm py-1.5 px-3 cursor-pointer">
                    {uploading ? '...' : '+ Загрузить'}
                    <input type="file" className="hidden" onChange={e => uploadFile(viewAsset.id, e)} />
                  </label>
                </div>
                {files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📄</span>
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">{f.file_name}</span>
                    </div>
                    <div className="flex gap-1">
                      <a href={`/api/files/${f.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-blue-600 text-xs" download>⬇️</a>
                      <button onClick={async () => { await apiFetch(`/api/files/${f.id}`, { method: 'DELETE' }); loadFiles(viewAsset.id); }} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 text-xs">🗑️</button>
                    </div>
                  </div>
                ))}
                {files.length === 0 && <p className="text-sm text-slate-400">Нет документов</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
