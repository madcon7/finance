'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Войти
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input
                type="password"
                className="input"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Все данные хранятся локально на вашем компьютере
        </p>
      </div>
    </div>
  );
}
