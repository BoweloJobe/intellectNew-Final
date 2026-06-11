import type {
  AdminDashboardData,
  InstructorDashboardData,
  StudentDashboardData,
} from "../models/dashboard";

function futureDateLabel(daysFromNow: number, time: string): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

export const studentDashboardMock: StudentDashboardData = {
  stats: [
    { label: "Courses Enrolled", value: "3", key: "courses-enrolled" },
    { label: "Completed", value: "0", key: "completed" },
    { label: "Study Hours", value: "18", key: "study-hours" },
    { label: "Current Streak", value: "4", key: "current-streak" },
  ],
  continueLearning: [
    {
      courseId: "1",
      resumeLessonId: "bio-l9",
      title: "Advanced Biology",
      progress: 0,
      lesson: "DNA Structure",
      duration: "18 min left",
    },
    {
      courseId: "4",
      resumeLessonId: "phys-l1",
      title: "Quantum Physics",
      progress: 0,
      lesson: "Introduction to Quantum Mechanics",
      duration: "20 min left",
    },
  ],
  upcomingQuizzes: [
    { subject: "Biology", topic: "Cell Structure", date: "Tomorrow, 2:00 PM", difficulty: "Medium" },
    { subject: "Chemistry", topic: "Organic Compounds", date: futureDateLabel(3, "10:00 AM"), difficulty: "Hard" },
    { subject: "Physics", topic: "Quantum Mechanics", date: futureDateLabel(5, "3:00 PM"), difficulty: "Easy" },
  ],
  recommendations: [
    { title: "DNA Structure & Function", category: "Biology", duration: "45 min" },
    { title: "Advanced Calculus", category: "Mathematics", duration: "60 min" },
    { title: "Molecular Biology Basics", category: "Biology", duration: "30 min" },
  ],
};

export const adminDashboardMock: AdminDashboardData = {
  stats: [
    { label: "Total Users", value: "12,453", icon: "users", trend: "+18%" },
    { label: "Monthly Revenue", value: "$45,231", icon: "dollar-sign", trend: "+23%" },
    { label: "Active Courses", value: "342", icon: "book-open", trend: "+12" },
    { label: "Platform Health", value: "99.8%", icon: "activity", trend: "Excellent" },
  ],
  revenueData: [
    { month: "Jan", revenue: 32000 },
    { month: "Feb", revenue: 35000 },
    { month: "Mar", revenue: 38000 },
    { month: "Apr", revenue: 41000 },
    { month: "May", revenue: 43000 },
    { month: "Jun", revenue: 45231 },
  ],
  userGrowth: [
    { month: "Jan", users: 8200 },
    { month: "Feb", users: 9100 },
    { month: "Mar", users: 10300 },
    { month: "Apr", users: 11200 },
    { month: "May", users: 11800 },
    { month: "Jun", users: 12453 },
  ],
  recentActivities: [
    {
      id: "admin-activity-1",
      type: "New User",
      detail: "Sarah Johnson signed up as a student",
      time: "5 min ago",
      minutesAgo: 5,
    },
    {
      id: "admin-activity-2",
      type: "Course Published",
      detail: "Dr. Emily Roberts published 'Advanced Neuroscience'",
      time: "15 min ago",
      minutesAgo: 15,
    },
    {
      id: "admin-activity-3",
      type: "Payment",
      detail: "Pro subscription renewal - $19.99",
      time: "1 hour ago",
      minutesAgo: 60,
    },
    {
      id: "admin-activity-4",
      type: "Issue Resolved",
      detail: "Support ticket #1234 closed",
      time: "2 hours ago",
      minutesAgo: 120,
    },
    {
      id: "admin-activity-5",
      type: "Payment",
      detail: "Enterprise seat renewal - $249.00",
      time: "5 hours ago",
      minutesAgo: 300,
    },
    {
      id: "admin-activity-6",
      type: "New User",
      detail: "Aiden Brooks joined as an instructor",
      time: "7 hours ago",
      minutesAgo: 420,
    },
  ],
  topCourses: [
    { id: "top-course-1", title: "Advanced Biology", students: 1234, revenue: "$12,340" },
    { id: "top-course-2", title: "Organic Chemistry", students: 987, revenue: "$9,870" },
    { id: "top-course-3", title: "Medical Genetics", students: 856, revenue: "$8,560" },
  ],
};

export const instructorDashboardMock: InstructorDashboardData = {
  stats: [
    { label: "Total Students", value: "234", icon: "users", trend: "+12%" },
    { label: "Active Courses", value: "8", icon: "book-open", trend: "+2" },
    { label: "Quiz Attempts", value: "15", icon: "file-check", trend: "" },
    { label: "Avg. Quiz Score", value: "87%", icon: "trending-up", trend: "+5%" },
  ],
  engagementData: [
    { week: "Week 1", students: 180 },
    { week: "Week 2", students: 195 },
    { week: "Week 3", students: 210 },
    { week: "Week 4", students: 234 },
  ],
  courses: [
    { id: "instructor-course-1", title: "Advanced Biology", students: 89, avgScore: 85, completion: 78 },
    { id: "instructor-course-2", title: "Medical Genetics", students: 67, avgScore: 88, completion: 82 },
    { id: "instructor-course-3", title: "Cell Biology Fundamentals", students: 78, avgScore: 82, completion: 75 },
  ],
  recentSubmissions: [
    {
      id: "submission-1",
      student: "Emily Chen",
      assignment: "DNA Replication Quiz",
      course: "Advanced Biology",
      submitted: "2 hours ago",
      status: "graded",
    },
    {
      id: "submission-2",
      student: "Marcus Johnson",
      assignment: "Cell Division Quiz",
      course: "Advanced Biology",
      submitted: "5 hours ago",
      status: "graded",
    },
    {
      id: "submission-3",
      student: "Sarah Williams",
      assignment: "Genetics Problem Set",
      course: "Medical Genetics",
      submitted: "1 day ago",
      status: "graded",
    },
  ],
};
