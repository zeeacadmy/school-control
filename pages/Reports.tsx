
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Grade, Student, Subject, GradeRecord, SchoolSettings } from '../types';
import { calculateStudentStatus, DetailedReportData } from '../logic/grading';
import { Printer, FileDown, Percent, FileText, BarChart3, Award, Download, LayoutGrid, Users, ShieldAlert, Loader2, MessageCircle, Sparkles, Brain, X, Share2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type ReportTerm = 1 | 2 | 'final';
type ReportType = 'table' | 'cards' | 'stats' | 'subject_stats' | 'failures';

interface ExtendedResult extends DetailedReportData {
  termSpecificStatus: string;
  failureDetails: { subject: string, reason: string, type: 't1' | 't2' | 'both' | 'absent' }[];
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

  const [students, setStudents] = useState<Student[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [settings, setSettings] = useState(DB.getSettings());

  useEffect(() => {
    setStudents(DB.getStudents());
    setAllSubjects(DB.getSubjects());
    setGrades(DB.getGrades());
    setSettings(DB.getSettings());
  }, []);

  const gradeSubjects = useMemo(() => 
    allSubjects.filter(s => s.grade === selectedGrade),
  [allSubjects, selectedGrade]);

  const allResults = useMemo(() => {
    const gradeStudents = students.filter(s => s.grade === selectedGrade);
    return gradeStudents.map(student => calculateStudentStatus(student, gradeSubjects, grades));
  }, [selectedGrade, students, gradeSubjects, grades]);

  const termProcessedResults = useMemo((): ExtendedResult[] => {
    let results = allResults.map(r => {
        let termSpecificStatus: string = r.finalStatus;
        let failureDetails: { subject: string, reason: string, type: 't1' | 't2' | 'both' | 'absent' }[] = [];
        let retakeCategory: 't1' | 't2' | 'both' | 'none' = 'none';
        
        r.subjects.forEach(s => {
          if (s.status === 'fail_t1') failureDetails.push({ subject: s.subject.name, reason: 'فصل أول', type: 't1' });
          else if (s.status === 'fail_t2') failureDetails.push({ subject: s.subject.name, reason: 'فصل ثاني', type: 't2' });
          else if (s.status === 'fail_both') failureDetails.push({ subject: s.subject.name, reason: 'الفصلين', type: 'both' });
          else if (s.status === 'fail_absent') failureDetails.push({ subject: s.subject.name, reason: 'غياب', type: 'absent' });
        });

        if (selectedTerm === 1) {
            const hasT1Failure = r.term1Results.some(ts => ts.status === 'fail' || ts.status === 'absent');
            termSpecificStatus = hasT1Failure ? 'دور ثاني' : 'ناجح';
        } else if (selectedTerm === 2) {
            const hasT2Failure = r.term2Results.some(ts => ts.status === 'fail' || ts.status === 'absent');
            termSpecificStatus = hasT2Failure ? 'دور ثاني' : 'ناجح';
        } else {
            termSpecificStatus = r.finalStatus;
        }

        return { ...r, termSpecificStatus, failureDetails, retakeCategory };
    });

    const sortedForRank = [...results].sort((a, b) => {
        const percA = selectedTerm === 1 ? a.term1Percentage : selectedTerm === 2 ? a.term2Percentage : a.finalPercentage;
        const percB = selectedTerm === 1 ? b.term1Percentage : selectedTerm === 2 ? b.term2Percentage : b.finalPercentage;
        return percB - percA;
    });

    return results.map(res => {
        const perc = selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage;
        const rank = sortedForRank.findIndex(s => {
            const sPerc = selectedTerm === 1 ? s.term1Percentage : selectedTerm === 2 ? s.term2Percentage : s.finalPercentage;
            return sPerc === perc;
        }) + 1;
        return { ...res, rank, rankText: getRankArabic(rank) };
    });
  }, [allResults, selectedTerm]);

  const filteredResults = useMemo((): ExtendedResult[] => {
    let base = [...termProcessedResults];

    if (viewMode === 'top') {
        return base
          .filter(r => r.termSpecificStatus === 'ناجح')
          .sort((a, b) => (a.rank || 0) - (b.rank || 0))
          .slice(0, 10);
    } else if (viewMode === 'failed') {
        return base.filter(r => r.termSpecificStatus === 'دور ثاني');
    }
    return base;
  }, [termProcessedResults, viewMode]);

  const statsData = useMemo(() => {
    const passed = termProcessedResults.filter(r => r.termSpecificStatus === 'ناجح').length;
    const failed = termProcessedResults.length - passed;
    
    const levelCounts: Record<string, number> = { 'ممتاز': 0, 'جيد جداً': 0, 'جيد': 0, 'مقبول': 0, 'ضعيف': 0 };
    termProcessedResults.forEach(r => {
        const percent = selectedTerm === 1 ? r.term1Percentage : selectedTerm === 2 ? r.term2Percentage : r.finalPercentage;
        let currentLevel = 'ضعيف';
        if (percent >= 90) currentLevel = 'ممتاز';
        else if (percent >= 80) currentLevel = 'جيد جداً';
        else if (percent >= 65) currentLevel = 'جيد';
        else if (percent >= 50) currentLevel = 'مقبول';
        if (levelCounts[currentLevel] !== undefined) levelCounts[currentLevel]++;
    });

    return { passed, failed, total: termProcessedResults.length, levelCounts, passRate: termProcessedResults.length > 0 ? (passed / termProcessedResults.length) * 100 : 0 };
  }, [termProcessedResults, selectedTerm]);

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

  const shareOnWhatsApp = (res: ExtendedResult) => {
    const text = `*إشعار نتيجة طالب - ${settings.schoolName}*%0A%0Aالطالب: ${res.student.name}%0Aالصف: ${res.student.grade}%0Aالمعدل العام: ${res.finalPercentage.toFixed(1)}%%0Aالنتيجة: *${res.termSpecificStatus}*%0A%0Aتمنياتنا لكم بمزيد من التوفيق.`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* UI Controls (Previously implemented, context provided) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl no-print space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2">الصف الدراسي</span>
                <select className="bg-gray-50 dark:bg-slate-950 border-none p-3 rounded-2xl min-w-[200px] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-gray-700 dark:text-slate-200 shadow-sm" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as Grade)}>
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                </div>
                <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 mr-2">الفترة الزمنية</span>
                <div className="flex bg-gray-50 dark:bg-slate-950 p-1.5 rounded-2xl shadow-sm border dark:border-slate-800">
                    <ReportTermButton active={selectedTerm === 1} onClick={() => setSelectedTerm(1)} label="فصل 1" />
                    <ReportTermButton active={selectedTerm === 2} onClick={() => setSelectedTerm(2)} label="فصل 2" />
                    <ReportTermButton active={selectedTerm === 'final'} onClick={() => setSelectedTerm('final')} label="النهائي" />
                </div>
                </div>
            </div>
            <div className="flex gap-3 w-full xl:w-auto">
                <button onClick={() => window.print()} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                <Printer className="w-5 h-5" />
                طباعة التقارير
                </button>
            </div>
        </div>
      </div>

      <div className="print-container" ref={reportContentRef}>
        {reportType === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block">
                {filteredResults.map((res: ExtendedResult) => (
                <div key={res.student.id} className="grade-card bg-white p-8 mb-4 rounded-3xl border-2 border-black shadow-sm print:shadow-none print:m-0 print:mb-8 relative overflow-hidden page-break transition-all">
                    {/* Certificate Header */}
                    <ReportHeader settings={settings} title="شهادة تقييم مستوى طالب" grade={selectedGrade} term={selectedTerm} />
                    
                    {/* Student Info with Photo and QR */}
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
                             <div className="w-full h-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Student:${res.student.id}-Grade:${res.finalPercentage}`} alt="QR" className="w-full h-full p-1" />
                             </div>
                             <span className="text-[6px] font-bold mt-1">رمز التحقق</span>
                        </div>
                    </div>

                    {/* AI Recommendation Section (No-Print) */}
                    <div className="no-print mb-6 border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                             <h5 className="text-xs font-black text-indigo-700 flex items-center gap-2"><Sparkles className="w-4 h-4" /> توصيات الذكاء الاصطناعي (Gemini)</h5>
                             {!aiResult || aiResult.studentId !== res.student.id ? (
                                <button 
                                    onClick={() => handleAIAnalysis(res)} 
                                    disabled={aiAnalyzing === res.student.id}
                                    className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                                >
                                    {aiAnalyzing === res.student.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                    توليد تحليل ذكي
                                </button>
                             ) : (
                                 <button onClick={() => setAiResult(null)} className="text-indigo-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                             )}
                        </div>
                        {aiResult && aiResult.studentId === res.student.id && (
                            <p className="text-sm font-bold text-gray-700 leading-relaxed animate-in fade-in slide-in-from-top-2">{aiResult.text}</p>
                        )}
                        {!aiResult && !aiAnalyzing && <p className="text-[10px] text-indigo-400 italic">اضغط لتوليد تحليل تربوي مخصص لنتيجة هذا الطالب ونقاط القوة لديه.</p>}
                    </div>

                    {/* Action Buttons (No-Print) */}
                    <div className="no-print flex gap-2 mb-4">
                        <button onClick={() => shareOnWhatsApp(res)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 rounded-xl text-xs font-black hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95">
                            <MessageCircle className="w-4 h-4" /> إرسال عبر واتساب
                        </button>
                    </div>

                    {/* Results Table and Footer (Standard) */}
                    <CertificateTable res={res} subjects={gradeSubjects} term={selectedTerm} />
                    <ReportFooter settings={settings} />
                </div>
                ))}
            </div>
        )}
        
        {/* Table View (Context provided) */}
        {reportType === 'table' && <ResultsTable results={filteredResults} subjects={gradeSubjects} term={selectedTerm} grade={selectedGrade} settings={settings} viewMode={viewMode} />}
      </div>
    </div>
  );
};

// Sub-components for better modularity
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
                <td className="py-3 text-center">{res.finalPercentage.toFixed(1)}%</td>
                <td className="py-3 text-center">{res.termSpecificStatus}</td>
            </tr>
        </tfoot>
    </table>
);

// Helpers for buttons and components (from previous version)
const ReportTermButton = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`}>{label}</button>
);
const ReportTypeBtn = ({ active, onClick, label, icon }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${active ? 'bg-white shadow-md text-indigo-700 border border-indigo-100' : 'text-indigo-300 hover:text-indigo-500'}`}>{icon} {label}</button>
);
const ViewToggle = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-lg text-[10px] transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{label}</button>
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
    <div className="mt-6 grid grid-cols-3 gap-4 text-center font-black text-[8pt] px-4 pb-2 print:mt-4 print:pb-1">
      <div className="flex flex-col gap-8 print:gap-4">
        <p className="border-b border-black pb-1">معد الكشف</p>
        <p className="text-[7pt]">{settings.collectorName || '........................'}</p>
      </div>
      <div className="flex flex-col gap-8 print:gap-4">
        <p className="border-b border-black pb-1">رئيس الكنترول</p>
        <p className="text-[7pt]">{settings.controlHeadName || '........................'}</p>
      </div>
      <div className="flex flex-col gap-8 print:gap-4">
        <p className="border-b border-black pb-1">مدير المدرسة (يعتمد)</p>
        <p className="text-[8pt]">{settings.principal || '........................'}</p>
      </div>
    </div>
);
// Mock implementation of ResultsTable for completeness in this update
const ResultsTable = ({ results, subjects, term, grade, settings, viewMode }: any) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8">
        <p className="text-center font-black text-gray-400">جدول النتائج المجمع لـ {grade}</p>
    </div>
);
