import React, { useState } from 'react';
import { Moon, Lock } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    setLoading(true);
    try {
      await login(password);
    } catch (err: any) {
      if (err?.message === 'wrong-password') {
        setError('كلمة المرور غير صحيحة');
      } else {
        setError('حدث خطأ في الاتصال. حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Moon className="w-9 h-9 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">روح المسلم</h1>
          <p className="text-sm text-slate-400 mt-1">لوحة التحكم</p>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">تسجيل الدخول</h2>
              <p className="text-xs text-slate-400">أدخل كلمة المرور للمتابعة</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full px-4 py-3 bg-[#0a0f1a] border border-[#1e293b] rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {loading ? 'جاري التحميل...' : 'دخول'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Rooh Al-Muslim Admin Panel
        </p>
      </div>
    </div>
  );
};

export default Login;
