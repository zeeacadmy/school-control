
import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../db';
import { Student, Grade } from '../types';
import { UserPlus, Upload, Trash2, Camera, Search, Filter, Columns, CheckCircle, AlertCircle, Table, AlertTriangle, ListPlus, FileSpreadsheet, X, RefreshCw } from 'lucide-react';

type ImportMode = 'quick' | 'advanced';
type ImportStep = 'paste' | 'map';

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<Grade | 'all'>('all');
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('quick');
  const [importStep, setImportStep] = useState<ImportStep>('paste');
  const [importText, setImportText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    grade: Grade.G1,
    section: 'أ',
    religion: 'muslim',
    photoUrl: ''
  });

  useEffect(() => {
    setStudents(DB.getStudents());
  }, []);

  const handleAdd = () => {
    if (!newStudent.name?.trim()) {
      alert('يرجى إدخال اسم الطالب');
      return;
    }
    const updated = [...students, { ...newStudent, id: Date.now().toString() } as Student];
    setStudents(updated);
    DB.saveStudents(updated);
    setNewStudent({ ...newStudent, name: '', photoUrl: '' });
    alert('تمت الإضافة بنجاح');
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('تعذر فتح الكاميرا: ' + err);
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      const photoUrl = canvasRef.current.toDataURL('image/png');
      setNewStudent({ ...newStudent, photoUrl });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.includes(searchTerm);
    const matchesGrade = filterGrade === 'all' || s.grade === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Manual Entry Form */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
        <h3 className="font-black text-xl mb-6 text-gray-800 dark:text-white flex items-center gap-3">
           <UserPlus className="w-7 h-7 text-emerald-600" />
           تسجيل طالب جديد
        </h3>
        
        <div className="flex flex-col md:flex-row gap-8">
            {/* Photo Section */}
            <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-3xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                    {newStudent.photoUrl ? (
                        <img src={newStudent.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <Camera className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                    )}
                    <button 
                        onClick={startCamera}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black"
                    >
                        {newStudent.photoUrl ? 'تغيير الصورة' : 'التقاط صورة'}
                    </button>
                </div>
                {newStudent.photoUrl && <button onClick={() => setNewStudent({...newStudent, photoUrl: ''})} className="text-[10px] text-red-500 font-bold hover:underline">حذف الصورة</button>}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">الاسم الكامل</label>
                    <input 
                    type="text" 
                    placeholder="اسم الطالب بالكامل" 
                    className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold dark:text-white"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">الصف الدراسي</label>
                    <select 
                    className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({...newStudent, grade: e.target.value as Grade})}
                    >
                    {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase mr-1">الفصل</label>
                    <input 
                    type="text" 
                    placeholder="أ" 
                    className="w-full border-2 border-gray-100 dark:border-slate-800 dark:bg-slate-950 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({...newStudent, section: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="flex items-end">
                <button onClick={handleAdd} className="bg-emerald-600 text-white rounded-2xl font-black px-8 py-4 hover:bg-emerald-700 shadow-xl shadow-emerald-50 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3">
                <UserPlus className="w-5 h-5" />
                إضافة الطالب
                </button>
            </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full">
                  <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                      <h4 className="font-black dark:text-white">التقاط صورة الطالب</h4>
                      <button onClick={stopCamera} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all"><X className="w-6 h-6 dark:text-slate-400" /></button>
                  </div>
                  <div className="relative aspect-video bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="p-6 flex justify-center gap-4">
                      <button onClick={takePhoto} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">التقاط الآن</button>
                      <button onClick={stopCamera} className="px-6 bg-gray-100 dark:bg-slate-800 dark:text-slate-300 font-bold py-4 rounded-2xl">إلغاء</button>
                  </div>
              </div>
          </div>
      )}

      {/* Students List Table (Previously implemented, showing update context) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in">
        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-black text-lg text-gray-800 dark:text-white">قائمة الطلاب</h3>
            <div className="flex-1 max-w-xs relative no-print mx-4">
                <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="بحث سريع..." 
                    className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <span className="text-[10px] bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black">إجمالي: {filteredStudents.length}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/20 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">
                        <th className="px-6 py-4">صورة</th>
                        <th className="px-6 py-4">الاسم</th>
                        <th className="px-6 py-4 text-center">الصف</th>
                        <th className="px-6 py-4 text-center">الفصل</th>
                        <th className="px-6 py-4 text-center no-print">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                    {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                            <td className="px-6 py-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 overflow-hidden border dark:border-slate-700">
                                    {student.photoUrl ? (
                                        <img src={student.photoUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-gray-400 uppercase">ن/ص</div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-3 font-black text-gray-700 dark:text-slate-200">{student.name}</td>
                            <td className="px-6 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">{student.grade}</td>
                            <td className="px-6 py-3 text-center text-xs font-bold text-gray-500">{student.section}</td>
                            <td className="px-6 py-3 text-center no-print">
                                <button className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
