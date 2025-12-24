
import { Student, Subject, GradeRecord, SchoolSettings, Grade, AcademicYear } from './types.ts';

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
  principal: "أ/ محمد علي",
  theme: 'light'
};

export const DB = {
  getStudents: (): Student[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
    } catch(e) { return []; }
  },
  saveStudents: (students: Student[]) => localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)),
  
  getSubjects: (): Subject[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    try {
      return data ? JSON.parse(data) : DEFAULT_SUBJECTS;
    } catch(e) { return DEFAULT_SUBJECTS; }
  },
  saveSubjects: (subjects: Subject[]) => localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects)),
  
  getGrades: (): GradeRecord[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.GRADES) || '[]');
    } catch(e) { return []; }
  },
  saveGrades: (grades: GradeRecord[]) => localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grades)),
  
  getSettings: (): SchoolSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    try {
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch(e) { return DEFAULT_SETTINGS; }
  },
  saveSettings: (settings: SchoolSettings) => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)),

  getAcademicYears: (): AcademicYear[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    try {
      return data ? JSON.parse(data) : DEFAULT_YEARS;
    } catch(e) { return DEFAULT_YEARS; }
  },
  saveAcademicYears: (years: AcademicYear[]) => localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(years)),
  
  getActiveYear: (): AcademicYear | undefined => {
    return DB.getAcademicYears().find(y => y.isActive);
  }
};
