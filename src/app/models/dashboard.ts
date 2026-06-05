export type DashboardStatKey = "courses-enrolled" | "completed" | "study-hours" | "current-streak";

export interface DashboardStat {
  label: string;
  value: string;
  key: DashboardStatKey;
}

export interface ContinueLearningItem {
  courseId: string;
  resumeLessonId: string;
  title: string;
  progress: number;
  lesson: string;
  duration: string;
}

export type QuizDifficulty = "Easy" | "Medium" | "Hard";

export interface DashboardUpcomingQuiz {
  subject: string;
  topic: string;
  date: string;
  difficulty: QuizDifficulty;
}

export interface DashboardRecommendation {
  title: string;
  category: string;
  duration: string;
}

export interface StudentDashboardData {
  stats: DashboardStat[];
  continueLearning: ContinueLearningItem[];
  upcomingQuizzes: DashboardUpcomingQuiz[];
  recommendations: DashboardRecommendation[];
}

export interface AdminDashboardStat {
  label: string;
  value: string;
  trend: string;
  icon: "users" | "dollar-sign" | "book-open" | "activity";
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export interface UserGrowthDataPoint {
  month: string;
  users: number;
}

export interface AdminActivityItem {
  id: string;
  type: string;
  detail: string;
  time: string;
  minutesAgo: number;
}

export interface TopCourseItem {
  id: string;
  title: string;
  students: number;
  revenue: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStat[];
  revenueData: RevenueDataPoint[];
  userGrowth: UserGrowthDataPoint[];
  recentActivities: AdminActivityItem[];
  topCourses: TopCourseItem[];
}

export interface InstructorDashboardStat {
  label: string;
  value: string;
  trend: string;
  icon: "users" | "book-open" | "file-check" | "trending-up";
}

export interface InstructorEngagementDataPoint {
  week: string;
  students: number;
}

export interface InstructorCoursePerformanceItem {
  id: string;
  title: string;
  students: number;
  avgScore: number;
  completion: number;
}

export interface InstructorSubmissionItem {
  id: string;
  student: string;
  assignment: string;
  course: string;
  submitted: string;
  status: "pending" | "graded";
}

export interface InstructorDashboardData {
  stats: InstructorDashboardStat[];
  engagementData: InstructorEngagementDataPoint[];
  courses: InstructorCoursePerformanceItem[];
  recentSubmissions: InstructorSubmissionItem[];
}
