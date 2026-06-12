'use client';
import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { getToken } from '@/components/useApi';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['недвижимость', 'автомобиль', 'доля в бизнесе', 'банковский счет', 'ценные бумаги', 'криптовалюта', 'наличные', 'другое'];

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'done'>('upload');
  const [preview, setPreview] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json();
    if (data.preview) {
      setPreview(data.preview[0]);
      // Auto-parse the Excel file based on known structure
      parseMyExcel(data.preview);
      setStep('review');
    }
  }

  function parseMyExcel(sheets: any[]) {
    const parsed: any[] = [];
    for (const sheet of sheets) {
      const rows = sheet.rows as any[][];
      let currentYear: number | null = null;
      for (const row of rows) {
        const first = row[0];
        // Detect year rows
        if (typeof first === 'number' && first >= 2020 && first <= 2030) {
          currentYear = first;
          continue;
        }
        // 2023 simple format - assets/loans section
        if (currentYear === 2023 && first && typeof first === 'string' && first.trim() && row[1]) {
          const amount = typeof row[1] === 'number' ? row[1] : 0;
          if (amount > 0 && !first.includes('Нал') && !first.includes('Безнал') && !first.includes('учредитель') && !first.includes('активы')) {
            parsed.push({
              name: first.trim(),
              amount_kzt: amount,
              declaration_year: currentYear,
              source_type: row[2] ? 'наличные' : row[3] ? 'безналичные' : 'смешанный',
              category: guessCategory(first),
              country: guessCountry(first),
              is_foreign: isLikelyForeign(first),
              needs_declaration: isLikelyForeign(first),
              is_declared: false,
              comment: '',
            });
          }
        }
      }
    }
    setRows(parsed);
  }

  function guessCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('кв ') || n.includes('квартир') || n.includes('п.м') || n.includes('кладовка') || n.includes('паркинг') || n.includes('туран') || n.includes('сыганак') || n.includes('болекпаев') || n.includes('желтоксан') || n.includes('дубай') || n.includes('мерсин')) return 'недвижимость';
    if (n.includes('lexus') || n.includes('touareg') || n.includes('тоуарег') || n.includes('авто') || n.includes('машин')) return 'автомобиль';
    if (n.includes('барс') || n.includes('компани') || n.includes('бизнес') || n.includes('доля') || n.includes('учредитель') || n.includes('group') || n.includes('best central') || n.includes('city dash')) return 'доля в бизнесе';
    if (n.includes('депозит') || n.includes('счет') || n.includes('банк')) return 'банковский счет';
    if (n.includes('займ') || n.includes('loan')) return 'другое';
    if (n.includes('наличка') || n.includes('нал ')) return 'наличные';
    return 'другое';
  }

  function guessCountry(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('дубай') || n.includes('оаэ') || n.includes('аed') || n.includes('dubai')) return 'ОАЭ';
    if (n.includes('турция') || n.includes('мерсин') || n.includes('тurkiye')) return 'Турция';
    return 'Казахстан';
  }

  function isLikelyForeign(name: string): boolean {
    const n = name.toLowerCase();
    return n.includes('дубай') || n.includes('оаэ') || n.includes('турция') || n.includes('мерсин') || n.includes('dubai');
  }

  async function doImport() {
    setImporting(true);
    const res = await fetch('/api/import', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ assets: rows }),
    });
    const data = await res.json();
    setImported(data.imported || 0);
    setStep('done');
    setImporting(false);
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Импорт Excel</h1>

        {step === 'upload' && (
          <div className="card text-center py-8">
            <div className="text-5xl mb-4">📥</div>
            <h2 className="font-semibold text-slate-700 mb-2">Загрузите файл Excel</h2>
            <p className="text-sm text-slate-500 mb-6">Поддерживаются файлы .xlsx, .xls</p>
            <label className="btn-primary cursor-pointer inline-block">
              Выбрать файл
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} />
            </label>
            <p className="text-xs text-slate-400 mt-4">Файл будет прочитан и проанализирован автоматически</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="card bg-green-50 border-green-200">
              <p className="text-green-700 font-medium">✅ Найдено {rows.length} активов для импорта</p>
            </div>

            {rows.length > 0 ? (
              <>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <input
                            className="input text-sm mb-2"
                            value={r.name}
                            onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, name: e.target.value } : row))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select className="input text-sm py-1.5"
                              value={r.category}
                              onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, category: e.target.value } : row))}>
                              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <input type="number" className="input text-sm py-1.5"
                              value={r.amount_kzt}
                              onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, amount_kzt: e.target.value } : row))}
                              placeholder="Сумма ₸" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input className="input text-sm py-1.5 flex-1"
                              value={r.country}
                              onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, country: e.target.value } : row))}
                              placeholder="Страна" />
                            <input className="input text-sm py-1.5 w-20"
                              type="number"
                              value={r.declaration_year}
                              onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, declaration_year: e.target.value } : row))}
                              placeholder="Год" />
                          </div>
                          <div className="flex gap-3 mt-2 text-xs">
                            <label className="flex items-center gap-1">
                              <input type="checkbox" checked={r.is_foreign}
                                onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, is_foreign: e.target.checked } : row))} />
                              Зарубежный
                            </label>
                            <label className="flex items-center gap-1">
                              <input type="checkbox" checked={r.needs_declaration}
                                onChange={e => setRows(rows.map((row, j) => j === i ? { ...row, needs_declaration: e.target.checked } : row))} />
                              Нужно деклар.
                            </label>
                          </div>
                        </div>
                        <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="ml-2 p-1 text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep('upload')} className="btn-secondary flex-1">Отмена</button>
                  <button onClick={doImport} disabled={importing} className="btn-primary flex-1">
                    {importing ? 'Импорт...' : `Импортировать ${rows.length}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="card text-center py-8">
                <p className="text-slate-500">Не удалось автоматически распознать активы.</p>
                <p className="text-sm text-slate-400 mt-2">Пожалуйста, добавьте активы вручную через раздел "Активы".</p>
                <button onClick={() => setStep('upload')} className="btn-secondary mt-4">Попробовать другой файл</button>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="card text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-bold text-green-700 text-xl">Импорт завершен!</h2>
            <p className="text-slate-600 mt-2">Импортировано активов: <span className="font-bold">{imported}</span></p>
            <button onClick={() => router.push('/assets')} className="btn-primary mt-6">Перейти к активам</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
