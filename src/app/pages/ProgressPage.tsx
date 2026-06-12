import { useEffect, useMemo, useState } from "react";
import { DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { Progress } from "../components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Clock, Trophy, Target, Flame } from "lucide-react";
import type { Course } from "../models/courses";
import { getCoursesPageData } from "../services/courses.service";
import { useCoursesState } from "../state/courses/CoursesStateContext";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";
import { useProgressStats } from "../hooks/useProgressStats";
import { useNotificationsState } from "../state/notifications/NotificationsStateContext";

type WeaknessSeverity = "high" | "medium" | "low";

type WeaknessMapItem = {
  subject: string;
  mastery: number;
  gap: number;
  severity: WeaknessSeverity;
  suggestion: string;
};

export function ProgressPage() {
  const {
    state: { enrolledCourseIds, courseProgress, courseLessonProgress, courseTitles, recentlyAccessedCourses },
    getCourseProgressSummary,
  } = useCoursesState();
  const {
    state: { weeklySnapshot },
  } = useDashboardState();
  const { completionCounts, realStudyHours, realCurrentStreak, studyDaysThisWeek } = useProgressStats();
  const {
    state: { recentActivity },
  } = useNotificationsState();
  const { errorMessage, isError, run: runLoadProgress } = useAsyncViewState({
    defaultErrorMessage: "Progress data is unavailable right now. Retry to reload your analytics.",
  });
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);

  useEffect(() => {
    void runLoadProgress(async () => {
      const data = await getCoursesPageData();
      setCatalogCourses(data.courses);
      return data;
    });
  }, [runLoadProgress]);

  // ── Weekly study activity: lesson sessions + quiz completions ───────────────
  const weeklyData = useMemo(() => {
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dateStr = d.toDateString();
      const lessonSessions = recentlyAccessedCourses.filter(
        (c) => c.lastAccessedAt && new Date(c.lastAccessedAt).toDateString() === dateStr,
      ).length;
      const quizSessions = recentActivity.filter(
        (a) => a.kind === "quiz-completed" && new Date(a.createdAt).toDateString() === dateStr,
      ).length;
      // Lessons ≈ 20 min each; quizzes ≈ 12 min each
      const hours = Math.round((lessonSessions * 20 / 60 + quizSessions * 12 / 60) * 10) / 10;
      return { day: dayAbbr[d.getDay()], hours };
    });
  }, [recentlyAccessedCourses, recentActivity]);

  // ── Monthly quiz score trend: single real point when quizzes have been taken
  const monthlyScores = useMemo(() => {
    if (weeklySnapshot.quizzesTaken === 0) return [];
    const month = new Date().toLocaleDateString("en-US", { month: "short" });
    return [{ month, score: weeklySnapshot.averageQuizScore }];
  }, [weeklySnapshot.averageQuizScore, weeklySnapshot.quizzesTaken]);

  // ── Subject mastery derived from enrolled course progress by category ─────
  const subjectMastery = useMemo(() => {
    if (catalogCourses.length === 0 || enrolledCourseIds.length === 0) return [];
    const SUBJECT_COLORS: Record<string, string> = {
      Biology: "#4a9ff5",
      Chemistry: "#0d6efd",
      Physics: "#6bb6ff",
      Mathematics: "#2e8ef7",
    };
    const categoryProgress: Record<string, number[]> = {};
    for (const courseId of enrolledCourseIds) {
      const course = catalogCourses.find((c) => c.id === courseId);
      if (!course) continue;
      const progress = courseProgress[courseId] ?? 0;
      const values = categoryProgress[course.category] ?? [];
      values.push(progress);
      categoryProgress[course.category] = values;
    }
    return Object.entries(categoryProgress).map(([category, progresses]) => ({
      subject: category,
      value: Math.round(progresses.reduce((sum, p) => sum + p, 0) / progresses.length),
      color: SUBJECT_COLORS[category] ?? "#4a9ff5",
    }));
  }, [catalogCourses, enrolledCourseIds, courseProgress]);

  // ── Strengths / focus areas derived from subject mastery + quiz scores ──────
  const strengths = useMemo(() => {
    const courseStrengths = subjectMastery
      .filter((s) => s.value >= 80)
      .map((s) => `Strong performance in ${s.subject} (${s.value}% mastery)`);

    // Quiz-derived strengths: subjects not already covered by course data
    const coveredSubjects = new Set(subjectMastery.map((s) => s.subject));
    const quizStrengths = Object.entries(weeklySnapshot.quizScoresBySubject)
      .filter(([subject, score]) => score >= 80 && !coveredSubjects.has(subject))
      .map(([subject, score]) => `Strong quiz performance in ${subject} (${score}% avg)`);

    return [...courseStrengths, ...quizStrengths];
  }, [subjectMastery, weeklySnapshot.quizScoresBySubject]);

  const focusAreas = useMemo(() => {
    const courseFocus = subjectMastery
      .filter((s) => s.value < 75)
      .map((s) => `Review ${s.subject} topics — currently at ${s.value}% mastery`);

    // Quiz-derived focus areas: subjects not already covered by course data with low scores
    const coveredSubjects = new Set(subjectMastery.map((s) => s.subject));
    const quizFocus = Object.entries(weeklySnapshot.quizScoresBySubject)
      .filter(([subject, score]) => score < 75 && !coveredSubjects.has(subject))
      .map(([subject, score]) => `Quiz results show gaps in ${subject} — ${score}% avg`);

    return [...courseFocus, ...quizFocus];
  }, [subjectMastery, weeklySnapshot.quizScoresBySubject]);

  // Pie chart: always derived from CoursesState enrollment progress (canonical source)
  const derivedPieData = useMemo(() => {
    if (completionCounts.total === 0) {
      return [];
    }

    const completedPercent = Math.round((completionCounts.completed / completionCounts.total) * 100);
    const inProgressPercent = Math.round((completionCounts.inProgress / completionCounts.total) * 100);
    const notStartedPercent = Math.max(0, 100 - completedPercent - inProgressPercent);

    return [
      { name: "Completed", value: completedPercent, color: "#4a9ff5" },
      { name: "In Progress", value: inProgressPercent, color: "#6bb6ff" },
      { name: "Not Started", value: notStartedPercent, color: "#e5e7eb" },
    ];
  }, [completionCounts]);

  const derivedStats = useMemo(() => {
    const totalCompletedLessons = Object.values(courseLessonProgress)
      .reduce((sum, progress) => sum + (progress.completedLessons ?? progress.completedLessonIds.length), 0);
    const totalLessons = Object.values(courseLessonProgress)
      .reduce((sum, progress) => sum + (progress.totalLessons ?? progress.completedLessonIds.length), 0);
    const courseCompletionPct = completionCounts.total > 0
      ? Math.round((completionCounts.completed / completionCounts.total) * 100)
      : 0;

    const totalQuizzesTaken = weeklySnapshot.quizzesTaken;
    return [
      {
        label: "Total Study Hours",
        value: `${realStudyHours}h`,
        trend: `${totalCompletedLessons}/${totalLessons} lessons · ${totalQuizzesTaken} quizzes`,
      },
      {
        label: "Avg. Quiz Score",
        value: `${weeklySnapshot.averageQuizScore}%`,
        trend: `${weeklySnapshot.quizzesTaken} quizzes`,
      },
      {
        label: "Current Streak",
        value: `${realCurrentStreak} days`,
        trend: `${studyDaysThisWeek}/7 study days`,
      },
      {
        label: "Goals Completed",
        value: `${completionCounts.completed}/${completionCounts.total}`,
        trend: `${courseCompletionPct}%`,
      },
    ];
  }, [completionCounts, courseLessonProgress, realStudyHours, realCurrentStreak, studyDaysThisWeek, weeklySnapshot]);

  const courseBreakdown = useMemo(() => {
    return enrolledCourseIds.map((courseId) => {
      const course = catalogCourses.find((item) => item.id === courseId);
      const summary = getCourseProgressSummary(courseId, course?.totalLessons ?? courseLessonProgress[courseId]?.totalLessons ?? 0);

      return {
        courseId,
        title: course?.title ?? courseTitles[courseId] ?? "Course",
        progress: summary.progress,
        completedLessons: summary.completedLessons,
        totalLessons: summary.totalLessons,
        currentModule: summary.currentModule,
      };
    });
  }, [catalogCourses, courseLessonProgress, courseTitles, enrolledCourseIds, getCourseProgressSummary]);

  const weaknessMap = useMemo<WeaknessMapItem[]>(() => {
    const focusLookup = focusAreas.map((item) => item.toLowerCase());

    // Start with course-derived subject mastery
    const courseItems = [...subjectMastery];

    // Merge quiz-derived subjects not already in course mastery
    const coveredSubjects = new Set(courseItems.map((s) => s.subject));
    const quizItems = Object.entries(weeklySnapshot.quizScoresBySubject)
      .filter(([subject]) => !coveredSubjects.has(subject))
      .map(([subject, score]) => ({ subject, value: score, color: "#4a9ff5" }));

    return [...courseItems, ...quizItems]
      .sort((left, right) => left.value - right.value)
      .slice(0, 4)
      .map((item) => {
        const normalizedSubject = item.subject.toLowerCase();
        const matchingSuggestion = focusAreas.find((focusItem) => focusItem.toLowerCase().includes(normalizedSubject));

        let severity: WeaknessSeverity = "low";

        if (item.value < 70) {
          severity = "high";
        } else if (item.value < 80) {
          severity = "medium";
        }

        return {
          subject: item.subject,
          mastery: item.value,
          gap: Math.max(0, 100 - item.value),
          severity,
          suggestion: matchingSuggestion
            ?? (focusLookup.length > 0 ? `Targeted review needed in ${item.subject}.` : `Practice ${item.subject} with a short daily revision block.`),
        };
      });
  }, [focusAreas, subjectMastery, weeklySnapshot.quizScoresBySubject]);

  const weaknessSummary = useMemo(() => {
    if (weaknessMap.length === 0) {
      return "No weakness signals yet. Complete more assessments to generate insights.";
    }

    const highestRisk = weaknessMap.find((item) => item.severity === "high") ?? weaknessMap[0];

    return `${highestRisk.subject} is your highest-priority improvement area right now.`;
  }, [weaknessMap]);

  const weaknessSeverityStyles: Record<WeaknessSeverity, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-emerald-100 text-emerald-700",
  };

  const getStatIcon = (label: string) => {
    switch (label) {
      case "Total Study Hours":
        return <Clock className="w-6 h-6" />;
      case "Avg. Quiz Score":
        return <Trophy className="w-6 h-6" />;
      case "Current Streak":
        return <Flame className="w-6 h-6" />;
      case "Goals Completed":
        return <Target className="w-6 h-6" />;
      default:
        return <TrendingUp className="w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">Learning Progress</h1>
        <p className="text-lg text-gray-700">Track your academic journey and achievements</p>
      </div>

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Progress data is unavailable right now. Retry to reload your analytics."}
            onRetry={() => {
              void runLoadProgress(async () => {
                const data = await getCoursesPageData();
                setCatalogCourses(data.courses);
                return data;
              });
            }}
            retryLabel="Reload Progress"
          />
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {derivedStats.map((stat, index) => (
          <GlassCard key={index}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#4a9ff5]">{getStatIcon(stat.label)}</div>
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingUp className="w-4 h-4" />
                {stat.trend}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mb-8">
        <h3 className="text-xl font-semibold mb-6 text-gray-900">Course Progress</h3>
        {courseBreakdown.length === 0 ? (
          <p className="text-sm text-gray-600">No enrolled courses yet. Enroll in a course to start tracking lesson progress.</p>
        ) : (
          <div className="space-y-5">
            {courseBreakdown.map((course) => (
              <div key={course.courseId}>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{course.title}</p>
                    <p className="text-xs text-gray-500">
                      {course.completedLessons}/{course.totalLessons} lessons complete
                      {course.currentModule
                        ? ` · Current module: ${course.currentModule.completedLessons}/${course.currentModule.totalLessons} lessons`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#4a9ff5]">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Study Time */}
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Weekly Study Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 255, 255, 0.9)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="hours" fill="#4a9ff5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Performance Trend */}
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 255, 255, 0.9)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="score" stroke="#4a9ff5" strokeWidth={3} dot={{ fill: '#4a9ff5', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Mastery */}
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Subject Mastery</h3>
          <div className="space-y-6">
            {subjectMastery.map((subject, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 font-medium">{subject.subject}</span>
                  <span className="text-[#4a9ff5] font-semibold">{subject.value}%</span>
                </div>
                <Progress value={subject.value} className="h-3" />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Course Completion */}
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Course Completion</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={derivedPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {derivedPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {derivedPieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm text-gray-700">{entry.name}: {entry.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Strengths & Weaknesses */}
      <GlassCard className="mt-8">
        <h3 className="text-xl font-semibold mb-6 text-gray-900">AI Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-600 mb-3">Strengths</h4>
            <ul className="space-y-2">
              {strengths.map((item) => (
                <li key={item} className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#4a9ff5] mb-3">Weakness Map</h4>
            <p className="text-sm text-gray-600 mb-4">{weaknessSummary}</p>

            {weaknessMap.length > 0 ? (
              <div className="space-y-3">
                {weaknessMap.map((item) => (
                  <div key={item.subject} className="rounded-lg border border-white/60 bg-white/[0.45] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="font-medium text-gray-900">{item.subject}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${weaknessSeverityStyles[item.severity]}`}>
                        {item.severity === "high" ? "High Priority" : item.severity === "medium" ? "Medium Priority" : "On Track"}
                      </span>
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Mastery {item.mastery}%</span>
                        <span>Gap {item.gap}%</span>
                      </div>
                      <Progress value={item.mastery} className="h-2" />
                    </div>
                    <p className="text-xs text-gray-600">{item.suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No weakness map data yet.</p>
            )}

            {focusAreas.length > 0 ? (
              <div className="mt-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Improvement Guidance</h5>
                <ul className="space-y-2">
                  {focusAreas.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700 text-sm">
                      <div className="w-2 h-2 rounded-full bg-[#4a9ff5]"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
