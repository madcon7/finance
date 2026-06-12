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
  { href: '/warnings', icon: '⚠️', label: 'Предупреждения' },
  { href: '/import', icon: '📥', label: 'Импорт' },
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-screen-lg mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <span className="font-bold text-slate-800 text-lg">Финансы</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:block">{email}</span>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-slate-100">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Side menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 max-w-full bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">💼</span>
                <span className="font-bold text-slate-800">Мои Финансы</span>
              </div>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-2">
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/backup', { headers: { Authorization: `Bearer ${token}` } });
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `finance_backup_${new Date().toISOString().slice(0,10)}.db`;
                    a.click();
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl w-full"
              >
                <span className="text-xl">💾</span>
                Резервная копия
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl w-full"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30">
        <div className="max-w-screen-lg mx-auto flex justify-around">
          {NAV.slice(0, 5).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 ${
                pathname === item.href ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5 truncate w-full text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
