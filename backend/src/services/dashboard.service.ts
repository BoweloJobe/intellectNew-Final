import { prisma } from '../lib/prisma.js'
import type {
  AdminDashboardStat,
  AdminActivityItem,
  RevenueDataPoint,
  UserGrowthDataPoint,
  TopCourseItem,
  InstructorDashboardStat,
  InstructorEngagementDataPoint,
  InstructorCoursePerformanceItem,
  InstructorSubmissionItem,
} from '../types/dashboard.types.js'

const COMPLETED_PAYMENT_STATUS = 'COMPLETED'

// ─── Instructor ───────────────────────────────────────────────────────────────

export interface InstructorDashboardPayload {
  stats: InstructorDashboardStat[]
  engagementData: InstructorEngagementDataPoint[]
  courses: InstructorCoursePerformanceItem[]
  recentSubmissions: InstructorSubmissionItem[]
}

export async function getInstructorDashboard(instructorId: string): Promise<InstructorDashboardPayload> {
  const myCourses = await prisma.course.findMany({
    where: { instructorId },
    select: {
      id: true,
      title: true,
      status: true,
      enrollments: {
        select: { userId: true, completedAt: true, enrolledAt: true },
      },
    },
  })

  const myCourseIds = myCourses.map((c) => c.id)

  // Lessons with quiz attempts for all my courses
  const lessons = myCourseIds.length === 0 ? [] : await prisma.lesson.findMany({
    where: { courseId: { in: myCourseIds } },
    select: {
      id: true,
      courseId: true,
      quiz: {
        select: {
          id: true,
          title: true,
          attempts: {
            select: {
              id: true,
              score: true,
              submittedAt: true,
              user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      },
    },
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allEnrollments = myCourses.flatMap((c) => c.enrollments)
  const distinctStudents = new Set(allEnrollments.map((e) => e.userId)).size
  const publishedCourses = myCourses.filter((c) => c.status === 'APPROVED').length
  const pendingReviewCourses = myCourses.filter((c) => c.status === 'PENDING_REVIEW').length

  const allAttempts = lessons.flatMap((l) => l.quiz?.attempts ?? [])
  const avgScore =
    allAttempts.length > 0
      ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length)
      : 0

  const stats: InstructorDashboardStat[] = [
    { label: 'Total Students', value: String(distinctStudents), trend: '', icon: 'users' },
    { label: 'Published Courses', value: String(publishedCourses), trend: '', icon: 'book-open' },
    { label: 'Courses in Review', value: String(pendingReviewCourses), trend: '', icon: 'file-check' },
    {
      label: 'Avg Quiz Score',
      value: avgScore > 0 ? `${avgScore}%` : '—',
      trend: '',
      icon: 'trending-up',
    },
  ]

  // ── Weekly engagement (last 8 weeks) ──────────────────────────────────────
  function getMondayOf(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay() // 0=Sun … 6=Sat
    const diff = day === 0 ? -6 : 1 - day // roll back to Monday
    d.setDate(d.getDate() + diff)
    return d
  }

  const weeklyMap: Record<string, number> = {}
  const eightWeeksAgo = getMondayOf(new Date())
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7)

  for (const e of allEnrollments) {
    const enrolledAt = new Date(e.enrolledAt)
    if (enrolledAt < eightWeeksAgo) continue
    const weekStart = getMondayOf(enrolledAt)
    const key = weekStart.toISOString().slice(0, 10)
    weeklyMap[key] = (weeklyMap[key] ?? 0) + 1
  }

  const engagementData: InstructorEngagementDataPoint[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = getMondayOf(new Date())
    weekStart.setDate(weekStart.getDate() - i * 7)
    const key = weekStart.toISOString().slice(0, 10)
    engagementData.push({ week: `W${9 - i}`, students: weeklyMap[key] ?? 0 })
  }

  // ── Course performance (approved only) ────────────────────────────────────
  const courses: InstructorCoursePerformanceItem[] = myCourses
    .filter((c) => c.status === 'APPROVED')
    .map((c) => {
      const courseLessons = lessons.filter((l) => l.courseId === c.id)
      const courseAttempts = courseLessons.flatMap((l) => l.quiz?.attempts ?? [])
      const avgCourseScore =
        courseAttempts.length > 0
          ? Math.round(courseAttempts.reduce((sum, a) => sum + a.score, 0) / courseAttempts.length)
          : 0
      const completedCount = c.enrollments.filter((e) => e.completedAt != null).length
      const completionPct =
        c.enrollments.length > 0
          ? Math.round((completedCount / c.enrollments.length) * 100)
          : 0
      return {
        id: c.id,
        title: c.title,
        students: c.enrollments.length,
        avgScore: avgCourseScore,
        completion: completionPct,
      }
    })
    .sort((a, b) => b.students - a.students)

  // ── Recent quiz submissions ────────────────────────────────────────────────
  const courseById = Object.fromEntries(myCourses.map((c) => [c.id, c.title]))
  const recentSubmissions: InstructorSubmissionItem[] = allAttempts
    .slice() // allAttempts already sorted desc by submittedAt per quiz — re-sort globally
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 10)
    .map((attempt) => {
      const lesson = lessons.find((l) => l.quiz?.attempts.some((a) => a.id === attempt.id))
      const courseTitle = lesson ? courseById[lesson.courseId] ?? 'Unknown Course' : 'Unknown Course'
      const quizTitle = lesson?.quiz?.title ?? 'Quiz'
      return {
        id: attempt.id,
        student: `${attempt.user.firstName} ${attempt.user.lastName}`,
        assignment: quizTitle,
        course: courseTitle,
        submitted: new Date(attempt.submittedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        status: 'graded' as const,
      }
    })

  return { stats, engagementData, courses, recentSubmissions }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminDashboardPayload {
  stats: AdminDashboardStat[]
  revenueData: RevenueDataPoint[]
  userGrowth: UserGrowthDataPoint[]
  recentActivities: AdminActivityItem[]
  topCourses: TopCourseItem[]
}

export async function getAdminDashboard(): Promise<AdminDashboardPayload> {
  const [totalUsers, totalCourses, totalEnrollments, revenueAgg] = await Promise.all([
    prisma.user.count(),
    prisma.course.count({ where: { status: 'APPROVED' } }),
    prisma.enrollment.count(),
    prisma.payment.aggregate({ where: { status: COMPLETED_PAYMENT_STATUS }, _sum: { amount: true } }),
  ])

  const totalRevenue = revenueAgg._sum.amount ?? 0

  // Completed payments for monthly revenue chart
  const payments = await prisma.payment.findMany({
    where: { status: COMPLETED_PAYMENT_STATUS, capturedAt: { not: null } },
    select: { amount: true, capturedAt: true },
  })

  // All users for growth chart
  const users = await prisma.user.findMany({ select: { createdAt: true } })

  // Build last-12-month labels
  const now = new Date()
  const monthLabels: Array<{ key: string; label: string }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short' })
    monthLabels.push({ key, label })
  }

  // Group payments by YYYY-MM
  const revenueMap: Record<string, number> = {}
  for (const p of payments) {
    if (!p.capturedAt) continue
    const d = new Date(p.capturedAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueMap[key] = (revenueMap[key] ?? 0) + p.amount
  }

  // Group users by YYYY-MM
  const userMap: Record<string, number> = {}
  for (const u of users) {
    const d = new Date(u.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    userMap[key] = (userMap[key] ?? 0) + 1
  }

  const revenueData: RevenueDataPoint[] = monthLabels.map(({ key, label }) => ({
    month: label,
    revenue: Math.round((revenueMap[key] ?? 0) * 100) / 100,
  }))

  const userGrowth: UserGrowthDataPoint[] = monthLabels.map(({ key, label }) => ({
    month: label,
    users: userMap[key] ?? 0,
  }))

  // Recent platform activity from notifications (all users)
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, type: true, body: true, createdAt: true },
  })

  const nowMs = Date.now()
  const recentActivities: AdminActivityItem[] = notifications.map((n) => {
    const minutesAgo = Math.max(0, Math.round((nowMs - new Date(n.createdAt).getTime()) / 60_000))
    let time: string
    if (minutesAgo < 60) {
      time = `${minutesAgo} min ago`
    } else if (minutesAgo < 1440) {
      time = `${Math.round(minutesAgo / 60)}h ago`
    } else {
      time = `${Math.round(minutesAgo / 1440)}d ago`
    }
    const type = n.type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
    return { id: n.id, type, detail: n.body, time, minutesAgo }
  })

  // Top courses by enrollment count
  const topCoursesRaw = await prisma.course.findMany({
    where: { status: 'APPROVED' },
    select: {
      id: true,
      title: true,
      _count: { select: { enrollments: true } },
      payments: { where: { status: COMPLETED_PAYMENT_STATUS }, select: { amount: true } },
    },
    orderBy: { enrollments: { _count: 'desc' } },
    take: 5,
  })

  const topCourses: TopCourseItem[] = topCoursesRaw.map((c) => {
    const revenue = c.payments.reduce((sum, p) => sum + p.amount, 0)
    return {
      id: c.id,
      title: c.title,
      students: c._count.enrollments,
      revenue: `$${revenue.toFixed(2)}`,
    }
  })

  const stats: AdminDashboardStat[] = [
    { label: 'Total Users', value: String(totalUsers), trend: '', icon: 'users' },
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, trend: '', icon: 'dollar-sign' },
    { label: 'Published Courses', value: String(totalCourses), trend: '', icon: 'book-open' },
    { label: 'Enrollments', value: String(totalEnrollments), trend: '', icon: 'activity' },
  ]

  return { stats, revenueData, userGrowth, recentActivities, topCourses }
}
