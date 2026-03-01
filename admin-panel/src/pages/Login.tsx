cat > src/pages/Login.tsx << 'EOF'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🕌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">رُوح المسلم</h1>
          <p className="text-gray-500">لوحة التحكم</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="admin@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700">
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
EOF
