import type { ProgressPageData } from "../models/progress";

export const progressPageMock: ProgressPageData = {
  weeklyData: [
    { day: "Mon", hours: 3.5 },
    { day: "Tue", hours: 2.8 },
    { day: "Wed", hours: 4.2 },
    { day: "Thu", hours: 3.0 },
    { day: "Fri", hours: 3.8 },
    { day: "Sat", hours: 2.5 },
    { day: "Sun", hours: 1.5 },
  ],
  monthlyScores: [
    { month: "Oct", score: 72 },
    { month: "Nov", score: 78 },
    { month: "Dec", score: 82 },
    { month: "Jan", score: 85 },
    { month: "Feb", score: 87 },
    { month: "Mar", score: 90 },
  ],
  subjectMastery: [
    { subject: "Biology", value: 88, color: "#4a9ff5" },
    { subject: "Chemistry", value: 76, color: "#0d6efd" },
    { subject: "Physics", value: 82, color: "#6bb6ff" },
    { subject: "Mathematics", value: 70, color: "#2e8ef7" },
  ],
  pieData: [
    { name: "Completed", value: 65, color: "#4a9ff5" },
    { name: "In Progress", value: 25, color: "#6bb6ff" },
    { name: "Not Started", value: 10, color: "#e5e7eb" },
  ],
  stats: [
    { label: "Total Study Hours", value: "156h", trend: "+12%" },
    { label: "Avg. Quiz Score", value: "87%", trend: "+8%" },
    { label: "Current Streak", value: "15 days", trend: "New!" },
    { label: "Goals Completed", value: "24/30", trend: "80%" },
  ],
  strengths: [
    "Excellent performance in Biology topics",
    "Consistent study schedule maintained",
    "Strong improvement in quiz scores",
  ],
  focusAreas: [
    "Review Mathematics fundamentals",
    "Practice more Chemistry problem-solving",
    "Increase weekend study time",
  ],
};
