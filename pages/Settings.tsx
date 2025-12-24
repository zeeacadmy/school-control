
import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../db';
import { SchoolSettings, AcademicYear } from '../types';
import { Save, Upload, Image as ImageIcon, X, Lock, ShieldCheck, Sun, Moon, Settings as SettingsIcon, Trash2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: '',
    directorate: '',
    principal: '',
    collectorName: '',
    controlHeadName: '',
    logoUrl: '',
    theme: 'light'
  });

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setSettings(DB.getSettings());
    }
  }, [isAuthenticated]);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === '5016178') {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  const handleSaveSettings = () => {
    DB.saveSettings(settings);
    window.alert('تم حفظ الإعدادات بنجاح. سيتم تطبيق السمة والمظهر الجديد فوراً.');
    // Force immediate theme application
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setSettings({ ...settings, logoUrl: '' });
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-in fade-in duration-500">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-2xl max-w-md w-full text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="flex justify-center">
            <div className={`p-6 rounded-3xl transition-all duration-300 ${passwordError ? 'bg-red-50 text-red-600' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600'}`}>
              <Lock className="w-12 h-12" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white">منطقة محمية</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="كلمة المرور"
              className="w-full bg-gray-50 dark:bg-slate-950 border-2 border-gray-100 dark:border-slate-800 p-4 rounded-2xl outline-none focus:ring-4 text-center font-black dark:text-white"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" /> دخول النظام
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-indigo-600" />
          <h3 className="text-xl font-bold dark:text-white">إعدادات النظام والمظهر</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="space-y-4">
                    <label className="text-sm font-black text-gray-500 flex items-center gap-2">اختيار السمة (Theme)</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setSettings({...settings, theme: 'light'})}
                            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.theme === 'light' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-gray-50 border-transparent text-gray-400 dark:bg-slate-800'}`}
                        >
                            <Sun className="w-5 h-5" /> نهاراً
                        </button>
                        <button 
                            onClick={() => setSettings({...settings, theme: 'dark'})}
                            className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.theme === 'dark' ? 'bg-slate-800 border-indigo-600 text-indigo-400' : 'bg-gray-50 border-transparent text-gray-400 dark:bg-slate-800'}`}
                        >
                            <Moon className="w-5 h-5" /> ليلاً
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-black text-gray-500 flex items-center gap-2">شعار المدرسة</label>
                    <div className="flex flex-col gap-4 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                        <div className="flex items-center justify-center">
                            {settings.logoUrl ? (
                                <div className="relative group">
                                    <img 
                                        src={settings.logoUrl} 
                                        alt="School Logo Preview" 
                                        className="w-32 h-32 object-contain rounded-2xl bg-white shadow-sm p-2 border-2 border-indigo-50" 
                                    />
                                    <button 
                                        onClick={removeLogo}
                                        className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors"
                                        title="حذف الشعار"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-300 dark:text-slate-600">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            ref={logoInputRef}
                            onChange={handleLogoUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button 
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full py-3 px-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            {settings.logoUrl ? 'تغيير الشعار' : 'رفع شعار جديد'}
                        </button>
                        {settings.logoUrl && (
                            <button 
                                onClick={removeLogo}
                                className="w-full py-2 text-[10px] font-black text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                إزالة الشعار الحالي
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-4">
                    <label className="text-sm font-black text-gray-500">بيانات المدرسة الأساسية</label>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">اسم المدرسة</span>
                            <input 
                                type="text" 
                                placeholder="اسم المدرسة" 
                                className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white outline-none focus:border-indigo-500"
                                value={settings.schoolName}
                                onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">المديرية / الإدارة</span>
                            <input 
                                type="text" 
                                placeholder="مديرية التربية والتعليم" 
                                className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white outline-none focus:border-indigo-500"
                                value={settings.directorate}
                                onChange={(e) => setSettings({...settings, directorate: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">مدير المدرسة</span>
                            <input 
                                type="text" 
                                placeholder="أ/ ...." 
                                className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white outline-none focus:border-indigo-500"
                                value={settings.principal}
                                onChange={(e) => setSettings({...settings, principal: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-black text-gray-500">التواقيع والاعتمادات</label>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">معد الكشوف</span>
                            <input 
                                type="text" 
                                placeholder="الاسم الكامل" 
                                className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white outline-none focus:border-indigo-500"
                                value={settings.collectorName}
                                onChange={(e) => setSettings({...settings, collectorName: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">رئيس الكنترول</span>
                            <input 
                                type="text" 
                                placeholder="الاسم الكامل" 
                                className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white outline-none focus:border-indigo-500"
                                value={settings.controlHeadName}
                                onChange={(e) => setSettings({...settings, controlHeadName: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-8 border-t dark:border-slate-800 flex justify-end">
            <button onClick={handleSaveSettings} className="bg-indigo-600 text-white font-black px-12 py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95">
                <Save className="w-6 h-6" /> حفظ التغييرات
            </button>
        </div>
      </div>
    </div>
  );
};
