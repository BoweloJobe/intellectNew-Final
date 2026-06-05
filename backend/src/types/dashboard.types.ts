// Shared dashboard payload types — mirror the frontend model shapes so the
// API response is consumed without transformation.

export interface AdminDashboardStat {
  label: string
  value: string
  trend: string
  icon: 'users' | 'dollar-sign' | 'book-open' | 'activity'
}

export interface RevenueDataPoint {
  month: string
  revenue: number
}

export interface UserGrowthDataPoint {
  month: string
  users: number
}

export interface AdminActivityItem {
  id: string
  type: string
  detail: string
  time: string
  minutesAgo: number
}

export interface TopCourseItem {
  id: string
  title: string
  students: number
  revenue: string
}

export interface InstructorDashboardStat {
  label: string
  value: string
  trend: string
  icon: 'users' | 'book-open' | 'file-check' | 'trending-up'
}

export interface InstructorEngagementDataPoint {
  week: string
  students: number
}

export interface InstructorCoursePerformanceItem {
  id: string
  title: string
  students: number
  avgScore: number
  completion: number
}

export interface InstructorSubmissionItem {
  id: string
  student: string
  assignment: string
  course: string
  submitted: string
  status: 'pending' | 'graded'
}
