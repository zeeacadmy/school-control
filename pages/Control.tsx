
import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../db';
import { Grade, Student, SchoolSettings } from '../types';
import { UserCog, ListOrdered, Printer, LayoutGrid, FileText, CreditCard, ShieldCheck, DoorOpen, ClipboardList, Loader2, Settings2, Clock, Calendar as CalendarIcon } from 'lucide-react';

type PrintJobType = 'none' | 'calling' | 'cards' | 'minutes' | 'committees';

interface MinutesConfig {
  date: string;
  startTime: string;
  endTime: string;
}

export const Control: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<Grade>(Grade.G1);
  const [students, setStudents] = useState<Student[]>([]);
  const [startSeating, setStartSeating] = useState<number>(1001);
  const [studentsPerCommittee, setStudentsPerCommittee] = useState<number>(20);
  const [settings, setSettings] = useState<SchoolSettings>(DB.getSettings());
  const [printType, setPrintType] = useState<PrintJobType>('none');
  const [isPreparing, setIsPreparing] = useState(false);
  
  // إعدادات المحاضر
  const [minutesConfig, setMinutesConfig] = useState<MinutesConfig>({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '10:30'
  });

  useEffect(() => {
    const allStudents = DB.getStudents();
    setStudents(allStudents);
    setSettings(DB.getSettings());

    const handleAfterPrint = () => {
      setPrintType('none');
      setIsPreparing(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    if (printType !== 'none') {
      setIsPreparing(true);
      const timer = setTimeout(() => {
        window.print();
        setIsPreparing(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [printType]);

  const gradeStudents = useMemo(() => 
    students
      .filter(s => s.grade === selectedGrade)
      .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0)),
    [students, selectedGrade]
  );

  const committees = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < gradeStudents.length; i += studentsPerCommittee) {
      chunks.push(gradeStudents.slice(i, i + studentsPerCommittee));
    }
    return chunks;
  }, [gradeStudents, studentsPerCommittee]);

  const generateSeatingNumbers = () => {
    let current = startSeating;
    const allStudents = DB.getStudents();
    const updated = allStudents.map(s => {
      if (s.grade === selectedGrade) {
        return { ...s, seatingNumber: current++ };
      }
      return s;
    });
    setStudents(updated);
    DB.saveStudents(updated);
    alert(`تم توليد أرقام الجلوس لـ ${updated.filter(s => s.grade === selectedGrade).length} طالب بنجاح`);
  };

  const handlePrintRequest = (type: PrintJobType) => {
    if (gradeStudents.length === 0 && type !== 'minutes') {
      alert('لا يوجد طلاب في الصف المختار لطباعة هذا التقرير');
      return;
    }
    setPrintType(type);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isPreparing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-indigo-950/20 backdrop-blur-sm no-print">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="font-black text-gray-800">جاري تجهيز التقرير للطباعة...</span>
          </div>
        </div>
      )}

      {/* أدوات التحكم العلوية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
        {/* إعدادات الترقيم */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <ListOrdered className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">إدارة أرقام الجلوس</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">الصف المستهدف</label>
              <select className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as Grade)}>
                {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">بداية الترقيم التسلسلي</label>
              <input type="number" className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono font-bold" value={startSeating} onChange={(e) => setStartSeating(parseInt(e.target.value) || 0)} />
            </div>
            <button onClick={generateSeatingNumbers} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              تحديث أرقام الجلوس
            </button>
          </div>
        </div>

        {/* إعدادات اللجان */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <Settings2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">تخصيص توزيع اللجان</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">عدد الطلاب في كل لجنة</label>
              <input 
                type="number" 
                className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold" 
                value={studentsPerCommittee} 
                onChange={(e) => setStudentsPerCommittee(Math.max(1, parseInt(e.target.value) || 1))} 
              />
              <p className="mt-2 text-[10px] text-gray-400 font-bold">سيتم إنشاء {committees.length} لجنة بناءً على عدد الطلاب الحالي.</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
               <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                 <ShieldCheck className="w-4 h-4" />
                 إجمالي لجان الصف: {committees.length} لجنة
               </div>
            </div>
          </div>
        </div>

        {/* إعدادات المحاضر (جديد) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">بيانات المحاضر</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">تاريخ الامتحان</label>
              <input 
                type="date" 
                className="w-full border-2 border-gray-100 p-2 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 bg-white font-bold text-sm" 
                value={minutesConfig.date} 
                onChange={(e) => setMinutesConfig({...minutesConfig, date: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">وقت البدء</label>
                <input 
                  type="time" 
                  className="w-full border-2 border-gray-100 p-2 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 bg-white font-bold text-sm" 
                  value={minutesConfig.startTime} 
                  onChange={(e) => setMinutesConfig({...minutesConfig, startTime: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">وقت الانتهاء</label>
                <input 
                  type="time" 
                  className="w-full border-2 border-gray-100 p-2 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 bg-white font-bold text-sm" 
                  value={minutesConfig.endTime} 
                  onChange={(e) => setMinutesConfig({...minutesConfig, endTime: e.target.value})} 
                />
              </div>
            </div>
            <p className="text-[9px] text-gray-400 font-bold leading-tight">تستخدم هذه البيانات فقط في تقرير "محاضر الفتح والغلق".</p>
          </div>
        </div>

        {/* مركز الطباعة */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">مركز التقارير المجمعة</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PrintOption icon={<FileText className="w-5 h-5" />} label="كشوف المناداة" subLabel="تقسيم حسب اللجان" onClick={() => handlePrintRequest('calling')} />
              <PrintOption icon={<DoorOpen className="w-5 h-5" />} label="توزيع الأبواب" subLabel="كشوف تعليق الأبواب" onClick={() => handlePrintRequest('committees')} />
              <PrintOption icon={<CreditCard className="w-5 h-5" />} label="بطاقات الجلوس" subLabel="توزيع البطاقات" onClick={() => handlePrintRequest('cards')} />
              <PrintOption icon={<ShieldCheck className="w-5 h-5" />} label="المحاضر" subLabel="محاضر الفتح والغلق" onClick={() => handlePrintRequest('minutes')} />
            </div>
          </div>
        </div>
      </div>

      {/* معاينة الجدول - لا تظهر في الطباعة */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden no-print animate-in slide-in-from-bottom-4">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-700">معاينة الترتيب الحالي - {selectedGrade}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">عدد الطلاب: {gradeStudents.length}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">عدد اللجان: {committees.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 border-b text-[10px] text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold border-l">اللجنة</th>
                <th className="px-6 py-4 font-bold border-l">رقم الجلوس</th>
                <th className="px-6 py-4 font-bold border-l">الاسم الكامل</th>
                <th className="px-6 py-4 font-bold">الفصل/الشعبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {committees.length > 0 ? committees.flatMap((committee, cIdx) => 
                committee.map((s, sIdx) => (
                  <tr key={s.id} className={`${sIdx === 0 ? 'border-t-2 border-indigo-100' : ''} hover:bg-indigo-50/30 transition-colors group`}>
                    <td className="px-6 py-4 border-l font-bold text-gray-400 text-xs">{sIdx === 0 ? `لجنة ${cIdx + 1}` : ''}</td>
                    <td className="px-6 py-4 border-l font-mono font-black text-indigo-600 text-lg">{s.seatingNumber || '---'}</td>
                    <td className="px-6 py-4 border-l font-black text-gray-700">{s.name}</td>
                    <td className="px-6 py-4 font-bold text-gray-500">{s.section}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-24 text-center text-gray-300 italic font-bold">لا يوجد طلاب مسجلين حالياً.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مكونات الطباعة - تظهر فقط عند أمر الطباعة */}
      <div className="hidden print:block w-full">
        {printType === 'calling' && committees.map((committee, idx) => (
          <div key={idx} className="page-break">
            <CallingList students={committee} grade={selectedGrade} settings={settings} committeeNum={idx + 1} />
          </div>
        ))}
        {printType === 'committees' && committees.map((committee, idx) => (
          <div key={idx} className="page-break">
            <CommitteeList students={committee} grade={selectedGrade} settings={settings} committeeNum={idx + 1} />
          </div>
        ))}
        {printType === 'cards' && <SeatingCards students={gradeStudents} grade={selectedGrade} settings={settings} />}
        {printType === 'minutes' && <ControlMinutes grade={selectedGrade} settings={settings} config={minutesConfig} />}
      </div>
    </div>
  );
};

/* --- مكونات الطباعة التفصيلية المحدثة --- */

const ReportHeader = ({ settings, title, grade, extraInfo }: any) => (
  <div className="text-center mb-4 border-b border-black pb-4 px-2 print:mb-2 print:pb-2">
    <div className="flex justify-between items-center mb-2 print:mb-1">
      <div className="text-right flex flex-col gap-0.5">
        <p className="text-[7pt] font-black text-gray-600">{settings.directorate}</p>
        <h1 className="text-[10pt] font-black text-black leading-tight">{settings.schoolName}</h1>
      </div>
      <div className="flex-shrink-0 mx-2">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 object-contain print:h-8 print:w-8" />
        ) : (
          <div className="h-8 w-8 border border-black rounded-full flex items-center justify-center font-black text-[6pt]">شعار</div>
        )}
      </div>
      <div className="text-left flex flex-col gap-0.5">
        <p className="text-[7pt] font-black text-gray-600 uppercase tracking-wider">العام الدراسي: {DB.getActiveYear()?.name || '---'}</p>
        <p className="text-[8pt] font-black text-black">{grade}</p>
      </div>
    </div>
    <div className="flex flex-col items-center gap-1">
      <div className="inline-block border border-black px-6 py-1 font-black text-[10pt] bg-gray-50 uppercase tracking-widest print:text-[9pt]">
        {title}
      </div>
      {extraInfo && <div className="text-[8pt] font-black text-indigo-950 mt-0.5">{extraInfo}</div>}
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

const CallingList = ({ students, grade, settings, committeeNum }: any) => (
  <div className="print-container p-4">
    <table className="w-full border-collapse border border-black text-[9pt]">
      <thead>
        <tr>
          <th colSpan={5} className="p-0 border-none bg-white">
            <ReportHeader 
              settings={settings} 
              title="كشف مناداة الطلاب (أرقام الجلوس)" 
              grade={grade} 
              extraInfo={`لجنة رقم: ${committeeNum} - من رقم: ${students[0]?.seatingNumber} إلى رقم: ${students[students.length - 1]?.seatingNumber}`}
            />
          </th>
        </tr>
        <tr className="bg-gray-100">
          <th className="border border-black p-1.5 text-center w-10">م</th>
          <th className="border border-black p-1.5 text-center w-24">رقم الجلوس</th>
          <th className="border border-black p-1.5 text-right">اسم الطالب رباعي</th>
          <th className="border border-black p-1.5 text-center w-20">الشعبة</th>
          <th className="border border-black p-1.5 text-center w-32">توقيع الطالب</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s: any, i: number) => (
          <tr key={s.id}>
            <td className="border border-black p-1 text-center font-bold">{i + 1}</td>
            <td className="border border-black p-1 text-center font-black text-[12pt]">{s.seatingNumber}</td>
            <td className="border border-black p-1 text-right font-black pr-2 h-10">{s.name}</td>
            <td className="border border-black p-1 text-center font-bold">{s.section}</td>
            <td className="border border-black p-1"></td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={5} className="p-0 border-none bg-white">
            <ReportFooter settings={settings} />
          </th>
        </tr>
      </tfoot>
    </table>
  </div>
);

const CommitteeList = ({ students, grade, settings, committeeNum }: any) => (
  <div className="print-container p-4">
    <table className="w-full border-collapse border border-black text-[10pt]">
      <thead>
        <tr>
          <th colSpan={3} className="p-0 border-none bg-white">
            <ReportHeader settings={settings} title="كشوف تعليق أبواب اللجان" grade={grade} />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={3} className="p-4 border-none text-center">
            <h2 className="text-[20pt] font-black mb-4 underline uppercase tracking-widest">لجنة رقم ( {committeeNum} )</h2>
            <div className="grid grid-cols-2 gap-4 text-[14pt] font-black mb-6">
                <div className="bg-gray-100 p-4 border border-black">من رقم: {students[0]?.seatingNumber || '....'}</div>
                <div className="bg-gray-100 p-4 border border-black">إلى رقم: {students[students.length - 1]?.seatingNumber || '....'}</div>
            </div>
            <table className="w-full border-collapse border border-black text-[14pt] font-black">
               <thead className="bg-gray-100">
                 <tr>
                    <th className="border border-black p-2 w-16">م</th>
                    <th className="border border-black p-2 w-32">رقم الجلوس</th>
                    <th className="border border-black p-2 text-right">اسم الطالب</th>
                 </tr>
               </thead>
               <tbody>
                 {students.map((s: any, i: number) => (
                   <tr key={s.id}>
                     <td className="border border-black p-2">{i + 1}</td>
                     <td className="border border-black p-2">{s.seatingNumber}</td>
                     <td className="border border-black p-2 text-right pr-4">{s.name}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={3} className="p-0 border-none bg-white">
            <ReportFooter settings={settings} />
          </th>
        </tr>
      </tfoot>
    </table>
  </div>
);

const SeatingCards = ({ students, grade, settings }: any) => (
  <div className="print-container grid grid-cols-2 gap-4 p-2">
    {students.map((s: any) => (
      <div key={s.id} className="border-2 border-black p-4 h-[280px] flex flex-col justify-between break-inside-avoid relative">
        <div className="flex justify-between items-start border-b border-black pb-2">
          <div className="text-right text-[7pt] font-black leading-tight flex-1">
            <p className="text-gray-600">{settings.directorate}</p>
            <p className="text-[8pt] font-black">{settings.schoolName}</p>
          </div>
          <div className="mx-2">
             {settings.logoUrl && <img src={settings.logoUrl} className="h-8 w-8 object-contain" alt="Logo" />}
          </div>
          <div className="bg-black text-white px-2 py-0.5 text-[7pt] font-black text-center flex-1">بطاقة جلوس</div>
        </div>
        <div className="flex-1 space-y-2 pt-4 text-center">
          <p className="text-[7pt] font-bold text-gray-500 uppercase tracking-widest">اسم الطالب</p>
          <p className="text-[12pt] font-black leading-tight">{s.name}</p>
          <div className="flex justify-center gap-2 pt-1">
            <p className="text-[7pt] font-black border border-black px-2 py-0.5">{grade}</p>
            <p className="text-[7pt] font-black border border-black px-2 py-0.5">فصل: {s.section}</p>
          </div>
        </div>
        <div className="border-t border-black pt-2 flex flex-col items-center gap-2">
          <div className="text-center bg-gray-50 p-2 border border-black w-2/3">
            <p className="text-[7pt] font-black text-gray-400 mb-0.5 uppercase tracking-widest">رقم الجلوس</p>
            <p className="text-[24pt] font-black leading-none">{s.seatingNumber}</p>
          </div>
          <div className="w-full flex justify-between px-2 text-[7pt] font-black">
             <span>يعتمد مدير المدرسة</span>
             <span>ختم المدرسة</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ControlMinutes = ({ grade, settings, config }: { grade: string, settings: SchoolSettings, config: MinutesConfig }) => (
  <div className="print-container p-6 space-y-8">
    <div className="border-2 border-black p-8 relative overflow-hidden">
      <ReportHeader settings={settings} title="محاضر أعمال الكنترول الرسمية" grade={grade} />
      <div className="space-y-6 text-[10pt] leading-loose">
        <h2 className="text-[14pt] font-black text-center border-b-2 border-black pb-3 uppercase tracking-widest">محضر فتح مظاريف الأسئلة</h2>
        <p>
          إنه في يوم <span className="font-black px-4 bg-gray-50 border-b border-black">{config.date || '.................'}</span> وفي تمام الساعة <span className="font-black px-4 bg-gray-50 border-b border-black">{config.startTime || '............'}</span> صباحاً، 
          اجتمعت اللجنة المشكلة برئاسة السيد / ................................................................ وعضوية كل من:
        </p>
        <div className="pr-8 space-y-2 font-bold">
          <p>1. السيد / ................................................................ (عضو)</p>
          <p>2. السيد / ................................................................ (عضو)</p>
        </div>
        <p className="leading-relaxed">
          وذلك لفتح مظروف أسئلة مادة <span className="font-black underline px-2">........................................</span> للصف {grade} للفصل الدراسي ........................
          وقد تلاحظ للجنة أن المظروف مغلق بإحكام وبخاتم الجهة المختصة، ولم يتبين وجود أي تلاعب، وقد تم الفتح بحضور الجميع.
        </p>
        <div className="grid grid-cols-2 gap-10 pt-10 text-center font-black">
          <div className="border-t border-black pt-2">أعضاء اللجنة</div>
          <div className="border-t border-black pt-2">رئيس الكنترول (يعتمد)</div>
        </div>
      </div>
    </div>
    
    <div className="page-break"></div>
    
    <div className="border-2 border-black p-8 mt-8 relative">
      <ReportHeader settings={settings} title="محاضر أعمال الكنترول الرسمية" grade={grade} />
      <div className="space-y-6 text-[10pt] leading-loose pt-4 relative">
        <h2 className="text-[14pt] font-black text-center border-b-2 border-black pb-3 uppercase tracking-widest">محضر غلق وتشميع كراسات الإجابة</h2>
        <p>
          إنه في تمام الساعة <span className="font-black px-4 bg-gray-50 border-b border-black">{config.endTime || '............'}</span> بعد انتهاء زمن الإجابة القانوني، قامت اللجنة بتجميع كراسات الإجابة لطلاب الصف {grade} 
          في مادة <span className="font-black underline px-2">........................................</span> وعددها الإجمالي ( .......... ) كراسة.
        </p>
        <p className="leading-relaxed">
          وقد تم مراجعة العدد ومطابقته، وتم وضع الكراسات في المظروف المخصص لها، وتم غلقه وتشميعه بالشمع الأحمر وتسليمه لرئاسة الكنترول.
        </p>
        <div className="grid grid-cols-3 gap-6 pt-12 text-center font-black">
          <div className="border-t border-black pt-2">مراقب اللجنة</div>
          <div className="border-t border-black pt-2">مسؤول الأمن</div>
          <div className="border-t border-black pt-2">رئيس الكنترول</div>
        </div>
      </div>
    </div>
  </div>
);

const PrintOption = ({ label, subLabel, onClick, icon }: any) => (
  <button onClick={onClick} className="p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-right hover:border-indigo-300 hover:bg-indigo-50 transition-all group flex flex-col justify-between min-h-[120px] shadow-sm active:scale-95">
    <div className="text-indigo-600 mb-2 transition-transform group-hover:scale-110 group-hover:rotate-3">{icon}</div>
    <div>
      <p className="font-black text-gray-800 text-sm leading-tight mb-1">{label}</p>
      <p className="text-[10px] text-gray-400 font-bold">{subLabel}</p>
    </div>
  </button>
);
