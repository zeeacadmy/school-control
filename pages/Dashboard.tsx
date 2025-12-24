
import React, { useMemo } from 'react';
import { DB } from '../db.ts';
import { Users, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Grade } from '../types.ts';
import { calculateStudentStatus } from '../logic/grading.ts';

export const Dashboard: React.FC<{ setPage: (page: string) => void }> = ({ setPage }) => {
  const students = DB.getStudents();
  const gradesData = DB.getGrades();
  const subjects = DB.getSubjects();

  const stats = useMemo(() => {
    const total = students.length;
    const gradeCounts = Object.values(Grade).map(g => ({
      name: g,
      count: students.filter(s => s.grade === g).length
    })).filter(g => g.count > 0);

    const processed = students.map(s => calculateStudentStatus(s, subjects, gradesData));
    const passed = processed.filter(p => p.finalStatus === 'ناجح').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, gradeCounts, passRate, passed };
  }, [students, gradesData, subjects]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="w-8 h-8" />} 
          label="إجمالي الطلاب" 
          value={stats.total} 
          color="bg-blue-600" 
        />
        <StatCard 
          icon={<GraduationCap className="w-8 h-8" />} 
          label="الصفوف الدراسية" 
          value={stats.gradeCounts.length} 
          color="bg-purple-600" 
        />
        <StatCard 
          icon={<CheckCircle2 className="w-8 h-8" />} 
          label="نسبة النجاح" 
          value={`${stats.passRate}%`} 
          color="bg-emerald-600" 
        />
        <StatCard 
          icon={<AlertCircle className="w-8 h-8" />} 
          label="طلاب الدور الثاني" 
          value={stats.total - stats.passed} 
          color="bg-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-gray-700 dark:text-slate-300">توزيع الطلاب حسب الصف</h3>
          <div className="h-80">
            {stats.gradeCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gradeCounts}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    {stats.gradeCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                لا توجد بيانات للعرض حالياً
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-gray-700 dark:text-slate-300">إجراءات سريعة</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickActionButton 
              onClick={() => setPage('students')}
              label="إضافة طالب جديد" 
              color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100" 
            />
            <QuickActionButton 
              onClick={() => setPage('grades')}
              label="رصد درجات مادة" 
              color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100" 
            />
            <QuickActionButton 
              onClick={() => setPage('control')}
              label="أرقام الجلوس" 
              color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100" 
            />
            <QuickActionButton 
              onClick={() => setPage('reports')}
              label="عرض النتائج" 
              color="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100" 
            />
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-50 dark:border-slate-800">
            <h4 className="font-bold text-gray-700 dark:text-slate-300 mb-4">أداء النظام</h4>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">اكتمال رصد الدرجات</span>
                    <span className="font-bold">75%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[75%]"></div>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                 <div className="p-2 bg-blue-500 text-white rounded-lg">
                   <AlertCircle className="w-4 h-4" />
                 </div>
                 <div className="text-xs">
                   <p className="font-bold text-blue-900 dark:text-blue-400">ملاحظة</p>
                   <p className="text-blue-700 dark:text-blue-500">تأكد من حفظ التغييرات قبل الطباعة</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-4 transition-transform hover:scale-[1.02]">
    <div className={`${color} p-4 rounded-2xl text-white shadow-lg shadow-gray-200 dark:shadow-none`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-400 font-bold">{label}</p>
      <p className="text-3xl font-black text-gray-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

const QuickActionButton = ({ label, color, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full p-4 rounded-xl font-bold text-sm transition-all text-right flex justify-between items-center group ${color}`}
  >
    {label}
    <span className="opacity-0 group-hover:opacity-100 transition-opacity">←</span>
  </button>
);
