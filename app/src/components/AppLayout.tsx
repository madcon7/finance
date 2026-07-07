'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Главная' },
  { href: '/assets', icon: '🏦', label: 'Активы' },
  { href: '/transactions', icon: '💸', label: 'Транзакции' },
  { href: '/balance', icon: '📊', label: 'Баланс' },
  { href: '/declarations', icon: '📋', label: 'Декларации' },
  { href: '/taxes', icon: '🧾', label: 'Налоги' },
  { href: '/warnings', icon: '⚠️', label: 'Предупреждения' },
  { href: '/import', icon: '📥', label: 'Импорт Excel' },
];

const BOTTOM_NAV = [
  { href: '/dashboard', icon: '🏠', label: 'Главная' },
  { href: '/assets', icon: '🏦', label: 'Активы' },
  { href: '/transactions', icon: '💸', label: 'Деньги' },
  { href: '/balance', icon: '📊', label: 'Баланс' },
  { href: '/taxes', icon: '🧾', label: 'Налоги' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    setEmail(localStorage.getItem('email') || '');
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    router.push('/login');
  }

  async function doBackup() {
    setMenuOpen(false);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/backup', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_backup_${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between px-4 h-14">
          <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl hover:bg-slate-100 -ml-1">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <span className="font-bold text-slate-800 text-lg">Финансы</span>
          </Link>
          <span className="text-xs text-slate-400 hidden sm:block truncate max-w-[150px]">{email}</span>
          <div className="sm:hidden w-8" />
        </div>
      </header>

      {/* Left sidebar overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          {/* Sidebar slides from LEFT */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-slide-in-left">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">💼</span>
                <div>
                  <p className="font-bold text-slate-800 text-lg leading-tight">Мои Финансы</p>
                  <p className="text-xs text-slate-500">{email}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl w-7 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100 space-y-1">
              <button
                onClick={doBackup}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl w-full"
              >
                <span className="text-xl">💾</span>
                Резервная копия
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl w-full"
              >
                <span className="text-xl">🚪</span>
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-screen-lg mx-auto px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-bottom">
        <div className="max-w-screen-lg mx-auto flex">
          {BOTTOM_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 transition-colors ${
                pathname === item.href ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 truncate w-full text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
