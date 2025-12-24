
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DB } from '../db.ts';
import { Grade, Student, Subject, GradeRecord, SchoolSettings } from '../types.ts';
import { calculateStudentStatus, DetailedReportData } from '../logic/grading.ts';
import { Printer, FileText, Award, LayoutGrid, Users, Trophy, Medal, CheckSquare, Square, X, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type ReportTerm = 1 | 2 | 'final';
type ReportType = 'table' | 'cards' | 'stats' | 'subject_stats' | 'failures' | 'honor_roll';

interface ExtendedResult extends DetailedReportData {
  termSpecificStatus: string;
  failureDetails: { subject: Subject, reason: string, type: 't1' | 't2' | 'both' | 'absent' }[];
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
  const [topCount, setTopCount] = useState<number>(5); 
  
  const [aiAnalyzing, setAiAnalyzing] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ studentId: string, text: string } | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [settings, setSettings] = useState(DB.getSettings());

  useEffect(() => {
    try {
      setStudents(DB.getStudents() || []);
      setAllSubjects(DB.getSubjects() || []);
      setGrades(DB.getGrades() || []);
      setSettings(DB.getSettings() || {});
    } catch (e) {
      console.error("Error loading DB in Reports:", e);
    }
  }, []);

  const gradeSubjects = useMemo(() => 
    allSubjects.filter(s => s.grade === selectedGrade),
  [allSubjects, selectedGrade]);

  const getProcessedResultsForGrade = (grade: Grade, term: ReportTerm): ExtendedResult[] => {
    const subjectsForGrade = allSubjects.filter(s => s.grade === grade);
    const studentsForGrade = students.filter(s => s.grade === grade);
    
    const processed = studentsForGrade.map(student => {
        const r = calculateStudentStatus(student, subjectsForGrade, grades);
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
        }

        return { ...r, termSpecificStatus, failureDetails };
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
  [selectedGrade, selectedTerm, students, allSubjects, grades]);

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

  const honorRollData = useMemo(() => {
    if (reportType !== 'honor_roll') return [];
    return Object.values(Grade).map(grade => {
      const topStudents = getProcessedResultsForGrade(grade, selectedTerm)
        .filter(r => r.termSpecificStatus === 'ناجح')
        .sort((a, b) => (a.rank || 0) - (b.rank || 0))
        .slice(0, topCount);
      return { grade, topStudents };
    }).filter(g => g.topStudents.length > 0);
  }, [reportType, students, allSubjects, grades, selectedTerm, topCount]);

  const handleAIAnalysis = async (studentResult: ExtendedResult) => {
    setAiAnalyzing(studentResult.student.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `حلل مستوى الطالب: ${studentResult.student.name}، معدل: ${studentResult.finalPercentage.toFixed(1)}%، صف: ${studentResult.student.grade}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiResult({ studentId: studentResult.student.id, text: response.text || "" });
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setAiAnalyzing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-xl no-print space-y-6">
        <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
            <div className="flex flex-wrap items-center gap-4">
                {reportType !== 'honor_roll' ? (
                  <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-400">الصف الدراسي</span>
                      <select className="bg-gray-50 dark:bg-slate-800 dark:text-white border p-3 rounded-2xl min-w-[200px] font-bold outline-none" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as Grade)}>
                          {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-400">عدد الأوائل</span>
                    <div className="flex bg-gray-50 dark:bg-slate-800 p-1.5 rounded-2xl border">
                        {[3, 4, 5].map(n => (
                          <button key={n} onClick={() => setTopCount(n)} className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${topCount === n ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400'}`}>{n}</button>
                        ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-gray-400">الفصل</span>
                    <div className="flex bg-gray-50 dark:bg-slate-800 p-1.5 rounded-2xl border">
                        <ReportTermButton active={selectedTerm === 1} onClick={() => setSelectedTerm(1)} label="فصل 1" />
                        <ReportTermButton active={selectedTerm === 2} onClick={() => setSelectedTerm(2)} label="فصل 2" />
                        <ReportTermButton active={selectedTerm === 'final'} onClick={() => setSelectedTerm('final')} label="نهائي" />
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl border">
                    <button onClick={() => setReportType('table')} className={`p-2.5 rounded-xl ${reportType === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600' : 'text-gray-400'}`}><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setReportType('cards')} className={`p-2.5 rounded-xl ${reportType === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-600' : 'text-gray-400'}`}><FileText className="w-5 h-5" /></button>
                    <button onClick={() => setReportType('honor_roll')} className={`p-2.5 rounded-xl ${reportType === 'honor_roll' ? 'bg-white dark:bg-slate-700 text-amber-500' : 'text-gray-400'}`}><Award className="w-5 h-5" /></button>
                </div>
                <button onClick={() => window.print()} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg">
                    <Printer className="w-5 h-5" /> طباعة
                </button>
            </div>
        </div>
      </div>

      <div className="print-container">
        {reportType === 'honor_roll' && (
          <div className="space-y-12">
            {honorRollData.map(({ grade, topStudents }) => (
              <div key={grade} className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-950 shadow-sm page-break relative overflow-hidden mb-8">
                <ReportHeader settings={settings} title="لوحة شرف المتفوقين" grade={grade} term={selectedTerm} hideExtra={true} />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-8">
                    {topStudents.map((res, idx) => (
                      <div key={res.student.id} className="p-6 rounded-3xl border-2 flex flex-col items-center text-center bg-gray-50">
                        <div className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden bg-white mb-4">
                           {res.student.photoUrl ? <img src={res.student.photoUrl} className="w-full h-full object-cover" /> : <Users className="w-8 h-8 text-gray-200" />}
                        </div>
                        <h4 className="text-sm font-black text-gray-800 h-10 mb-2">{res.student.name}</h4>
                        <p className="text-[10pt] font-black text-indigo-700">{(selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</p>
                        <p className="text-[8pt] font-bold text-gray-400">الـ {res.rankText}</p>
                      </div>
                    ))}
                </div>
                <ReportFooter settings={settings} />
              </div>
            ))}
          </div>
        )}

        {reportType === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block">
                {filteredResults.map((res: ExtendedResult) => (
                <div key={res.student.id} className="grade-card bg-white p-8 mb-4 rounded-3xl border-2 border-black page-break">
                    <ReportHeader settings={settings} title="شهادة تقييم مستوى طالب" grade={selectedGrade} term={selectedTerm} />
                    <div className="flex gap-6 mb-6">
                        <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-black overflow-hidden">
                            {res.student.photoUrl ? <img src={res.student.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black">صورة</div>}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-3 p-4 bg-gray-50 border border-black rounded-2xl text-[9pt]">
                            <div><p className="text-[8px] text-gray-500 font-bold">الاسم</p><p className="font-black">{res.student.name}</p></div>
                            <div className="text-left"><p className="text-[8px] text-gray-500 font-bold">الترتيب</p><p className="font-black">الـ {res.rankText}</p></div>
                        </div>
                    </div>
                    <CertificateTable res={res} subjects={gradeSubjects} term={selectedTerm} />
                    <ReportFooter settings={settings} />
                </div>
                ))}
            </div>
        )}

        {reportType === 'table' && (
           <div className="bg-white p-6 rounded-3xl border-2 border-black">
              <ReportHeader settings={settings} title="كشف نتائج الطلاب" grade={selectedGrade} term={selectedTerm} />
              <table className="w-full text-right border-collapse border border-black text-[9pt]">
                 <thead className="bg-gray-100 font-black">
                    <tr>
                       <th className="border border-black p-2 w-10">م</th>
                       <th className="border border-black p-2">اسم الطالب</th>
                       <th className="border border-black p-2 text-center">المعدل</th>
                       <th className="border border-black p-2 text-center">الحالة</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredResults.map((res, idx) => (
                       <tr key={res.student.id}>
                          <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-black p-2 font-black">{res.student.name}</td>
                          <td className="border border-black p-2 text-center font-black">
                            {(selectedTerm === 1 ? res.term1Percentage : selectedTerm === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%
                          </td>
                          <td className="border border-black p-2 text-center font-bold">{res.termSpecificStatus}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              <ReportFooter settings={settings} />
           </div>
        )}
      </div>
    </div>
  );
};

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
            {(subjects || []).map((gs: any) => {
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
                <td className="py-3 px-3">المعدل العام</td>
                <td className="py-3 text-center">{(term === 1 ? res.term1Percentage : term === 2 ? res.term2Percentage : res.finalPercentage).toFixed(1)}%</td>
                <td className="py-3 text-center">{res.termSpecificStatus}</td>
            </tr>
        </tfoot>
    </table>
);

const ReportTermButton = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:bg-white'}`}>{label}</button>
);

const ReportHeader = ({ settings, title, grade, term, hideExtra }: any) => (
    <div className="text-center mb-4 border-b border-black pb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-right">
          <p className="text-[7pt] font-black text-gray-600">{settings?.directorate || 'مديرية التعليم'}</p>
          <h1 className="text-[10pt] font-black leading-tight text-black">{settings?.schoolName || 'اسم المدرسة'}</h1>
        </div>
        <div className="flex-shrink-0 mx-2">
          {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" /> : <div className="h-10 w-10 border border-black rounded-full flex items-center justify-center font-black text-[7pt]">شعار</div>}
        </div>
        <div className="text-left">
          <p className="text-[7pt] font-black text-gray-600">العام: {DB.getActiveYear()?.name || '---'}</p>
          <p className="text-[8pt] font-black text-black">{grade}</p>
        </div>
      </div>
      <div className="inline-block border border-black px-4 py-1 font-black text-[11pt] bg-gray-50 uppercase tracking-widest text-black">
        {title}
        {!hideExtra && <span className="block text-[7pt] font-bold mt-0.5 text-gray-500">
          {term === 'final' ? 'النتيجة النهائية' : `نتائج الفصل الدراسي ${term === 1 ? 'الأول' : 'الثاني'}`}
        </span>}
      </div>
    </div>
);

const ReportFooter = ({ settings }: { settings: SchoolSettings }) => (
  <div className="mt-8 grid grid-cols-3 gap-4 text-center font-black text-[8pt]">
    <div><p className="border-b border-black pb-1 mb-6">معد الكشف</p><p className="text-[7pt]">{settings?.collectorName || '..................'}</p></div>
    <div><p className="border-b border-black pb-1 mb-6">رئيس الكنترول</p><p className="text-[7pt]">{settings?.controlHeadName || '..................'}</p></div>
    <div><p className="border-b border-black pb-1 mb-6">مدير المدرسة</p><p className="text-[8pt]">{settings?.principal || '..................'}</p></div>
  </div>
);
