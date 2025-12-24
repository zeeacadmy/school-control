
import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../db';
import { SchoolSettings, AcademicYear } from '../types';
// Add Settings as SettingsIcon to the imports
import { Save, School, Info, Database, Calendar, Plus, Trash2, CheckCircle, Clock, Download, Upload, ShieldAlert, Image as ImageIcon, X, Lock, ShieldCheck, KeyRound, UserCog, Sun, Moon, Settings as SettingsIcon } from 'lucide-react';

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

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setSettings(DB.getSettings());
      setAcademicYears(DB.getAcademicYears());
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
    window.alert('تم حفظ الإعدادات بنجاح. سيتم تطبيق السمة عند إعادة التحميل أو الانتقال لصفحة أخرى.');
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
                        <Moon className="w-5 h-5" /> ليلأ
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-sm font-black text-gray-500">بيانات المدرسة</label>
                <input 
                    type="text" 
                    placeholder="اسم المدرسة" 
                    className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-xl font-bold dark:text-white"
                    value={settings.schoolName}
                    onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                />
            </div>
        </div>

        <div className="pt-8 border-t dark:border-slate-800 flex justify-end">
            <button onClick={handleSaveSettings} className="bg-indigo-600 text-white font-black px-12 py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                <Save className="w-6 h-6" /> حفظ جميع الإعدادات
            </button>
        </div>
      </div>
    </div>
  );
};
