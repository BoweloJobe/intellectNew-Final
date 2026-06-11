import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { DashboardWidgetSkeleton, ListRowSkeleton, SectionPanelSkeleton } from "../components/skeletons/SectionSkeletons";
import { Button } from "../components/ui/button";
import { getInstructorDashboardData } from "../services/dashboard.service";
import type { InstructorDashboardData } from "../models/dashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, BookOpen, FileCheck, TrendingUp, Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";

export function InstructorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const greetingName = getAuthUserGreetingName(user);
  const { errorMessage, isLoading, isError, run: runLoadDashboard } = useAsyncViewState({
    defaultErrorMessage: "Instructor analytics are unavailable right now. Retry to load student and course activity.",
  });
  const [dashboardData, setDashboardData] = useState<InstructorDashboardData | null>(null);

  const loadDashboard = () => {
    void runLoadDashboard(async () => {
      const data = await getInstructorDashboardData();
      setDashboardData(data);
      return data;
    });
  };

  useEffect(() => {
    loadDashboard();
  }, [runLoadDashboard]);

  const stats = dashboardData?.stats ?? [];
  const engagementData = dashboardData?.engagementData ?? [];
  const courses = dashboardData?.courses ?? [];
  const recentSubmissions = dashboardData?.recentSubmissions ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold mb-2 text-gray-900">Welcome back, {greetingName}</h1>
          <p className="text-lg text-gray-700">Here's how your courses are performing.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white/[0.45]"
            onClick={() => {
              navigate("/instructor/quizzes/new");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Quiz
          </Button>
          <Button
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            onClick={() => {
              navigate("/instructor/courses");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Instructor analytics are unavailable right now. Retry to load student and course activity."}
            onRetry={() => {
              loadDashboard();
            }}
            retryLabel="Retry"
          />
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <DashboardWidgetSkeleton key={`instructor-stat-${index}`} />)
          : !isError && stats.map((stat, index) => (
          <GlassCard key={index}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#4a9ff5]">
                {stat.icon === "users" ? <Users className="w-6 h-6" /> : null}
                {stat.icon === "book-open" ? <BookOpen className="w-6 h-6" /> : null}
                {stat.icon === "file-check" ? <FileCheck className="w-6 h-6" /> : null}
                {stat.icon === "trending-up" ? <TrendingUp className="w-6 h-6" /> : null}
              </div>
            {stat.trend ? (
                <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stat.trend}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Student Engagement */}
        {isLoading ? (
          <SectionPanelSkeleton />
        ) : (
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Student Engagement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 255, 255, 0.9)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="students" fill="#4a9ff5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
          )}

        {/* Course Performance */}
          {isLoading ? (
            <SectionPanelSkeleton />
          ) : (
          <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Course Performance</h3>
          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No course performance data"
              description="Publish your first course to start tracking student outcomes and completion rates."
              action={(
                <Button
                  className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]"
                  onClick={() => {
                    navigate("/instructor/courses");
                  }}
                >
                  New Course
                </Button>
              )}
            />
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 rounded-xl bg-white/[0.45] border border-white/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{course.title}</h4>
                    <span className="text-sm text-gray-600">{course.students} students</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Avg. Score</p>
                      <p className="text-lg font-semibold text-[#4a9ff5]">{course.avgScore}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completion</p>
                      <p className="text-lg font-semibold text-[#4a9ff5]">{course.completion}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        )}
      </div>

      {/* Recent Submissions */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Recent Submissions</h3>
          <Button
            variant="ghost"
            className="text-[#4a9ff5]"
            onClick={() => {
              navigate("/instructor/courses");
            }}
          >
            View all
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <ListRowSkeleton key={`submissions-loading-${index}`} />
            ))}
          </div>
        ) : recentSubmissions.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No submissions to review"
            description="New assignment submissions will show up here when students turn in their work."
          />
        ) : (
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 rounded-xl bg-white/[0.45] border border-white/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${submission.student}`}
                    alt={submission.student}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{submission.student}</h4>
                    <p className="text-sm text-gray-600">{submission.assignment} • {submission.course}</p>
                    <p className="text-xs text-gray-500">{submission.submitted}</p>
                  </div>
                </div>

                {submission.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Manual grading is not available yet. Quiz attempts are graded automatically when submitted."
                  >
                    Manual grading unavailable
                  </Button>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Graded
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
