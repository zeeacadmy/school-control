
import React, { useState, useEffect } from 'react';
import { DB } from '../db';
import { Subject, Grade, LevelRange } from '../types';
import { Plus, Trash2, Library, GraduationCap, Scale, Copy, AlertCircle, Settings2, Save, AlertTriangle, Percent, Edit2, X, ChevronDown, ChevronUp, Layers, BookOpen, CheckCircle2 } from 'lucide-react';

const DEFAULT_LEVEL_SCALE: LevelRange[] = [
  { name: 'ممتاز', minPercent: 90, color: 'text-emerald-600' },
  { name: 'جيد جداً', minPercent: 80, color: 'text-blue-600' },
  { name: 'جيد', minPercent: 65, color: 'text-indigo-600' },
  { name: 'مقبول', minPercent: 50, color: 'text-amber-600' },
  { name: 'ضعيف', minPercent: 0, color: 'text-red-600' },
];

export const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [showScalePreview, setShowScalePreview] = useState(false);
  
  const [newSubject, setNewSubject] = useState<Partial<Subject>>({
    name: '',
    grade: Grade.G1,
    maxContinuous: 40,
    maxExam: 60,
    passPercentage: 50,
    levelScale: JSON.parse(JSON.stringify(DEFAULT_LEVEL_SCALE))
  });

  const [copyFrom, setCopyFrom] = useState<Grade>(Grade.G1);
  const [copyTo, setCopyTo] = useState<Grade>(Grade.G2);

  useEffect(() => {
    setSubjects(DB.getSubjects());
  }, []);

  const handleAdd = () => {
    if (!newSubject.name?.trim()) {
      alert('يرجى إدخال اسم المادة');
      return;
    }
    const updated = [...subjects, { ...newSubject, id: Date.now().toString() } as Subject];
    setSubjects(updated);
    DB.saveSubjects(updated);
    setNewSubject({ 
      ...newSubject, 
      name: '', 
      passPercentage: 50,
      levelScale: JSON.parse(JSON.stringify(DEFAULT_LEVEL_SCALE))
    });
    setShowScalePreview(false);
    alert('تم إضافة المادة بنجاح');
  };

  const handleUpdate = () => {
    if (!editSubject || !editSubject.name.trim()) return;
    const updated = subjects.map(s => s.id === editSubject.id ? editSubject : s);
    setSubjects(updated);
    DB.saveSubjects(updated);
    setEditSubject(null);
  };

  const confirmDelete = () => {
    if (!deleteConfirmation) return;
    const updated = subjects.filter(s => s.id !== deleteConfirmation.id);
    setSubjects(updated);
    DB.saveSubjects(updated);
    setDeleteConfirmation(null);
  };

  const handleUpdateSubjectField = (id: string, field: keyof Subject, value: any) => {
    const updated = subjects.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSubjects(updated);
    DB.saveSubjects(updated);
  };

  const handleCopyScale = () => {
    const sourceSubjects = subjects.filter(s => s.grade === copyFrom);
    if (sourceSubjects.length === 0) {
      alert('الصف المختار كمصدر لا يحتوي على مواد لنسخها');
      return;
    }
    if (confirm(`هل تريد نسخ جميع مواد ${copyFrom} إلى ${copyTo}؟ سيتم إضافة المواد الجديدة للسلم.`)) {
      const newClonedSubjects: Subject[] = sourceSubjects.map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9) + Date.now(),
        grade: copyTo
      }));
      const updated = [...subjects, ...newClonedSubjects];
      setSubjects(updated);
      DB.saveSubjects(updated);
      alert('تم نسخ سلم الدرجات بنجاح');
    }
  };

  const updateSubjectScale = (subjectId: string, newScale: LevelRange[]) => {
    const updated = subjects.map(s => s.id === subjectId ? { ...s, levelScale: newScale } : s);
    setSubjects(updated);
    DB.saveSubjects(updated);
  };

  const updateNewSubjectScale = (idx: number, field: 'name' | 'minPercent', value: string | number) => {
    const newScale = [...(newSubject.levelScale || [])];
    newScale[idx] = { ...newScale[idx], [field]: value };
    setNewSubject({ ...newSubject, levelScale: newScale });
  };

  const totalMax = (newSubject.maxContinuous || 0) + (newSubject.maxExam || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">تأكيد حذف المادة</h3>
              <p className="text-gray-500 leading-relaxed mb-8">
                هل أنت متأكد من حذف مادة <span className="font-bold text-red-600">"{deleteConfirmation.name}"</span>؟ 
                <br />
                <span className="text-sm">سيتم حذف جميع الدرجات المرتبطة بهذه المادة نهائياً من سجلات الطلاب.</span>
              </p>
              <div className="flex flex-row-reverse gap-3 w-full">
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100"
                >
                  نعم، احذف المادة
                </button>
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200 border border-indigo-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-indigo-600" />
                تعديل بيانات المادة
              </h3>
              <button onClick={() => setEditSubject(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">اسم المادة</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  value={editSubject.name}
                  onChange={(e) => setEditSubject({...editSubject, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">الصف الدراسي</label>
                <select 
                  className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
                  value={editSubject.grade}
                  onChange={(e) => setEditSubject({...editSubject, grade: e.target.value as Grade})}
                >
                  {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">أعمال (Max)</label>
                  <input 
                    type="number" 
                    className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-black"
                    value={editSubject.maxContinuous}
                    onChange={(e) => setEditSubject({...editSubject, maxContinuous: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">امتحان (Max)</label>
                  <input 
                    type="number" 
                    className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-black"
                    value={editSubject.maxExam}
                    onChange={(e) => setEditSubject({...editSubject, maxExam: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">نجاح %</label>
                  <input 
                    type="number" 
                    className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-center font-black text-indigo-600"
                    value={editSubject.passPercentage}
                    onChange={(e) => setEditSubject({...editSubject, passPercentage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  onClick={handleUpdate}
                  className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  حفظ التعديلات
                </button>
                <button 
                  onClick={() => setEditSubject(null)}
                  className="px-8 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Advanced Subject Creation Form */}
        <div className="flex-1 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-indigo-50/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -z-0 opacity-40"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                        <Plus className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">إضافة مادة دراسية جديدة</h3>
                        <p className="text-xs text-gray-400 font-bold">تحديد الحدود القصوى وسلم التقييم</p>
                    </div>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl border border-indigo-100">
                   <span className="text-[10px] font-black uppercase tracking-widest block text-center mb-0.5 opacity-60">المجموع الكلي</span>
                   <span className="text-xl font-black block text-center leading-none">{totalMax}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 mr-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> اسم المادة
                </label>
                <input 
                  type="text" 
                  placeholder="مثال: اللغة العربية، الرياضيات..." 
                  className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 mr-2 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> الصف الدراسي
                </label>
                <select 
                  className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white font-bold transition-all"
                  value={newSubject.grade}
                  onChange={(e) => setNewSubject({...newSubject, grade: e.target.value as Grade})}
                >
                  {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-emerald-600 text-center block uppercase tracking-tighter">أعمال السنة (Max)</label>
                <div className="relative">
                    <input 
                        type="number" 
                        className="w-full bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-center font-black text-xl text-emerald-700"
                        value={newSubject.maxContinuous}
                        onChange={(e) => setNewSubject({...newSubject, maxContinuous: parseInt(e.target.value) || 0})}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-600 text-center block uppercase tracking-tighter">الامتحان النهائي (Max)</label>
                <input 
                  type="number" 
                  className="w-full bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-center font-black text-xl text-blue-700"
                  value={newSubject.maxExam}
                  onChange={(e) => setNewSubject({...newSubject, maxExam: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-600 text-center block uppercase tracking-tighter">نسبة النجاح %</label>
                <div className="relative group">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                    <input 
                        type="number" 
                        className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-center font-black text-xl text-indigo-700"
                        value={newSubject.passPercentage}
                        onChange={(e) => setNewSubject({...newSubject, passPercentage: parseInt(e.target.value) || 0})}
                    />
                </div>
              </div>
            </div>

            {/* Interactive Scale Section */}
            <div className="mb-8">
                <button 
                    onClick={() => setShowScalePreview(!showScalePreview)}
                    className="flex items-center justify-between w-full bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <Scale className={`w-5 h-5 ${showScalePreview ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                        <span className={`font-black text-sm ${showScalePreview ? 'text-indigo-700' : 'text-gray-500 group-hover:text-indigo-600'}`}>تخصيص سلم مستويات التقييم</span>
                    </div>
                    {showScalePreview ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {showScalePreview && (
                    <div className="mt-4 p-6 bg-white border-2 border-indigo-100 rounded-3xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-black text-indigo-900 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> تخصيص نسب المستويات (النسبة المئوية %)
                            </h4>
                            <button 
                                onClick={() => setNewSubject({ ...newSubject, levelScale: JSON.parse(JSON.stringify(DEFAULT_LEVEL_SCALE)) })}
                                className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 transition-colors"
                            >
                                استعادة الافتراضي
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(newSubject.levelScale || []).map((range, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 transition-all hover:border-indigo-100">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${range.color} bg-white shadow-sm border border-gray-100`}>
                                        {idx + 1}
                                    </div>
                                    <input 
                                        className="flex-1 bg-transparent border-none outline-none font-black text-sm text-gray-700 focus:ring-0" 
                                        value={range.name} 
                                        onChange={(e) => updateNewSubjectScale(idx, 'name', e.target.value)}
                                        placeholder="اسم المستوى"
                                    />
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
                                        <span className="text-[10px] font-black text-gray-400">%</span>
                                        <input 
                                            type="number" 
                                            className="w-10 bg-transparent text-center font-black text-indigo-600 outline-none" 
                                            value={range.minPercent} 
                                            onChange={(e) => updateNewSubjectScale(idx, 'minPercent', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <button 
              onClick={handleAdd} 
              className="w-full bg-indigo-600 text-white rounded-2xl font-black py-5 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 text-lg"
            >
              <CheckCircle2 className="w-6 h-6" />
              تأكيد وإضافة المادة للنظام
            </button>
          </div>
        </div>

        {/* Improved Clone Tool */}
        <div className="w-full xl:w-96 bg-indigo-950 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white opacity-5 rounded-full"></div>
          
          <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                    <Copy className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="text-xl font-black">أدوات النسخ السريع</h3>
            </div>
            
            <p className="text-sm text-indigo-200 mb-8 leading-relaxed font-bold">
              هل تريد اختصار الوقت؟ يمكنك نسخ كامل هيكل المواد وتوزيع درجاتها من صف إلى صف آخر بسهولة.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-indigo-400 mr-2 tracking-widest">المصدر (من صف)</label>
                <select 
                  className="w-full bg-indigo-900/50 border-2 border-white/10 rounded-2xl p-4 font-black outline-none focus:ring-4 focus:ring-white/5 transition-all"
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value as Grade)}
                >
                  {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-black text-indigo-400 mr-2 tracking-widest">الوجهة (إلى صف)</label>
                <select 
                  className="w-full bg-indigo-900/50 border-2 border-white/10 rounded-2xl p-4 font-black outline-none focus:ring-4 focus:ring-white/5 transition-all"
                  value={copyTo}
                  onChange={(e) => setCopyTo(e.target.value as Grade)}
                >
                  {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCopyScale}
            className="mt-10 w-full bg-white text-indigo-950 rounded-2xl font-black py-4 hover:bg-indigo-50 transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
          >
            بدء عملية الاستنساخ
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Improved Subjects Scale Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-indigo-50/20 overflow-hidden animate-in slide-in-from-bottom-6 duration-700">
        <div className="p-8 bg-gray-50/50 border-b flex items-center justify-between">
           <div className="flex items-center gap-4">
               <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                    <Scale className="w-6 h-6" />
               </div>
               <div>
                    <h3 className="text-xl font-black text-gray-800">هيكل المواد والحدود القصوى</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">سجل المواد المسجلة في النظام</p>
               </div>
           </div>
           <div className="flex items-center gap-3 text-xs text-indigo-600 bg-white px-5 py-2.5 rounded-2xl border border-indigo-50 shadow-sm font-black">
             <AlertCircle className="w-4 h-4" />
             تعديل القيم متاح مباشرة في الجدول
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-widest border-b">
                <th className="px-8 py-6 font-black border-l">اسم المادة</th>
                <th className="px-6 py-6 font-black text-center border-l">أعمال السنة (Max)</th>
                <th className="px-6 py-6 font-black text-center border-l">الامتحان (Max)</th>
                <th className="px-6 py-6 font-black text-center border-l">المجموع</th>
                <th className="px-6 py-6 font-black text-center border-l">النجاح %</th>
                <th className="px-6 py-6 font-black text-center border-l">تخصيص السلم</th>
                <th className="px-8 py-6 no-print text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {Object.values(Grade).map(grade => {
                const gradeSubjects = subjects.filter(s => s.grade === grade);
                if (gradeSubjects.length === 0) return null;

                return (
                  <React.Fragment key={grade}>
                    <tr className="bg-indigo-50/40">
                      <td colSpan={7} className="px-8 py-4 font-black text-indigo-900 flex items-center gap-3 border-y border-indigo-100">
                         <GraduationCap className="w-5 h-5 text-indigo-500" />
                         <span className="text-lg">{grade}</span>
                         <span className="text-[10px] bg-white text-indigo-400 px-3 py-1 rounded-full shadow-sm border border-indigo-50">إجمالي المواد: {gradeSubjects.length}</span>
                      </td>
                    </tr>
                    {gradeSubjects.map(subject => (
                      <tr key={subject.id} className="hover:bg-indigo-50/10 transition-colors group">
                        <td className="px-8 py-5 font-black text-gray-700 text-lg">{subject.name}</td>
                        <td className="px-6 py-5 text-center border-l">
                          <input 
                            type="number"
                            className="w-20 bg-emerald-50/50 border-2 border-transparent hover:border-emerald-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2 text-center font-black text-emerald-700 transition-all outline-none"
                            value={subject.maxContinuous}
                            onChange={(e) => handleUpdateSubjectField(subject.id, 'maxContinuous', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-5 text-center border-l">
                          <input 
                            type="number"
                            className="w-20 bg-blue-50/50 border-2 border-transparent hover:border-blue-200 focus:border-blue-500 focus:bg-white rounded-xl py-2 text-center font-black text-blue-700 transition-all outline-none"
                            value={subject.maxExam}
                            onChange={(e) => handleUpdateSubjectField(subject.id, 'maxExam', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-6 py-5 text-center border-l font-black text-gray-800 text-xl">
                          {subject.maxContinuous + subject.maxExam}
                        </td>
                        <td className="px-6 py-5 text-center border-l">
                           <div className="inline-flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                            <input 
                              type="number"
                              className="w-10 bg-transparent text-center font-black text-indigo-700 outline-none"
                              value={subject.passPercentage ?? 50}
                              onChange={(e) => handleUpdateSubjectField(subject.id, 'passPercentage', parseInt(e.target.value) || 0)}
                            />
                            <span className="text-[10px] text-indigo-300 font-black">%</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-center border-l">
                          <button 
                            onClick={() => setEditingScaleId(editingScaleId === subject.id ? null : subject.id)}
                            className={`text-xs px-5 py-2.5 rounded-2xl border transition-all font-black flex items-center gap-2 mx-auto shadow-sm ${
                              editingScaleId === subject.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'
                            }`}
                          >
                            <Settings2 className="w-4 h-4" />
                            تخصيص السلم
                          </button>
                          {editingScaleId === subject.id && (
                            <div className="mt-4 p-6 bg-white rounded-3xl border border-indigo-100 text-right animate-in zoom-in-95 duration-200 absolute z-10 left-1/2 -translate-x-1/2 shadow-2xl min-w-[350px]">
                               <div className="flex justify-between items-center mb-6 border-b pb-4">
                                 <div className="flex items-center gap-2">
                                     <Layers className="w-4 h-4 text-indigo-600" />
                                     <p className="text-[10px] font-black text-gray-800 uppercase">تعديل مستويات مادة {subject.name}:</p>
                                 </div>
                                 <button onClick={() => setEditingScaleId(null)} className="p-1.5 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <X className="w-4 h-4" />
                                 </button>
                               </div>
                               <div className="space-y-3">
                                  {(subject.levelScale || DEFAULT_LEVEL_SCALE).map((range, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-all">
                                       <span className="text-[10px] text-gray-400 font-black min-w-[40px]">{idx+1}</span>
                                       <input 
                                         className="flex-1 bg-transparent text-sm font-black text-gray-700 outline-none focus:ring-0" 
                                         value={range.name} 
                                         onChange={(e) => {
                                           const newScale = [...(subject.levelScale || DEFAULT_LEVEL_SCALE)];
                                           newScale[idx] = { ...newScale[idx], name: e.target.value };
                                           updateSubjectScale(subject.id, newScale);
                                         }}
                                       />
                                       <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
                                          <span className="text-[10px] font-black text-indigo-300">%</span>
                                          <input 
                                            type="number" 
                                            className="w-10 text-xs font-black bg-transparent outline-none text-center text-indigo-600" 
                                            value={range.minPercent} 
                                            onChange={(e) => {
                                              const newScale = [...(subject.levelScale || DEFAULT_LEVEL_SCALE)];
                                              newScale[idx] = { ...newScale[idx], minPercent: parseInt(e.target.value) || 0 };
                                              updateSubjectScale(subject.id, newScale);
                                            }}
                                          />
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-5 no-print text-center">
                          <div className="flex gap-3 justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-95">
                            <button 
                              onClick={() => setEditSubject(subject)}
                              className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl border border-indigo-100 transition-all shadow-sm"
                              title="تعديل بيانات المادة"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmation({ id: subject.id, name: subject.name })}
                              className="p-3 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl border border-red-100 transition-all shadow-sm"
                              title="حذف المادة من السجل"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
