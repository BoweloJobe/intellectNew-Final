export interface WeeklyStudyDataPoint {
  day: string;
  hours: number;
}

export interface MonthlyScoreDataPoint {
  month: string;
  score: number;
}

export interface SubjectMasteryDataPoint {
  subject: string;
  value: number;
  color: string;
}

export interface CompletionSplitDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface ProgressStat {
  label: string;
  value: string;
  trend: string;
}

export interface ProgressPageData {
  weeklyData: WeeklyStudyDataPoint[];
  monthlyScores: MonthlyScoreDataPoint[];
  subjectMastery: SubjectMasteryDataPoint[];
  pieData: CompletionSplitDataPoint[];
  stats: ProgressStat[];
  strengths: string[];
  focusAreas: string[];
}
