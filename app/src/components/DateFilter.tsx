'use client';
import { useState } from 'react';

export type FilterMode = 'year' | 'month' | 'date' | 'range';

export interface DateFilterValue {
  mode: FilterMode;
  year: string;
  month: string;
  date: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTER: DateFilterValue = {
  mode: 'year', year: '', month: '', date: '', dateFrom: '', dateTo: '',
};

interface Props {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => String(currentYear - 2 + i - 3));

export function buildParams(f: DateFilterValue): URLSearchParams {
  const p = new URLSearchParams();
  if (f.mode === 'year' && f.year) p.set('year', f.year);
  if (f.mode === 'month' && f.year) p.set('year', f.year);
  if (f.mode === 'month' && f.month) p.set('month', f.month);
  if (f.mode === 'date' && f.date) { p.set('date_from', f.date); p.set('date_to', f.date); }
  if (f.mode === 'range') {
    if (f.dateFrom) p.set('date_from', f.dateFrom);
    if (f.dateTo) p.set('date_to', f.dateTo);
  }
  return p;
}

export default function DateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function set(patch: Partial<DateFilterValue>) {
    onChange({ ...value, ...patch });
  }

  function clear() {
    onChange(EMPTY_FILTER);
    setOpen(false);
  }

  const hasFilter = value.year || value.month || value.date || value.dateFrom || value.dateTo;

  function label() {
    if (!hasFilter) return '📅 Все периоды';
    if (value.mode === 'year' && value.year) return `📅 ${value.year} год`;
    if (value.mode === 'month' && value.year && value.month)
      return `📅 ${MONTHS[parseInt(value.month) - 1]} ${value.year}`;
    if (value.mode === 'date' && value.date) return `📅 ${value.date}`;
    if (value.mode === 'range') {
      if (value.dateFrom && value.dateTo) return `📅 ${value.dateFrom} — ${value.dateTo}`;
      if (value.dateFrom) return `📅 с ${value.dateFrom}`;
      if (value.dateTo) return `📅 до ${value.dateTo}`;
    }
    return '📅 Фильтр';
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
          hasFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
        }`}
      >
        {label()}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 w-72 p-4 space-y-3">
          {/* Mode selector */}
          <div className="grid grid-cols-4 gap-1">
            {(['year', 'month', 'date', 'range'] as FilterMode[]).map(m => (
              <button key={m} onClick={() => set({ mode: m })}
                className={`py-1.5 rounded-lg text-xs font-medium ${value.mode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {m === 'year' ? 'Год' : m === 'month' ? 'Месяц' : m === 'date' ? 'Дата' : 'Период'}
              </button>
            ))}
          </div>

          {/* Year picker (shown for year and month modes) */}
          {(value.mode === 'year' || value.mode === 'month') && (
            <div>
              <label className="label">Год</label>
              <div className="flex flex-wrap gap-1">
                {YEARS.map(y => (
                  <button key={y} onClick={() => set({ year: y })}
                    className={`px-3 py-1 rounded-lg text-sm ${value.year === y ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month picker */}
          {value.mode === 'month' && (
            <div>
              <label className="label">Месяц</label>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((m, i) => {
                  const num = String(i + 1).padStart(2, '0');
                  return (
                    <button key={m} onClick={() => set({ month: num })}
                      className={`py-1.5 rounded-lg text-xs ${value.month === num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single date */}
          {value.mode === 'date' && (
            <div>
              <label className="label">Дата</label>
              <input type="date" className="input" value={value.date}
                onChange={e => set({ date: e.target.value })} />
            </div>
          )}

          {/* Date range */}
          {value.mode === 'range' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">С</label>
                <input type="date" className="input text-sm" value={value.dateFrom}
                  onChange={e => set({ dateFrom: e.target.value })} />
              </div>
              <div>
                <label className="label">До</label>
                <input type="date" className="input text-sm" value={value.dateTo}
                  onChange={e => set({ dateTo: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={clear} className="btn-secondary flex-1 py-2 text-sm">Сбросить</button>
            <button onClick={() => setOpen(false)} className="btn-primary flex-1 py-2 text-sm">Готово</button>
          </div>
        </div>
      )}
    </div>
  );
}
