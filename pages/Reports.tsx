
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Grade, Student, Subject, GradeRecord, SchoolSettings } from '../types';
import { calculateStudentStatus, DetailedReportData } from '../logic/grading';
import { Printer, FileDown, Percent, FileText, BarChart3, Award, Download, LayoutGrid, Users, ShieldAlert, Loader2, MessageCircle, Sparkles, Brain, X, Share2, Edit3, CheckSquare, Square, Settings2, Search, Filter, Trophy, Star, Medal } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type ReportTerm = 1 | 2 | 'final';
type ReportType = 'table' | 'cards' | 'stats' | 'subject_stats' | 'failures' | 'honor_roll';

interface ExtendedResult extends DetailedReportData {
  termSpecificStatus: string;
  failureDetails: { subject: Subject, reason: string, type: 't1' | 't2' | 'both' | 'absent' }[];
  retakeCategory: 't1' | 't2' | 'both' | 'none';
  rank?: number;
  rankText?: string;
}

const getRankArabic = (rank: number) => {
  const ranks = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
  return ranks[rank - 1] || `${rank}`;
};

export const Reports: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<Grade>(Grade.G1);
  const [selectedTerm, setSelectedTerm] = useState<ReportTerm>('final');
  const [reportType, setReportType] = useState<ReportType>('table');
  const [viewMode, setViewMode] = useState<'all' | 'top' | 'failed'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  // AI States
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ studentId: string, text: string } | null>(null);

  // Retake Customization States
  const [retakeOverrides, setRetakeOverrides] = useState<Record<string, string[]>>({}); // studentId -> list of subjectIds to INCLUDE in retake
  const [editingRetakeStudent, setEditingRetakeStudent] = useState<ExtendedResult | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [settings, setSettings] = useState(DB.getSettings());

  useEffect(() => {
    setStudents(DB.getStudents());
    setAllSubjects(DB.getSubjects());
    setGrades(DB.getGrades());
    setSettings(DB.getSettings());
    
    // Load retake overrides from localStorage if any
    const savedOverrides = localStorage.getItem('scs_retake_overrides');
    if (savedOverrides) setRetakeOverrides(JSON.parse(savedOverrides));
  }, []);

  useEffect(() => {
    localStorage.setItem('scs_retake_overrides', JSON.stringify(retakeOverrides));
  }, [retakeOverrides]);

  const gradeSubjects = useMemo(() => 
    allSubjects.filter(s => s.grade === selectedGrade),
  [allSubjects, selectedGrade]);

  const allResults = useMemo(() => {
    const gradeStudents = students.filter(s => s.grade === selectedGrade);
    return gradeStudents.map(student => calculateStudentStatus(student, gradeSubjects, grades));
  }, [selectedGrade, students, gradeSubjects, grades]);

  // Helper to get processed results for any grade
  const getProcessedResultsForGrade = (grade: Grade, term: ReportTerm): ExtendedResult[] => {
    const subjectsForGrade = allSubjects.filter(s => s.grade === grade);
    const studentsForGrade = students.filter(s => s.grade === grade);
    const results = studentsForGrade.map(student => calculateStudentStatus(student, subjectsForGrade, grades));

    let processed = results.map(r => {
        let termSpecificStatus: string = r.finalStatus;
        let failureDetails: { subject: Subject, reason: string, type: 't1' | 't2' | 'both' | 'absent' }[] = [];
        
        r.subjects.forEach(s => {
          if (s.status === 'fail_t1') failureDetails.push({ subject: s.subject, reason: 'فصل أول', type: 't1' });
          else if (s.status === 'fail_t2') failureDetails.push({ subject: s.subject, reason: 'فصل ثاني', type: 't2' });
          else if (s.status === 'fail_both') failureDetails.push({ subject: s.subject, reason: 'الفصلين', type: 'both' });
          else if (s.status === 'fail_absent') failureDetails.push({ subject: s.subject, reason: 'غياب', type: 'absent' });
        });

        if (term === 1) {
            const hasT1Failure = r.term1Results.some(ts => ts.status === 'fail' || ts.status === 'absent');
            termSpecificStatus = hasT1Failure ? 'دور ثاني' : 'ناجح';
        } else if (term === 2) {
            const hasT2Failure = r.term2Results.some(ts => ts.status === 'fail' || ts.status === 'absent');
            termSpecificStatus = hasT2Failure ? 'دور ثاني' : 'ناجح';
        } else {
            termSpecificStatus = r.finalStatus;
        }

        return { ...r, termSpecificStatus, failureDetails, retakeCategory: 'none' as const };
    });

    const sortedForRank = [...processed].sort((a, b) => {
        const percA = term === 1 ? a.term1Percentage : term === 2 ? a.term2Percentage : a.finalPercentage;
        const percB = term === 1 ? b.term1Percentage : term === 2 ? b.term2Percentage : b.finalPercentage;
        return percB - percA;
    });

    return processed.map(res => {
        const perc = term === 1 ? res.term1Percentage : term === 2 ? res.term2Percentage : res.finalPercentage;
        const rank = sortedForRank.findIndex(s => {
            const sPerc = term === 1 ? s.term1Percentage : term === 2 ? s.term2Percentage : s.finalPercentage;
            return sPerc === perc;
        }) + 1;
        return { ...res, rank, rankText: getRankArabic(rank) };
    });
  };

  const termProcessedResults = useMemo(() => 
    getProcessedResultsForGrade(selectedGrade, selectedTerm), 
  [allResults, selectedTerm, retakeOverrides]);

  const filteredResults = useMemo((): ExtendedResult[] => {
    let base = [...termProcessedResults];

    if (viewMode === 'top') {
        return base
          .filter(r => r.termSpecificStatus === 'ناجح')
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
          .slice(0, 10);
    } else if (viewMode === 'failed') {
        return base.filter(r => r.termSpecificStatus === 'دور ثاني' || (retakeOverrides[r.student.id] && retakeOverrides[r.student.id].length > 0));
    }
    return base;
  }, [termProcessedResults, viewMode, retakeOverrides]);

  const honorRollData = useMemo(() => {
    if (reportType !== 'honor_roll') return [];
    return Object.values(Grade).map(grade => {
      const topStudents = getProcessedResultsForGrade(grade, selectedTerm)
        .filter(r => r.termSpecificStatus === 'ناجح')
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        .slice(0, 5);
      return { grade, topStudents };
    }).filter(g => g.topStudents.length > 0);
  }, [reportType, students, allSubjects, grades, selectedTerm]);

  const handleAIAnalysis = async (studentResult: ExtendedResult) => {
    setAiAnalyzing(studentResult.student.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `أنت مستشار تربوي ذكي. قم بتحليل درجات الطالب التالي في الصف ${studentResult.student.grade}:
      الاسم: ${studentResult.student.name}
      المعدل العام: ${studentResult.finalPercentage.toFixed(1)}%
      الديانة: ${studentResult.student.religion === 'muslim' ? 'مسلم' : 'مسيحي'}
      المواد والنتائج: ${studentResult.subjects.map(s => `${s.subject.name}: ${s.total}`).join(', ')}
      الحالة: ${studentResult.termSpecificStatus}
      
      المطلوب: قدم تحليل موجز (3 أسطر كحد أقصى) لنقاط القوة والضعف وتوصية واحدة مخصصة للطالب أو ولي أمره باللغة العربية بأسلوب مشجع ومحفز.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { temperature: 0.7 }
      });

      setAiResult({ studentId: studentResult.student.id, text: response.text || 'تعذر التحليل حالياً' });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالذكاء الاصطناعي');
    } finally {
      setAiAnalyzing(null);
    }
  };

  const toggleRetakeSubject = (studentId: string, subjectId: string) => {
    const current = retakeOverrides[studentId] || allResults.find(r => r.student.id === studentId)?.subjects.filter(s => s.status !== 'pass' && s.status !== 'exempt').map(s => s.subject.id) || [];
    const updated = current.includes(subjectId) ? current.filter(id => id !== subjectId) : [...current, subjectId];
    setRetakeOverrides({ ...retakeOverrides, [studentId]: updated });
  };

  const shareOnWhatsApp = (res: ExtendedResult) => {
    const retakeText = res.failureDetails.length > 0 ? `%0Aالمواد المطلوبة: ${res.failureDetails.map(f => f.subject.name).join(' - ')}` : '';
    const text = `*إشعار نتيجة طالب - ${settings.schoolName}*%0A%0Aالطالب: ${res.student.name}%0Aالصف: ${res.student.grade}%0Aالمعدل العام: ${res.finalPercentage.toFixed(1)}%%0Aالنتيجة: *${res.termSpecificStatus}*${retakeText}%0A%0Aتمنياتنا لكم بمزيد من التوفيق.`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Retake Management Modal (Same as before) */}
      {editingRetakeStudent && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl max-w-lg w-full border border-indigo-100 dark:border-slate-800">
                  <div className="p-6 bg-indigo-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center">
                      <div>
                          <h4 className="font-black text-indigo-900 dark:text-white">تخصيص مواد الدور الثاني</h4>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{editingRetakeStudent.student.name}</p>
                      </div>
                      <button onClick={() => setEditingRetakeStudent(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all">
                          <X className="w-6 h-6 text-indigo-400" />
                      </button>
                  </div>
                  <div className="p-8 space-y-4">
                      <p className="text-xs text-gray-500 font-bold mb-4">اختر المواد التي ترغب في إظهارها في تقرير الدور الثاني لهذا الطالب:</p>
                      <div className="grid grid-cols-1 gap-2">
                          {allResults.find(r => r.student.id === editingRetakeStudent.student.id)?.subjects.filter(s => s.status !== 'pass' && s.status !== 'exempt').map(subj => {
                              const isSelected = (retakeOverrides[editingRetakeStudent.student.id] || []).length > 0 
                                ? retakeOverrides[editingRetakeStudent.student.id].includes(subj.subject.id)
                                : true;
                                
                              return (
                                  <button 
                                      key={subj.subject.id}
                                      onClick={() => toggleRetakeSubject(editingRetakeStudent.student.id, subj.subject.id)}
                                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                  >
                                      <div className="flex items-center gap-3">
                                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                          <span className="font-black">{subj.subject.name}</span>
                                      </div>
                                      <span className="text-[10px] font-bold opacity-60">الدرجة: {subj.total}</span>
                                  </button>
                              );
                          })}
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-slate-800/30 border-t dark:border-slate-800 flex justify-center">
                      <button onClick={() => setEditingRetakeStudent(null)} className="bg-indigo-600 text-white font-black px-12 py-3 rounded-2xl hover:bg-indigo-700 shadow-xl transition-all">اعتماد التخصيص</button>
                  </div>
              </div>
          </div>
      )}

      {/* UI Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl no-print space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
            <div className="flex flex-wrap items-center gap-4">
                {reportType !== 'honor_roll' && (
                  <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2">الصف الدراسي</span>
                      <select className="bg-gray-50 dark:bg-slate-950 border-none p-3 rounded-2xl min-w-[200px] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 dark:text-slate-200 shadow-sm" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as Grade)}>
                          {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2">الفترة الزمنية</span>
                    <div className="flex bg-gray-50 dark:bg-slate-950 p-1.5 rounded-2xl shadow-sm border dark:border-slate-800">
                        <ReportTermButton active={selectedTerm === 1} onClick={() => setSelectedTerm(1)} label="فصل 1" />
                        <ReportTermButton active={selectedTerm === 2} onClick={() => setSelectedTerm(2)} label="فصل 2" />
                        <ReportTermButton active={selectedTerm === 'final'} onClick={() => setSelectedTerm('final')} label="النهائي" />
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                <div className="flex bg-gray-100 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800">
                    <button onClick={() => setReportType('table')} className={`p-2.5 rounded-xl transition-all ${reportType === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-gray-400'}`} title="كشف إجمالي"><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setReportType('cards')} className={`p-2.5 rounded-xl transition-all ${reportType === 'cards' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-gray-400'}`} title="شهادات الطلاب"><FileText className="w-5 h-5" /></button>
                    <button onClick={() => setReportType('honor_roll')} className={`p-2.5 rounded-xl transition-all ${reportType === 'honor_roll' ? 'bg-white dark:bg-slate-800 shadow-sm text-amber-500' : 'text-gray-400'}`} title="لوحة الشرف"><Award className="w-5 h-5" /></button>
                </div>
                <button onClick={() => window.print()} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                    <Printer className="w-5 h-5" />
                    طباعة التقارير
                </button>
            </div>
        </div>
      </div>

      <div className="print-container" ref={reportContentRef}>
        {/* Honor Roll View */}
        {reportType === 'honor_roll' && (
          <div className="space-y-12">
            {honorRollData.map(({ grade, topStudents }) => (
              <div key={grade} className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-950 shadow-sm page-break relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0"></div>
                
                <div className="relative z-10">
                  <ReportHeader settings={settings} title="لوحة شرف المتفوقين" grade={grade} term={selectedTerm} hideExtra={true} />
                  
                  <div className="flex justify-center mb-8">
                     <div className="flex items-center gap-3 bg-indigo-900 text-white px-8 py-3 rounded-2xl shadow-xl">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <span className="text-lg font-black tracking-widest uppercase">أوائل الطلبة</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {topStudents.map((res, idx) => (
                      <div key={res.student.id} className={`p-6 rounded-3xl border-2 flex flex-col items-center text-center transition-all ${
                        idx === 0 ? 'bg-amber-50 border-amber-200 shadow-lg scale-110 md:z-20' : 
                        idx === 1 ? 'bg-slate-50 border-slate-200' :
                        idx === 2 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <div className="mb-4 relative">
                          <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden bg-white ${
                            idx === 0 ? 'border-amber-400' : idx === 1 ? 'border-slate-300' : 'border-orange-300'
                          }`}>
                            {res.student.photoUrl ? (
                              <img src={res.student.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-8 h-8 text-gray-200" />
                            )}
                          </div>
                          <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-black text-white ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-indigo-600'
                          }`}>
                            {idx + 1}
                          </div>
                        </div>
                        
                        <h4 className="text-sm font-black text-gray-800 h-10 flex items-center mb-2">{res.student.name}</h4>
                        
                        <div className="w-full h-px bg-gray-200 mb-3"></div>
                        
                        <div className="space-y-1">
                          <p className="text-[10pt] font-black text-indigo-700">{(selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</p>
                          <p className={`text-[8pt] font-bold ${idx === 0 ? 'text-amber-600' : 'text-gray-400'}`}>{getRankArabic(idx + 1)}</p>
                        </div>
                        
                        {idx === 0 && <Medal className="w-6 h-6 text-amber-500 mt-4 animate-bounce" />}
                      </div>
                    ))}
                  </div>

                  {/* Summary Table for Top 5 */}
                  <div className="mt-12 overflow-hidden rounded-3xl border-2 border-black">
                     <table className="w-full text-right">
                        <thead>
                          <tr className="bg-indigo-950 text-white text-[10pt]">
                            <th className="p-3 border-l border-white/20">المركز</th>
                            <th className="p-3 border-l border-white/20">اسم الطالب</th>
                            <th className="p-3 border-l border-white/20 text-center">المعدل العام</th>
                            <th className="p-3 text-center">النتيجة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                          {topStudents.map((res, idx) => (
                            <tr key={res.student.id} className={idx === 0 ? 'bg-amber-50/50' : ''}>
                              <td className="p-3 font-black text-indigo-900">{getRankArabic(idx + 1)}</td>
                              <td className="p-3 font-black">{res.student.name}</td>
                              <td className="p-3 text-center font-black">{(selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</td>
                              <td className="p-3 text-center font-bold text-emerald-600">متفوق</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                  </div>

                  <ReportFooter settings={settings} />
                </div>
              </div>
            ))}
            {honorRollData.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <Star className="w-16 h-16 text-amber-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold">لم يتم العثور على طلاب ناجحين لإدراجهم في لوحة الشرف للعام الحالي.</p>
              </div>
            )}
          </div>
        )}

        {reportType === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block">
                {filteredResults.map((res: ExtendedResult) => (
                <div key={res.student.id} className="grade-card bg-white p-8 mb-4 rounded-3xl border-2 border-black shadow-sm print:shadow-none print:m-0 print:mb-8 relative overflow-hidden page-break transition-all">
                    <ReportHeader settings={settings} title="شهادة تقييم مستوى طالب" grade={selectedGrade} term={selectedTerm} />
                    
                    <div className="flex gap-6 mb-6">
                        <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-black overflow-hidden flex-shrink-0">
                            {res.student.photoUrl ? <img src={res.student.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-gray-300">صورة الطالب</div>}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-black rounded-2xl text-[9pt]">
                            <div><p className="text-[8px] text-gray-500 font-bold">اسم الطالب</p><p className="font-black text-black">{res.student.name}</p></div>
                            <div className="text-left"><p className="text-[8px] text-gray-500 font-bold">رقم الجلوس</p><p className="font-black text-black">{res.student.seatingNumber || '---'}</p></div>
                            <div><p className="text-[8px] text-gray-500 font-bold">الصف</p><p className="font-black text-black">{res.student.grade} ({res.student.section})</p></div>
                            <div className="text-left"><p className="text-[8px] text-gray-500 font-bold">المرتبة</p><p className="font-black text-black">الـ {res.rankText}</p></div>
                        </div>
                        <div className="w-24 h-24 flex-shrink-0 border border-black p-2 flex flex-col items-center justify-center bg-white rounded-2xl">
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Student:${res.student.id}-Result:${res.termSpecificStatus}`} alt="QR" className="w-full h-full p-1" />
                             <span className="text-[6px] font-bold mt-1">رمز التحقق</span>
                        </div>
                    </div>

                    <div className="no-print flex gap-2 mb-6">
                        {res.termSpecificStatus === 'دور ثاني' && (
                            <button onClick={() => setEditingRetakeStudent(res)} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white py-2 rounded-xl text-xs font-black hover:bg-amber-600 shadow-md shadow-amber-100 transition-all active:scale-95">
                                <Edit3 className="w-4 h-4" /> تخصيص مواد الملحق
                            </button>
                        )}
                        <button onClick={() => shareOnWhatsApp(res)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-xl text-xs font-black hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95">
                            <MessageCircle className="w-4 h-4" /> إرسال عبر واتساب
                        </button>
                    </div>

                    {res.failureDetails.length > 0 && res.termSpecificStatus === 'دور ثاني' && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-black rounded-2xl">
                            <h5 className="text-[10pt] font-black text-red-900 mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> مطلوب إعادة التقييم في المواد التالية:</h5>
                            <div className="flex flex-wrap gap-2">
                                {res.failureDetails.map((fd, i) => (
                                    <span key={i} className="px-3 py-1 bg-white border border-black font-black text-[9pt]">{fd.subject.name} ({fd.reason})</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <CertificateTable res={res} subjects={gradeSubjects} term={selectedTerm} />
                    <ReportFooter settings={settings} />
                </div>
                ))}
            </div>
        )}
        
        {reportType === 'table' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8 print:p-0 print:border-none">
                <ReportHeader settings={settings} title="كشف النتائج الإجمالي" grade={selectedGrade} term={selectedTerm} hideExtra={true} />
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-[9pt]">
                        <thead className="bg-gray-100 font-black">
                            <tr>
                                <th className="p-3 border border-black">م</th>
                                <th className="p-3 border border-black">رقم الجلوس</th>
                                <th className="p-3 border border-black">الاسم</th>
                                {gradeSubjects.map(s => <th key={s.id} className="p-3 border border-black text-center">{s.name}</th>)}
                                <th className="p-3 border border-black text-center">المعدل</th>
                                <th className="p-3 border border-black text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((res, i) => (
                                <tr key={res.student.id} className="hover:bg-gray-50">
                                    <td className="p-2 border border-black text-center">{i + 1}</td>
                                    <td className="p-2 border border-black text-center font-black">{res.student.seatingNumber || '---'}</td>
                                    <td className="p-2 border border-black font-black">{res.student.name}</td>
                                    {gradeSubjects.map(gs => {
                                        const subjRes = selectedTerm === 1 ? res.term1Results.find(t => t.subject.id === gs.id) :
                                                       selectedTerm === 2 ? res.term2Results.find(t => t.subject.id === gs.id) :
                                                       res.subjects.find(s => s.subject.id === gs.id);
                                        const score = selectedTerm === 'final' ? subjRes?.total : (subjRes as any)?.score;
                                        const isFailed = (res.failureDetails || []).some(fd => fd.subject.id === gs.id);
                                        return (
                                            <td key={gs.id} className={`p-2 border border-black text-center font-bold ${isFailed ? 'text-red-600 bg-red-50' : ''}`}>
                                                {subjRes?.status === 'absent' ? 'غ' : score ?? '---'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 border border-black text-center font-black">{(selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</td>
                                    <td className={`p-2 border border-black text-center font-black ${res.termSpecificStatus === 'ناجح' ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {res.termSpecificStatus}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ReportFooter settings={settings} />
            </div>
        )}
      </div>
    </div>
  );
};

// Sub-components
const CertificateTable = ({ res, subjects, term }: any) => (
    <table className="w-full text-right mb-6 border border-black text-[9pt]">
        <thead className="bg-gray-100 font-black">
            <tr>
                <th className="py-2 px-3 border border-black">المادة الدراسية</th>
                <th className="py-2 text-center border border-black">الدرجة</th>
                <th className="py-2 text-center border border-black">الحالة</th>
            </tr>
        </thead>
        <tbody>
            {subjects.map((gs: any) => {
                const subjRes = term === 1 ? res.term1Results.find((t: any) => t.subject.id === gs.id) :
                                term === 2 ? res.term2Results.find((t: any) => t.subject.id === gs.id) :
                                res.subjects.find((s: any) => s.subject.id === gs.id);
                const score = term === 'final' ? subjRes?.total : subjRes?.score;
                return (
                    <tr key={gs.id}>
                        <td className="py-2 px-3 font-bold border border-black">{gs.name}</td>
                        <td className="py-2 text-center font-black border border-black">{subjRes?.status === 'absent' ? 'غ' : score ?? '---'}</td>
                        <td className="py-2 text-center border border-black font-bold">
                            {subjRes?.status === 'pass' || subjRes?.status === 'exempt' ? 'اجتياز' : 'إعادة'}
                        </td>
                    </tr>
                );
            })}
        </tbody>
        <tfoot>
            <tr className="bg-black text-white font-black">
                <td className="py-3 px-3">المعدل العام والقرار</td>
                <td className="py-3 text-center">{(term === 1 ? res.term1Percentage : term === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</td>
                <td className="py-3 text-center">{res.termSpecificStatus}</td>
            </tr>
        </tfoot>
    </table>
);

const ReportTermButton = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`}>{label}</button>
);

const ReportHeader = ({ settings, title, grade, term, hideExtra }: any) => (
    <div className="text-center mb-4 border-b border-black pb-4 px-2 print:mb-2 print:pb-2">
      <div className="flex justify-between items-center mb-2 print:mb-1">
        <div className="text-right flex flex-col gap-0.5">
          <p className="text-[7pt] font-black text-gray-600">{settings.directorate}</p>
          <h1 className="text-[10pt] font-black text-black leading-tight">{settings.schoolName}</h1>
        </div>
        <div className="flex-shrink-0 mx-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 object-contain print:h-10 print:w-10" />
          ) : (
            <div className="h-10 w-10 border border-black rounded-full flex items-center justify-center font-black text-[7pt]">شعار</div>
          )}
        </div>
        <div className="text-left flex flex-col gap-0.5">
          <p className="text-[7pt] font-black text-gray-600">العام الدراسي: {DB.getActiveYear()?.name || '---'}</p>
          <p className="text-[8pt] font-black text-black">{grade}</p>
        </div>
      </div>
      <div className="inline-block border border-black px-4 py-1 font-black text-[11pt] bg-gray-50 print:py-0.5 print:text-[10pt]">
        {title}
        {!hideExtra && <span className="block text-[7pt] font-bold mt-0.5 text-gray-500">
          {term === 'final' ? 'النتيجة النهائية (متوسط الفصلين)' : `نتائج الفصل الدراسي ${term === 1 ? 'الأول' : 'الثاني'}`}
        </span>}
      </div>
    </div>
);

const ReportFooter = ({ settings }: { settings: SchoolSettings }) => (
  <div className="mt-8 grid grid-cols-3 gap-4 text-center font-black text-[8pt] px-4 pb-2 print:mt-4 print:pb-1">
    <div className="flex flex-col gap-8 print:gap-4">
      <p className="border-b border-black pb-1">معد الكشف</p>
      <p className="text-[7pt]">{settings.collectorName || '........................'}</p>
    </div>
    <div className="flex flex-col gap-8 print:gap-4">
      <p className="border-b border-black pb-1">رئيس الكنترول</p>
      <p className="text-[7pt]">{settings.controlHeadName || '........................'}</p>
    </div>
    <div className="flex flex-col gap-8 print:gap-4">
      <p className="border-b border-black pb-1">مدير المدرسة</p>
      <p className="text-[8pt]">{settings.principal || '........................'}</p>
    </div>
  </div>
);
