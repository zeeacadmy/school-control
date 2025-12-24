
import { Student, Subject, GradeRecord, SchoolSettings, Grade, AcademicYear } from './types';

const STORAGE_KEYS = {
  STUDENTS: 'scs_students',
  SUBJECTS: 'scs_subjects',
  GRADES: 'scs_grades',
  SETTINGS: 'scs_settings',
  ACADEMIC_YEARS: 'scs_years'
};

const DEFAULT_SUBJECTS: Subject[] = [
  { id: '1', name: 'اللغة العربية', grade: Grade.G1, maxContinuous: 20, maxExam: 80, passPercentage: 50 },
  { id: '2', name: 'الرياضيات', grade: Grade.G1, maxContinuous: 20, maxExam: 80, passPercentage: 50 },
  { id: '3', name: 'العلوم', grade: Grade.G1, maxContinuous: 20, maxExam: 80, passPercentage: 50 }
];

const DEFAULT_YEARS: AcademicYear[] = [
  { id: 'y1', name: '2023 / 2024', isActive: false },
  { id: 'y2', name: '2024 / 2025', isActive: true }
];

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: "مدرسة المستقبل الرسمية",
  directorate: "مديرية التربية والتعليم",
  principal: "أ/ محمد علي"
};

export const DB = {
  getStudents: (): Student[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]'),
  saveStudents: (students: Student[]) => localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)),
  
  getSubjects: (): Subject[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return data ? JSON.parse(data) : DEFAULT_SUBJECTS;
  },
  saveSubjects: (subjects: Subject[]) => localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects)),
  
  getGrades: (): GradeRecord[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]'),
  saveGrades: (grades: GradeRecord[]) => localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades)),
  
  getSettings: (): SchoolSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  },
  saveSettings: (settings: SchoolSettings) => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)),

  getAcademicYears: (): AcademicYear[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    return data ? JSON.parse(data) : DEFAULT_YEARS;
  },
  saveAcademicYears: (years: AcademicYear[]) => localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(years)),
  
  getActiveYear: (): AcademicYear | undefined => {
    return DB.getAcademicYears().find(y => y.isActive);
  },

  // ميزات النسخ الاحتياطي
  exportData: () => {
    const fullBackup: Record<string, string | null> = {};
    Object.entries(STORAGE_KEYS).forEach(([_, key]) => {
      fullBackup[key] = localStorage.getItem(key);
    });
    return JSON.stringify(fullBackup);
  },

  importData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      // التحقق من صحة الملف (يجب أن يحتوي على مفاتيح النظام)
      const keys = Object.values(STORAGE_KEYS);
      const dataKeys = Object.keys(data);
      
      const isValid = keys.some(k => dataKeys.includes(k));
      if (!isValid) return false;

      Object.entries(data).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          localStorage.setItem(key, value);
        }
      });
      return true;
    } catch (e) {
      console.error('Backup Import Error:', e);
      return false;
    }
  }
};
