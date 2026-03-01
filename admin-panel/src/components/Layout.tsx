import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', label: 'لوحة التحكم' },
    { path: '/settings', label: 'إعدادات التطبيق' },
    { path: '/users', label: 'المستخدمين' },
    { path: '/ads', label: 'الإعلانات' },
    { path: '/pricing', label: 'الأسعار' },
    { path: '/subscriptions', label: 'الاشتراكات' },
    { path: '/content', label: 'المحتوى' },
    { path: '/notifications', label: 'الإشعارات' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        <aside className="w-64 bg-emerald-950 text-white min-h-screen fixed right-0">
          <div className="p-6 border-b border-emerald-800">
            <h1 className="text-xl font-bold">رُوح المسلم</h1>
            <p className="text-emerald-300 text-sm mt-1">لوحة التحكم</p>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <a
                    href={item.path}
                    className={`block px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'bg-emerald-700 text-white'
                        : 'hover:bg-emerald-800 text-emerald-100'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="flex-1 mr-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
