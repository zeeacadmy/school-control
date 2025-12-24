
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DB } from '../db';
import { Student, Subject, GradeRecord, Grade } from '../types';
import { getLevel, isIslamicSubject } from '../logic/grading';
import { Save, BookOpen, Percent, Info, AlertCircle, CheckCircle2, Printer, FileDown, UserMinus, LayoutGrid, Loader2, RefreshCcw } from 'lucide-react';

export const Grades: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [settings, setSettings] = useState(DB.getSettings());
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const initialLoadDone = useRef(false);

  const [selectedGrade, setSelectedGrade] = useState<Grade>(Grade.G1);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<1 | 2>(1);

  useEffect(() => {
    setStudents(DB.getStudents());
    const subs = DB.getSubjects();
    setAllSubjects(subs);
    setGrades(DB.getGrades());
    setSettings(DB.getSettings());
    initialLoadDone.current = true;
  }, []);

  const filteredSubjects = useMemo(() => 
    allSubjects.filter(s => s.grade === selectedGrade),
  [allSubjects, selectedGrade]);

  useEffect(() => {
    if (filteredSubjects.length > 0) {
      const exists = filteredSubjects.find(s => s.id === selectedSubject);
      if (!exists) setSelectedSubject(filteredSubjects[0].id);
    } else {
      setSelectedSubject('');
    }
  }, [filteredSubjects, selectedSubject]);

  const currentStudents = useMemo(() => 
    students.filter(s => s.grade === selectedGrade),
  [students, selectedGrade]);

  const currentSubject = filteredSubjects.find(s => s.id === selectedSubject);
  const isSelectedIslamic = currentSubject ? isIslamicSubject(currentSubject.name) : false;

  // منطق الحفظ التلقائي
  useEffect(() => {
    if (!initialLoadDone.current || grades.length === 0) return;

    const timer = setTimeout(() => {
      // التحقق من وجود أخطاء قبل الحفظ التلقائي
      const errors = currentStudents.some(student => {
        const isExempt = student.religion === 'christian' && isSelectedIslamic;
        if (isExempt) return false;
        const record = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubject && g.term === selectedTerm);
        if (!record || record.absent) return false;
        const cErr = !record.continuousAbsent && record.continuous > (currentSubject?.maxContinuous || 0);
        const eErr = !record.examAbsent && record.exam > (currentSubject?.maxExam || 0);
        return cErr || eErr;
      });

      if (!errors) {
        setAutoSaveStatus('saving');
        try {
          DB.saveGrades(grades);
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (e) {
          setAutoSaveStatus('error');
        }
      }
    }, 1500); // الحفظ بعد ثانية ونصف من التوقف عن الكتابة

    return () => clearTimeout(timer);
  }, [grades, selectedSubject, selectedTerm, selectedGrade]);

  const levelStats = useMemo(() => {
    const stats = { 'أ': 0, 'ب': 0, 'ج': 0, 'د': 0, 'هـ': 0 };
    if (!currentSubject) return stats;

    currentStudents.forEach(student => {
      const isExempt = student.religion === 'christian' && isSelectedIslamic;
      if (isExempt) return;

      const record = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubject && g.term === selectedTerm);
      if (!record || record.absent) return;

      const cAbs = record.continuousAbsent;
      const eAbs = record.examAbsent;
      const scoreC = cAbs ? 0 : (record.continuous || 0);
      const scoreE = eAbs ? 0 : (record.exam || 0);
      const total = scoreC + scoreE;
      const maxTotal = currentSubject.maxContinuous + currentSubject.maxExam;
      const level = getLevel(total, maxTotal, currentSubject.levelScale);

      if (level.name === 'ممتاز') stats['أ']++;
      else if (level.name === 'جيد جداً') stats['ب']++;
      else if (level.name === 'جيد') stats['ج']++;
      else if (level.name === 'مقبول') stats['د']++;
      else if (level.name === 'ضعيف') stats['هـ']++;
    });

    return stats;
  }, [currentStudents, grades, selectedSubject, selectedTerm, currentSubject, isSelectedIslamic]);

  const handleGradeChange = (studentId: string, field: 'continuous' | 'exam', value: string) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    const num = sanitizedValue === '' ? 0 : parseFloat(sanitizedValue);
    
    const updated = [...grades];
    const index = updated.findIndex(g => g.studentId === studentId && g.subjectId === selectedSubject && g.term === selectedTerm);
    
    if (index > -1) {
      updated[index] = { ...updated[index], [field]: num };
    } else {
      updated.push({
        studentId,
        subjectId: selectedSubject,
        term: selectedTerm,
        continuous: field === 'continuous' ? num : 0,
        exam: field === 'exam' ? num : 0,
        absent: false,
        continuousAbsent: false,
        examAbsent: false
      });
    }
    setGrades(updated);
  };

  const toggleFieldAbsent = (studentId: string, field: 'continuous' | 'exam' | 'total') => {
    const updated = [...grades];
    const index = updated.findIndex(g => g.studentId === studentId && g.subjectId === selectedSubject && g.term === selectedTerm);
    
    if (index > -1) {
        if (field === 'continuous') updated[index].continuousAbsent = !updated[index].continuousAbsent;
        else if (field === 'exam') updated[index].examAbsent = !updated[index].examAbsent;
        else updated[index].absent = !updated[index].absent;
    } else {
      updated.push({
        studentId,
        subjectId: selectedSubject,
        term: selectedTerm,
        continuous: 0,
        exam: 0,
        absent: field === 'total',
        continuousAbsent: field === 'continuous',
        examAbsent: field === 'exam'
      });
    }
    setGrades(updated);
  };

  const hasErrors = useMemo(() => {
    if (!currentSubject) return false;
    return currentStudents.some(student => {
      const isExempt = student.religion === 'christian' && isSelectedIslamic;
      if (isExempt) return false;

      const record = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubject && g.term === selectedTerm);
      if (!record || record.absent) return false;
      const cErr = !record.continuousAbsent && record.continuous > currentSubject.maxContinuous;
      const eErr = !record.examAbsent && record.exam > currentSubject.maxExam;
      return cErr || eErr;
    });
  }, [currentStudents, grades, currentSubject, selectedSubject, selectedTerm, isSelectedIslamic]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 no-print">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                خيارات الرصد
            </h3>
            {/* حالة الحفظ التلقائي */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black transition-all">
                {autoSaveStatus === 'saving' && <span className="flex items-center gap-1 text-indigo-600"><Loader2 className="w-3 h-3 animate-spin" /> جاري الحفظ تلقائياً...</span>}
                {autoSaveStatus === 'saved' && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> تم الحفظ</span>}
                {autoSaveStatus === 'error' && <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-3 h-3" /> خطأ في الحفظ</span>}
                {autoSaveStatus === 'idle' && <span className="text-gray-400">نظام الحفظ التلقائي نشط</span>}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">الصف الدراسي</label>
            <select className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as Grade)}>
              {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">المادة الدراسية</label>
            <select className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={filteredSubjects.length === 0}>
              {filteredSubjects.length > 0 ? filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">لا توجد مواد</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">الفصل الدراسي</label>
            <select className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold" value={selectedTerm} onChange={(e) => setSelectedTerm(Number(e.target.value) as 1 | 2)}>
              <option value={1}>الأول</option>
              <option value={2}>الثاني</option>
            </select>
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <button 
                onClick={() => { DB.saveGrades(grades); alert('تم الحفظ يدوياً بنجاح'); }} 
                disabled={hasErrors} 
                className={`flex-1 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${hasErrors ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              <Save className="w-5 h-5" />
              حفظ نهائي
            </button>
            <button onClick={() => window.print()} className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors">طباعة</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden no-print animate-in slide-in-from-top-4">
        <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black text-indigo-900">إحصائية المستويات للمادة الحالية</h4>
        </div>
        <table className="w-full text-center border-collapse">
            <thead>
                <tr className="bg-indigo-950 text-white text-[10px]">
                    <th className="py-2 border-l border-indigo-800 font-black">المستوى</th>
                    <th className="py-2 border-l border-indigo-800 font-black bg-emerald-600">أ (ممتاز)</th>
                    <th className="py-2 border-l border-indigo-800 font-black bg-blue-600">ب (جيد جداً)</th>
                    <th className="py-2 border-l border-indigo-800 font-black bg-indigo-600">ج (جيد)</th>
                    <th className="py-2 border-l border-indigo-800 font-black bg-amber-600">د (مقبول)</th>
                    <th className="py-2 font-black bg-red-600">هـ (ضعيف)</th>
                </tr>
            </thead>
            <tbody>
                <tr className="text-lg font-black text-gray-700">
                    <td className="py-3 border-l bg-gray-50 text-[10px] font-bold">العدد</td>
                    <td className="py-3 border-l">{levelStats['أ']}</td>
                    <td className="py-3 border-l">{levelStats['ب']}</td>
                    <td className="py-3 border-l">{levelStats['ج']}</td>
                    <td className="py-3 border-l">{levelStats['د']}</td>
                    <td className="py-3">{levelStats['هـ']}</td>
                </tr>
            </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-black">
        <div className="p-4 bg-indigo-900 text-white flex justify-between items-center no-print">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-300" />
            <span className="font-bold">{selectedGrade} - {currentSubject?.name}</span>
          </div>
          {isSelectedIslamic && <span className="bg-amber-500 text-indigo-950 px-3 py-1 rounded-full text-[10px] font-black">يتم استبعاد الطلاب المسيحيين تلقائياً</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wider border-b print:bg-gray-100 print:text-black">
                <th className="px-6 py-4 font-bold border-l">اسم الطالب</th>
                <th className="px-6 py-4 font-bold text-center border-l">أعمال السنة ({currentSubject?.maxContinuous})</th>
                <th className="px-6 py-4 font-bold text-center border-l">اختبار الفصل ({currentSubject?.maxExam})</th>
                <th className="px-6 py-4 font-bold text-center border-l">المجموع</th>
                <th className="px-6 py-4 font-bold text-center border-l">النسبة %</th>
                <th className="px-6 py-4 font-bold text-center">المستوى</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 print:divide-black">
              {currentStudents.map(student => {
                const isExempt = student.religion === 'christian' && isSelectedIslamic;
                const record = grades.find(g => g.studentId === student.id && g.subjectId === selectedSubject && g.term === selectedTerm);
                
                const cAbs = record?.continuousAbsent;
                const eAbs = record?.examAbsent;
                const tAbs = record?.absent;

                const scoreC = isExempt || cAbs || tAbs ? 0 : (record?.continuous || 0);
                const scoreE = isExempt || eAbs || tAbs ? 0 : (record?.exam || 0);
                const total = scoreC + scoreE;
                const maxTotal = currentSubject ? (currentSubject.maxContinuous + currentSubject.maxExam) : 0;
                const level = getLevel(total, maxTotal, currentSubject?.levelScale);
                const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0';

                const cErr = !isExempt && !tAbs && !cAbs && currentSubject && (record?.continuous ?? 0) > currentSubject.maxContinuous;
                const eErr = !isExempt && !tAbs && !eAbs && currentSubject && (record?.exam ?? 0) > currentSubject.maxExam;

                return (
                  <tr key={student.id} className={`${tAbs ? 'bg-red-50' : isExempt ? 'bg-amber-50/30' : 'hover:bg-gray-50 transition-colors group'}`}>
                    <td className="px-6 py-4 font-bold text-gray-700 border-l">
                      <div className="flex flex-col">
                        <span>{student.name}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{student.section}</span>
                        {isExempt ? (
                          <span className="text-[9px] font-black text-amber-600 mt-1">معفى (مسيحي)</span>
                        ) : (
                          <button onClick={() => toggleFieldAbsent(student.id, 'total')} className={`text-[9px] font-bold w-fit px-2 py-0.5 rounded-md mt-1 no-print transition-all ${tAbs ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}>
                            {tAbs ? 'ملغى الغياب الكلي' : 'رصد غياب كلي'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center border-l relative">
                      {isExempt ? '---' : tAbs || cAbs ? <span className="text-red-600 font-bold block mb-1">غائب</span> : (
                        <div className="relative inline-block">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            placeholder="0"
                            className={`w-20 h-11 border-2 rounded-xl text-center text-lg font-black no-print outline-none transition-all shadow-sm ${cErr ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-100' : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 group-hover:border-gray-300'}`} 
                            value={record?.continuous || ''} 
                            onChange={(e) => handleGradeChange(student.id, 'continuous', e.target.value)} 
                          />
                        </div>
                      )}
                      {!isExempt && !tAbs && (
                        <div className="no-print mt-2 flex items-center justify-center gap-1.5">
                           <input 
                              type="checkbox" 
                              id={`cabs-${student.id}`}
                              checked={!!cAbs} 
                              onChange={() => toggleFieldAbsent(student.id, 'continuous')}
                              className="w-4 h-4 cursor-pointer accent-red-600 rounded-lg"
                           />
                           <label htmlFor={`cabs-${student.id}`} className="text-[9px] text-gray-400 font-black cursor-pointer hover:text-red-500 uppercase">غياب</label>
                        </div>
                      )}
                      {!isExempt && <span className="hidden print:inline font-bold">{tAbs || cAbs ? 'غ' : record?.continuous}</span>}
                    </td>
                    <td className="px-6 py-4 text-center border-l relative">
                      {isExempt ? '---' : tAbs || eAbs ? <span className="text-red-600 font-bold block mb-1">غائب</span> : (
                        <div className="relative inline-block">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            placeholder="0"
                            className={`w-20 h-11 border-2 rounded-xl text-center text-lg font-black no-print outline-none transition-all shadow-sm ${eErr ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-100' : 'border-gray-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 group-hover:border-gray-300'}`} 
                            value={record?.exam || ''} 
                            onChange={(e) => handleGradeChange(student.id, 'exam', e.target.value)} 
                          />
                        </div>
                      )}
                      {!isExempt && !tAbs && (
                        <div className="no-print mt-2 flex items-center justify-center gap-1.5">
                           <input 
                              type="checkbox" 
                              id={`eabs-${student.id}`}
                              checked={!!eAbs} 
                              onChange={() => toggleFieldAbsent(student.id, 'exam')}
                              className="w-4 h-4 cursor-pointer accent-red-600 rounded-lg"
                           />
                           <label htmlFor={`eabs-${student.id}`} className="text-[9px] text-gray-400 font-black cursor-pointer hover:text-red-500 uppercase">غياب</label>
                        </div>
                      )}
                      {!isExempt && <span className="hidden print:inline font-bold">{tAbs || eAbs ? 'غ' : record?.exam}</span>}
                    </td>
                    <td className="px-6 py-4 text-center border-l font-black text-lg text-gray-800">
                      {isExempt ? <span className="text-amber-600">معفى</span> : (tAbs || (cAbs && eAbs)) ? 'غائب' : total}
                    </td>
                    <td className="px-6 py-4 text-center border-l font-black text-indigo-600 bg-indigo-50/20">
                      {isExempt ? '---' : (tAbs || (cAbs && eAbs)) ? '0.0%' : `${percentage}%`}
                    </td>
                    <td className="px-6 py-4 text-center font-black">
                      {isExempt ? <span className="text-amber-600">---</span> : <span className={level.color}>{level.name}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* تنبيه الإخطاء السفلية */}
      {hasErrors && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 no-print z-50">
            <AlertCircle className="w-6 h-6 animate-pulse" />
            <div className="text-sm">
                <p className="font-black">تنبيه: توجد درجات غير صحيحة</p>
                <p className="opacity-90">بعض الدرجات تتجاوز الحد الأقصى للمادة، يرجى المراجعة (الحفظ التلقائي متوقف حالياً).</p>
            </div>
        </div>
      )}
    </div>
  );
};

const Settings2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
