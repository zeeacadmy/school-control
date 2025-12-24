
import { Student, Subject, GradeRecord, ReportData, LevelRange } from '../types';

export interface TermStatus {
  subject: Subject;
  score: number;
  maxScore: number;
  status: 'pass' | 'fail' | 'absent' | 'exempt';
  isAbsent: boolean;
  percentage: number;
  level: string;
}

export interface DetailedReportData extends ReportData {
  term1Results: TermStatus[];
  term2Results: TermStatus[];
  term1Percentage: number;
  term2Percentage: number;
  finalPercentage: number;
  finalLevel: string;
}

const DEFAULT_SCALE: LevelRange[] = [
  { name: 'ممتاز', minPercent: 90, color: 'text-emerald-600' },
  { name: 'جيد جداً', minPercent: 80, color: 'text-blue-600' },
  { name: 'جيد', minPercent: 65, color: 'text-indigo-600' },
  { name: 'مقبول', minPercent: 50, color: 'text-amber-600' },
  { name: 'ضعيف', minPercent: 0, color: 'text-red-600' },
];

export const getLevel = (score: number, maxScore: number, scale?: LevelRange[]) => {
  if (maxScore <= 0) return { name: '---', color: 'text-gray-400' };
  const percent = (score / maxScore) * 100;
  const activeScale = scale && scale.length > 0 ? scale : DEFAULT_SCALE;
  
  const sortedScale = [...activeScale].sort((a, b) => b.minPercent - a.minPercent);
  const found = sortedScale.find(range => percent >= range.minPercent);
  
  return found || { name: 'غير محدد', color: 'text-gray-400' };
};

// وظيفة مساعدة للتحقق مما إذا كانت المادة هي مادة إسلامية
export const isIslamicSubject = (name: string): boolean => {
  const islamicKeywords = ['إسلامية', 'الدين الإسلامي', 'التربية الإسلامية', 'القرآن'];
  return islamicKeywords.some(keyword => name.includes(keyword));
};

export const calculateStudentStatus = (
  student: Student,
  subjects: Subject[],
  grades: GradeRecord[]
): DetailedReportData => {
  const studentGrades = grades.filter(g => g.studentId === student.id);
  
  const term1Results: TermStatus[] = [];
  const term2Results: TermStatus[] = [];

  const subjectAnalyses = subjects.map(sub => {
    const isExempt = student.religion === 'christian' && isIslamicSubject(sub.name);

    const t1 = studentGrades.find(g => g.subjectId === sub.id && g.term === 1) || 
               { studentId: student.id, subjectId: sub.id, term: 1, continuous: 0, exam: 0, absent: false };
    const t2 = studentGrades.find(g => g.subjectId === sub.id && g.term === 2) || 
               { studentId: student.id, subjectId: sub.id, term: 2, continuous: 0, exam: 0, absent: false };
    
    const maxTermTotal = sub.maxContinuous + sub.maxExam;
    const passThresholdPercent = sub.passPercentage ?? 50;
    const termPassThreshold = (maxTermTotal * passThresholdPercent) / 100;

    const calcTerm = (t: GradeRecord) => {
      if (isExempt) {
        return {
          subject: sub, score: 0, maxScore: 0, isAbsent: false, percentage: 0, level: 'معفى', status: 'exempt' as const
        };
      }

      const score = (t.continuousAbsent ? 0 : t.continuous) + (t.examAbsent ? 0 : t.exam);
      const isPartiallyAbsent = t.continuousAbsent || t.examAbsent;
      const isFullyAbsent = t.absent;
      
      const level = getLevel(score, maxTermTotal, sub.levelScale);
      
      let status: 'pass' | 'fail' | 'absent' | 'exempt';
      if (isFullyAbsent) {
        status = 'absent';
      } else if (isPartiallyAbsent) {
        status = 'fail'; 
      } else {
        status = score >= termPassThreshold ? 'pass' : 'fail';
      }

      return {
        subject: sub,
        score,
        maxScore: maxTermTotal,
        isAbsent: isFullyAbsent || isPartiallyAbsent,
        percentage: maxTermTotal > 0 ? (score / maxTermTotal) * 100 : 0,
        level: level.name,
        status
      };
    };

    const t1Analysis = calcTerm(t1);
    const t2Analysis = calcTerm(t2);
    term1Results.push(t1Analysis);
    term2Results.push(t2Analysis);

    let status: 'pass' | 'fail_t1' | 'fail_t2' | 'fail_both' | 'fail_absent' | 'exempt' = 'pass';
    
    if (isExempt) {
      status = 'exempt';
    } else if (t1.absent || t2.absent || t1.examAbsent || t2.examAbsent || t1.continuousAbsent || t2.continuousAbsent) {
      status = 'fail_absent';
    } else {
      const t1Fail = t1Analysis.status === 'fail';
      const t2Fail = t2Analysis.status === 'fail';

      if (t1Fail && t2Fail) status = 'fail_both';
      else if (t1Fail) status = 'fail_t1';
      else if (t2Fail) status = 'fail_t2';
      else status = 'pass';
    }

    const finalScoreAverage = isExempt ? 0 : (t1Analysis.score + t2Analysis.score) / 2;

    return { 
      subject: sub, t1, t2, total: finalScoreAverage, status, t1Analysis, t2Analysis
    };
  });

  const calcTermTotalPercentage = (results: TermStatus[]) => {
    let totalScore = 0;
    let totalMax = 0;
    results.forEach(r => {
      if (r.status !== 'exempt') {
        totalScore += r.score;
        totalMax += r.maxScore;
      }
    });
    return totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  };

  const term1Percentage = calcTermTotalPercentage(term1Results);
  const term2Percentage = calcTermTotalPercentage(term2Results);
  const finalPercentage = (term1Percentage + term2Percentage) / 2;

  const hasFailure = subjectAnalyses.some(s => s.status !== 'pass' && s.status !== 'exempt');
  const finalStatus = hasFailure ? 'دور ثاني' : 'ناجح';
  const finalLevelObj = getLevel(finalPercentage, 100);

  return {
    student,
    subjects: subjectAnalyses.map(s => ({
        subject: s.subject,
        t1: s.t1,
        t2: s.t2,
        total: s.total,
        status: s.status
    })),
    term1Results,
    term2Results,
    term1Percentage,
    term2Percentage,
    finalStatus,
    finalPercentage,
    finalLevel: finalLevelObj.name
  };
};
