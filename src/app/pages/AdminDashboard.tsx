import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { ListControls, LoadMoreFooter, type ListOption } from "../components/ListControls";
import { DashboardWidgetSkeleton, ListRowSkeleton, SectionPanelSkeleton } from "../components/skeletons/SectionSkeletons";
import { Button } from "../components/ui/button";
import { domainAdapterConfig } from "../api/config/apiConfig";
import { getAdminUsers, updateAdminUserRole } from "../services/admin.service";
import { getAdminDashboardData } from "../services/dashboard.service";
import type { AdminActivityItem, AdminDashboardData } from "../models/dashboard";
import type { AdminUser, AdminUserRole } from "../models/admin";
import type { InstructorManagedCourse } from "../models/courses";
import {
  getCourseModerationQueue,
  reviewCoursePublication,
} from "../services/courses.service";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, DollarSign, BookOpen, Activity, TrendingUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getAuthUserGreetingName } from "../auth/auth-normalizers";
import { ModerationCourseCard } from "../components/admin/ModerationCourseCard";

type ActivitySort = "newest" | "oldest" | "type";
const ADMIN_ROLES: AdminUserRole[] = ["STUDENT", "INSTRUCTOR", "ADMIN"];
const isAdminUserManagementAvailable = domainAdapterConfig.admin === "api";

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    isSubmitting,
    submitError,
    submitSuccess,
    run: runModerationAction,
  } = useAsyncFormSubmission();
  const {
    isSubmitting: isRoleSubmitting,
    submitError: roleSubmitError,
    submitSuccess: roleSubmitSuccess,
    run: runRoleAction,
  } = useAsyncFormSubmission();
  const { errorMessage, isLoading, isError, run: runLoadDashboard } = useAsyncViewState({
    defaultErrorMessage: "Admin analytics could not be loaded. Retry to refresh platform metrics and activity streams.",
  });
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [moderationQueue, setModerationQueue] = useState<InstructorManagedCourse[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AdminUserRole>>({});
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [activityQuery, setActivityQuery] = useState("");
  const [activityTypeFilter, setActivityTypeFilter] = useState("all");
  const [activitySort, setActivitySort] = useState<ActivitySort>("newest");
  const [activityVisibleCount, setActivityVisibleCount] = useState(3);

  const loadDashboard = () => {
    void runLoadDashboard(async () => {
      const [data, queue] = await Promise.all([
        getAdminDashboardData(),
        getCourseModerationQueue(),
      ]);
      if (isAdminUserManagementAvailable) {
        const users = await getAdminUsers();
        setAdminUsers(users);
        setSelectedRoles(Object.fromEntries(users.map((adminUser) => [adminUser.id, adminUser.role])));
      } else {
        setAdminUsers([]);
        setSelectedRoles({});
      }
      setDashboardData(data);
      setModerationQueue(queue);
      return data;
    });
  };

  useEffect(() => {
    loadDashboard();
  }, [runLoadDashboard]);

  const stats = dashboardData?.stats ?? [];
  const revenueData = dashboardData?.revenueData ?? [];
  const userGrowth = dashboardData?.userGrowth ?? [];
  const recentActivities = dashboardData?.recentActivities ?? [];
  const topCourses = dashboardData?.topCourses ?? [];

  const activityFilterOptions: ListOption[] = [
    { value: "all", label: "All Activity" },
    ...Array.from(new Set(recentActivities.map((activity) => activity.type))).map((type) => ({
      value: type,
      label: type,
    })),
  ];

  const activitySortOptions: ListOption[] = [
    { value: "newest", label: "Sort: Newest" },
    { value: "oldest", label: "Sort: Oldest" },
    { value: "type", label: "Sort: Activity Type" },
  ];

  const filteredActivities = useMemo<AdminActivityItem[]>(() => {
    const query = activityQuery.trim().toLowerCase();

    const searched = recentActivities.filter((activity) => {
      if (!query) {
        return true;
      }

      return activity.type.toLowerCase().includes(query) || activity.detail.toLowerCase().includes(query);
    });

    const filtered = searched.filter((activity) => {
      if (activityTypeFilter === "all") {
        return true;
      }

      return activity.type === activityTypeFilter;
    });

    return [...filtered].sort((left, right) => {
      switch (activitySort) {
        case "oldest":
          return right.minutesAgo - left.minutesAgo;
        case "type":
          return left.type.localeCompare(right.type);
        case "newest":
        default:
          return left.minutesAgo - right.minutesAgo;
      }
    });
  }, [activityQuery, activitySort, activityTypeFilter, recentActivities]);

  const visibleActivities = filteredActivities.slice(0, activityVisibleCount);

  useEffect(() => {
    setActivityVisibleCount(3);
  }, [activityQuery, activitySort, activityTypeFilter]);

  const hasActiveActivityFilters = activityQuery.trim().length > 0 || activityTypeFilter !== "all";

  const clearActivityFilters = () => {
    setActivityQuery("");
    setActivityTypeFilter("all");
    setActivitySort("newest");
  };

  const handleRoleUpdate = (adminUser: AdminUser) => {
    const nextRole = selectedRoles[adminUser.id] ?? adminUser.role;
    if (nextRole === adminUser.role) {
      return;
    }

    if (adminUser.role === "ADMIN" && nextRole !== "ADMIN") {
      const confirmed = window.confirm(
        `Change ${adminUser.firstName} ${adminUser.lastName} from ADMIN to ${nextRole}?`,
      );
      if (!confirmed) {
        setSelectedRoles((previous) => ({ ...previous, [adminUser.id]: adminUser.role }));
        return;
      }
    }

    void runRoleAction(
      async () => updateAdminUserRole(adminUser.id, nextRole),
      {
        successMessage: `${adminUser.firstName} ${adminUser.lastName}'s role updated to ${nextRole}.`,
        onSuccess: (updatedUser) => {
          setAdminUsers((previous) =>
            previous.map((userItem) => userItem.id === updatedUser.id ? updatedUser : userItem),
          );
          setSelectedRoles((previous) => ({ ...previous, [updatedUser.id]: updatedUser.role }));
        },
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">Welcome back, {getAuthUserGreetingName(user)}</h1>
        <p className="text-lg text-gray-700">Here's your platform at a glance.</p>
      </div>

      {submitSuccess ? <ActionSuccessState message={submitSuccess} className="mb-6" /> : null}
      {roleSubmitSuccess ? <ActionSuccessState message={roleSubmitSuccess} className="mb-6" /> : null}
      {submitError ? (
        <div className="mb-6">
          <DataErrorState
            title="Moderation action failed"
            description={submitError}
            retryLabel="Retry"
            onRetry={loadDashboard}
          />
        </div>
      ) : null}
      {roleSubmitError ? (
        <div className="mb-6">
          <DataErrorState
            title="Role update failed"
            description={roleSubmitError}
          />
        </div>
      ) : null}

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Admin analytics could not be loaded. Retry to refresh platform metrics and activity streams."}
            onRetry={() => {
              loadDashboard();
            }}
            retryLabel="Retry"
          />
        </div>
      ) : null}

      <GlassCard className="mb-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Course Review Queue</h3>
            <p className="text-sm text-gray-600">Approve or reject instructor submissions before student catalog publication.</p>
          </div>
          <span className="text-xs font-semibold uppercase text-[#4a9ff5] tracking-wide">
            {moderationQueue.filter((course) => course.publicationStatus === "pending-approval").length} pending
          </span>
        </div>

        {moderationQueue.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses in review"
            description="All instructor courses are either approved or have not been submitted yet."
          />
        ) : (
          <div className="space-y-3">
            {moderationQueue.map((course) => (
              <ModerationCourseCard
                key={course.id}
                course={course}
                isSubmitting={isSubmitting}
                rejectionNote={rejectionNotes[course.id] ?? ""}
                onRejectionNoteChange={(note) =>
                  setRejectionNotes((prev) => ({ ...prev, [course.id]: note }))
                }
                onApprove={() => {
                  void runModerationAction(
                    async () => reviewCoursePublication(course.id, "approved"),
                    {
                      successMessage: `Approved "${course.title}". It is now visible in the student catalog.`,
                      onSuccess: async () => {
                        const refreshed = await getCourseModerationQueue();
                        setModerationQueue(refreshed);
                      },
                    },
                  );
                }}
                onReject={() => {
                  void runModerationAction(
                    async () =>
                      reviewCoursePublication(course.id, "rejected", rejectionNotes[course.id]),
                    {
                      successMessage: `Rejected "${course.title}" and sent feedback to instructor.`,
                      onSuccess: async () => {
                        const refreshed = await getCourseModerationQueue();
                        setModerationQueue(refreshed);
                      },
                    },
                  );
                }}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className="mb-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">User Role Management</h3>
            <p className="text-sm text-gray-600">Promote instructors and manage admin access for existing users.</p>
          </div>
          {isAdminUserManagementAvailable ? (
            <span className="text-xs font-semibold uppercase text-[#4a9ff5] tracking-wide">
              {adminUsers.length} users
            </span>
          ) : null}
        </div>

        {!isAdminUserManagementAvailable ? (
          <EmptyState
            icon={Users}
            title="User management requires API mode"
            description="Role changes are disabled while the admin service is running with mock adapters."
          />
        ) : adminUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Users will appear here after they sign up."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminUsers.map((adminUser) => {
                  const selectedRole = selectedRoles[adminUser.id] ?? adminUser.role;
                  const isOwnAdminDemotion = adminUser.id === user?.id && selectedRole !== "ADMIN";
                  const hasRoleChanged = selectedRole !== adminUser.role;

                  return (
                    <tr key={adminUser.id} className="align-middle">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">
                          {adminUser.firstName} {adminUser.lastName}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{adminUser.email}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(adminUser.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={selectedRole}
                          disabled={isRoleSubmitting}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                          onChange={(event) => {
                            setSelectedRoles((previous) => ({
                              ...previous,
                              [adminUser.id]: event.target.value as AdminUserRole,
                            }));
                          }}
                        >
                          {ADMIN_ROLES.map((role) => (
                            <option
                              key={role}
                              value={role}
                              disabled={adminUser.id === user?.id && role !== "ADMIN"}
                            >
                              {role}
                            </option>
                          ))}
                        </select>
                        {isOwnAdminDemotion ? (
                          <p className="mt-1 text-xs text-red-700">You cannot remove your own admin access.</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          size="sm"
                          disabled={isRoleSubmitting || !hasRoleChanged || isOwnAdminDemotion}
                          title={isOwnAdminDemotion ? "You cannot remove your own admin access." : undefined}
                          onClick={() => {
                            handleRoleUpdate(adminUser);
                          }}
                        >
                          {isRoleSubmitting ? "Updating..." : "Apply"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <DashboardWidgetSkeleton key={`admin-stat-${index}`} />)
          : !isError && stats.map((stat, index) => (
          <GlassCard key={index}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[#4a9ff5]">
                {stat.icon === "users" ? <Users className="w-6 h-6" /> : null}
                {stat.icon === "dollar-sign" ? <DollarSign className="w-6 h-6" /> : null}
                {stat.icon === "book-open" ? <BookOpen className="w-6 h-6" /> : null}
                {stat.icon === "activity" ? <Activity className="w-6 h-6" /> : null}
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
        {/* Revenue Chart */}
        {isLoading ? (
          <SectionPanelSkeleton />
        ) : (
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
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
              <Line type="monotone" dataKey="revenue" stroke="#4a9ff5" strokeWidth={3} dot={{ fill: '#4a9ff5', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
        )}

        {/* User Growth */}
        {isLoading ? (
          <SectionPanelSkeleton />
        ) : (
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
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
              <Line type="monotone" dataKey="users" stroke="#0d6efd" strokeWidth={3} dot={{ fill: '#0d6efd', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
            <Button
              variant="ghost"
              className="text-[#4a9ff5]"
              onClick={() => {
                navigate("/community");
              }}
            >
              View all
            </Button>
          </div>

          {!isLoading ? (
            <div className="mb-4">
              <ListControls
                searchValue={activityQuery}
                onSearchChange={setActivityQuery}
                searchPlaceholder="Search activity details"
                filterValue={activityTypeFilter}
                onFilterChange={setActivityTypeFilter}
                filterOptions={activityFilterOptions}
                sortValue={activitySort}
                onSortChange={(value) => {
                  setActivitySort(value as ActivitySort);
                }}
                sortOptions={activitySortOptions}
                onClear={hasActiveActivityFilters ? clearActivityFilters : undefined}
                resultCount={isError ? undefined : filteredActivities.length}
              />
            </div>
          ) : null}
          
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <ListRowSkeleton key={`activity-loading-${index}`} />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={hasActiveActivityFilters ? "No activity matches your filters" : "No recent activity"}
              description={
                hasActiveActivityFilters
                  ? "Try clearing filters to see more platform events."
                  : "Platform events will appear here as users enroll, publish, and interact."
              }
              action={
                hasActiveActivityFilters
                  ? <Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={clearActivityFilters}>Clear Filters</Button>
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {visibleActivities.map((activity, index) => (
                <div key={index} className="p-3 rounded-lg bg-white/[0.45] border border-white/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#4a9ff5]">{activity.type}</p>
                      <p className="text-sm text-gray-700 mt-1">{activity.detail}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{activity.time}</span>
                  </div>
                </div>
              ))}

              <LoadMoreFooter
                shownCount={visibleActivities.length}
                totalCount={filteredActivities.length}
                onLoadMore={() => {
                  setActivityVisibleCount((previous) => previous + 3);
                }}
                incrementLabel="Load more activity"
              />
            </div>
          )}
        </GlassCard>

        {/* Top Courses */}
        <GlassCard>
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Top Performing Courses</h3>
          {topCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No top courses yet"
              description="Once enrollments begin, the strongest performing courses will be highlighted here."
            />
          ) : (
            <div className="space-y-4">
              {topCourses.map((course) => (
                <div key={course.id} className="p-4 rounded-xl bg-white/[0.45] border border-white/50">
                  <h4 className="font-semibold text-gray-900 mb-3">{course.title}</h4>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">{course.students} students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-[#4a9ff5]">{course.revenue}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-white/[0.55]"
                    onClick={() => {
                      navigate(`/courses?search=${encodeURIComponent(course.title)}`);
                    }}
                  >
                    View Analytics
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
