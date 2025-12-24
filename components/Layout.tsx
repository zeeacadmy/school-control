
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpenCheck, 
  ShieldCheck, 
  FilePieChart, 
  Settings as SettingsIcon,
  School,
  Library,
  Calendar,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { DB } from '../db';
import { AcademicYear, SchoolSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setPage: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setPage }) => {
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [settings, setSettings] = useState<SchoolSettings>(DB.getSettings());
  const [isDark, setIsDark] = useState(settings.theme === 'dark');

  useEffect(() => {
    setActiveYear(DB.getActiveYear());
    const currentSettings = DB.getSettings();
    setSettings(currentSettings);
    setIsDark(currentSettings.theme === 'dark');
    
    if (currentSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [activePage]);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    const updatedSettings = { ...settings, theme: newTheme as 'light' | 'dark' };
    DB.saveSettings(updatedSettings);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'students', label: 'شؤون الطلاب', icon: Users },
    { id: 'subjects', label: 'المواد الدراسية', icon: Library },
    { id: 'grades', label: 'إدخال الدرجات', icon: BookOpenCheck },
    { id: 'control', label: 'أعمال الكنترول', icon: ShieldCheck },
    { id: 'reports', label: 'التقارير والنتائج', icon: FilePieChart },
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    { id: 'about', label: 'حول البرنامج', icon: Info },
  ];

  return (
    <div className={`min-h-screen flex text-right transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`} dir="rtl">
      {/* Sidebar */}
      <aside className={`w-64 flex-shrink-0 sticky top-0 h-screen no-print shadow-2xl z-50 transition-colors duration-300 ${isDark ? 'bg-indigo-950 border-l border-indigo-900/50' : 'bg-indigo-900 text-white'}`}>
        <div className={`p-6 flex items-center gap-3 border-b ${isDark ? 'border-indigo-900/50' : 'border-indigo-800'}`}>
          <div className="w-10 h-10 bg-indigo-800 rounded-xl flex items-center justify-center overflow-hidden border border-indigo-700 shadow-inner">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <School className="w-6 h-6 text-indigo-300" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold truncate max-w-[140px] text-white">{settings.schoolName || 'كنترول المدارس'}</h1>
            <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">نظام الإدارة المتقدم</p>
          </div>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 ${
                activePage === item.id 
                  ? 'bg-indigo-800/80 border-r-4 border-indigo-400 text-white' 
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activePage === item.id ? 'text-indigo-400' : 'text-indigo-300'}`} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className={`absolute bottom-0 w-full p-4 border-t ${isDark ? 'border-indigo-900/50' : 'border-indigo-800'}`}>
          <button onClick={toggleTheme} className="w-full mb-3 flex items-center justify-between px-4 py-2 bg-indigo-800/40 hover:bg-indigo-800/60 rounded-xl text-xs font-bold transition-all text-indigo-200">
             <span>الوضع {isDark ? 'النهاري' : 'الليلي'}</span>
             {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
          </button>
          <div className="flex items-center gap-2 text-[10px] text-indigo-300 font-bold bg-indigo-950/50 p-3 rounded-xl border border-indigo-800/50">
             <Calendar className="w-3 h-3 text-indigo-400" />
             العام: {activeYear?.name || 'غير محدد'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 relative">
        <header className={`mb-8 flex justify-between items-center no-print p-6 rounded-3xl border transition-all duration-300 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest">نظام الإدارة الإلكتروني</span>
              <span className="w-1 h-1 bg-indigo-200 rounded-full"></span>
              <span className={`text-[10px] font-black ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {menuItems.find(i => i.id === activePage)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-left">
                <p className="text-[10px] font-black text-indigo-400 mb-0.5">العام الدراسي النشط</p>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 border border-indigo-500">
                   <Calendar className="w-4 h-4" />
                   <span className="text-xs font-black">{activeYear?.name || 'يرجى التحديد'}</span>
                </div>
             </div>
             <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center overflow-hidden shadow-inner ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-indigo-50 border-indigo-100'}`}>
               {settings.logoUrl ? (
                 <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
               ) : (
                 <span className="text-indigo-400 font-black uppercase">مد</span>
               )}
             </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};
