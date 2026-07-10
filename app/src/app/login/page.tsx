'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirm) {
      setError('Пароли не совпадают'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      router.push('/dashboard');
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: 'login' | 'register') {
    setMode(m); setError(''); setConfirm(''); setPassword('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💼</div>
          <h1 className="text-2xl font-bold text-slate-800">Мои Финансы</h1>
          <p className="text-slate-500 text-sm mt-1">Учет активов и деклараций</p>
        </div>

        <div className="card">
          <div className="flex gap-2 mb-6">
            <button onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Войти
            </button>
            <button onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Пароль</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-12"
                  placeholder="Минимум 6 символов"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="label">Повторите пароль</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} className="input pr-12"
                    placeholder="Повторите пароль"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-red-500 text-xs mt-1">Пароли не совпадают</p>
                )}
                {confirm && password === confirm && (
                  <p className="text-green-600 text-xs mt-1">✅ Пароли совпадают</p>
                )}
              </div>
            )}
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Все данные хранятся локально на вашем сервере
        </p>
      </div>
    </div>
  );
}
