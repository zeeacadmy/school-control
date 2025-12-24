
export enum Grade {
  G1 = "الصف الأول",
  G2 = "الصف الثاني",
  G3 = "الصف الثالث",
  G4 = "الصف الرابع",
  G5 = "الصف الخامس",
  G6 = "الصف السادس",
  G7 = "الصف السابع",
  G8 = "الصف الثامن",
  G9 = "الصف التاسع",
  G10 = "الصف العاشر",
  G11 = "الصف الحادي عشر",
  G12 = "الصف الثاني عشر"
}

export interface LevelRange {
  name: string;
  minPercent: number;
  color?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Student {
  id: string;
  name: string;
  grade: Grade;
  section: string;
  religion?: 'muslim' | 'christian';
  seatingNumber?: number;
  academicYearId?: string;
  photoUrl?: string; // صورة الطالب
}

export interface Subject {
  id: string;
  name: string;
  grade: Grade;
  maxContinuous: number;
  maxExam: number;
  passPercentage: number;
  levelScale?: LevelRange[];
}

export interface GradeRecord {
  studentId: string;
  subjectId: string;
  term: 1 | 2;
  continuous: number;
  exam: number;
  absent: boolean;
  continuousAbsent?: boolean;
  examAbsent?: boolean;
  academicYearId?: string;
}

export interface SchoolSettings {
  schoolName: string;
  directorate: string;
  principal: string;
  collectorName?: string;
  controlHeadName?: string;
  logoUrl?: string;
  theme?: 'light' | 'dark'; // سمة النظام
}

export interface ReportData {
  student: Student;
  subjects: {
    subject: Subject;
    t1: GradeRecord;
    t2: GradeRecord;
    total: number;
    status: 'pass' | 'fail_t1' | 'fail_t2' | 'fail_both' | 'fail_absent' | 'exempt';
  }[];
  finalStatus: 'ناجح' | 'دور ثاني' | 'راسب';
}
