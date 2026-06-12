import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAdminRedirectFromStudentExperience } from "../auth/access-control";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { ListControls, LoadMoreFooter, type ListOption } from "../components/ListControls";
import { CourseCardSkeleton } from "../components/skeletons/SectionSkeletons";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Search, BookOpen, Clock, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import type { CoursesPageData } from "../models/courses";
import { getCoursesPageData } from "../services/courses.service";
import { createCoursePaymentOrder } from "../services/payment.service";
import { isPaidCourse, startCourseEnrollment } from "../services/course-enrollment-flow.service";
import { useCoursesState } from "../state/courses/CoursesStateContext";
import { useDashboardState } from "../state/dashboard/DashboardStateContext";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";

type CourseSort = "recommended" | "rating" | "title" | "progress";
type CourseProgressFilter = "all" | "in-progress" | "not-started";

const EMPTY_COURSES_DATA: CoursesPageData = {
  courses: [],
  categories: [],
};

function hasCoverImage(value: string | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

export function CoursesPage() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { applyBookmarkDelta, applyCourseJoin } = useDashboardState();
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const {
    state: { bookmarks, courseProgress, recentlyAccessedCourses },
    joinCourse,
    toggleBookmark,
    getCourseStatus,
    getCourseProgressSummary,
    markCourseAccessed,
  } = useCoursesState();
  const { errorMessage, isLoading, isError, run: runLoadCourses } = useAsyncViewState({
    defaultErrorMessage: "Courses failed to load. Retry to fetch your enrollments and progress.",
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const redirectPath = getAdminRedirectFromStudentExperience(location.pathname, role);
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [location.pathname, navigate, role]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [progressFilter, setProgressFilter] = useState<CourseProgressFilter>("all");
  const [sortBy, setSortBy] = useState<CourseSort>("recommended");
  const [visibleCount, setVisibleCount] = useState(6);
  const [coursesData, setCoursesData] = useState<CoursesPageData>(EMPTY_COURSES_DATA);

  const loadCourses = () => {
    void runLoadCourses(async () => {
      const data = await getCoursesPageData();
      setCoursesData(data);
      return data;
    });
  };

  useEffect(() => {
    loadCourses();
  }, [runLoadCourses]);

  const { courses, categories } = coursesData;

  const progressOptions: ListOption[] = [
    { value: "all", label: "All Progress" },
    { value: "in-progress", label: "In Progress" },
    { value: "not-started", label: "Not Started" },
  ];

  const sortOptions: ListOption[] = [
    { value: "recommended", label: "Sort: Recommended" },
    { value: "rating", label: "Sort: Highest Rated" },
    { value: "progress", label: "Sort: Highest Progress" },
    { value: "title", label: "Sort: Title A-Z" },
  ];

  const filteredCourses = useMemo(() => {
    const coursesWithSharedProgress = courses.map((course) => ({
      ...course,
      progress: getCourseStatus(course.id) === "not-enrolled" ? 0 : (courseProgress[course.id] ?? 0),
    }));

    const query = searchQuery.trim().toLowerCase();

    const searched = coursesWithSharedProgress.filter((course) => {
      if (!query) {
        return true;
      }

      return (
        course.title.toLowerCase().includes(query) ||
        course.instructor.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query)
      );
    });

    const byCategory = searched.filter((course) => {
      if (selectedCategory === "All") {
        return true;
      }

      return course.category === selectedCategory;
    });

    const byProgress = byCategory.filter((course) => {
      if (progressFilter === "all") {
        return true;
      }

      if (progressFilter === "in-progress") {
        return course.progress > 0 && course.progress < 100;
      }

      return course.progress === 0;
    });

    return [...byProgress].sort((left, right) => {
      switch (sortBy) {
        case "rating":
          return right.rating - left.rating;
        case "progress":
          return right.progress - left.progress;
        case "title":
          return left.title.localeCompare(right.title);
        case "recommended":
        default:
          return right.rating * 10 + right.progress - (left.rating * 10 + left.progress);
      }
    });
  }, [courseProgress, courses, getCourseStatus, progressFilter, searchQuery, selectedCategory, sortBy]);

  const bookmarkedCourses = useMemo(() => {
    return courses
      .filter((course) => bookmarks.includes(course.id))
      .map((course) => ({
        ...course,
        progress: courseProgress[course.id] ?? course.progress,
      }));
  }, [bookmarks, courseProgress, courses]);

  const recentlyAccessedLabelByCourseId = useMemo(() => {
    const labels = recentlyAccessedCourses.reduce<Record<string, string>>((accumulator, item) => {
      const minutesAgo = Math.max(
        1,
        Math.round((Date.now() - new Date(item.lastAccessedAt).getTime()) / (1000 * 60)),
      );
      accumulator[item.courseId] = minutesAgo < 60
        ? `${minutesAgo}m ago`
        : `${Math.round(minutesAgo / 60)}h ago`;

      return accumulator;
    }, {});

    for (const course of courses) {
      const summary = getCourseProgressSummary(course.id, course.totalLessons);
      if (!labels[course.id] && summary.lastAccessedAt) {
        const minutesAgo = Math.max(
          1,
          Math.round((Date.now() - new Date(summary.lastAccessedAt).getTime()) / (1000 * 60)),
        );
        labels[course.id] = minutesAgo < 60
          ? `${minutesAgo}m ago`
          : `${Math.round(minutesAgo / 60)}h ago`;
      }
    }

    return labels;
  }, [courses, getCourseProgressSummary, recentlyAccessedCourses]);

  const completedCourses = filteredCourses.filter((course) => getCourseStatus(course.id) === "completed");
  const visibleCourses = filteredCourses.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(6);
  }, [searchQuery, selectedCategory, progressFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== "All" || progressFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setProgressFilter("all");
    setSortBy("recommended");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">My Courses</h1>
        <p className="text-lg text-gray-700">Continue your learning journey</p>
      </div>

      {successMessage ? <ActionSuccessState message={successMessage} className="mb-8" /> : null}

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Courses failed to load. Retry to fetch your enrollments and progress."}
            onRetry={() => {
              loadCourses();
            }}
            retryLabel="Reload Courses"
          />
        </div>
      ) : null}

      {/* Search and Filter */}
      <GlassCard className="mb-12">
        <ListControls
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search courses, instructors, or subjects"
          filterValue={progressFilter}
          onFilterChange={(value) => {
            setProgressFilter(value as CourseProgressFilter);
          }}
          filterOptions={progressOptions}
          sortValue={sortBy}
          onSortChange={(value) => {
            setSortBy(value as CourseSort);
          }}
          sortOptions={sortOptions}
          onClear={hasActiveFilters ? clearFilters : undefined}
          resultCount={isLoading || isError ? undefined : filteredCourses.length}
        />
      </GlassCard>

      {/* Tabs */}
      <Tabs defaultValue="enrolled" className="mb-12">
        <TabsList>
          <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="saved">Saved ({bookmarks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-8">
          {/* Category Pills */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  category === selectedCategory
                    ? "bg-[#4a9ff5] text-white shadow-md"
                    : "bg-[#f9fafb] border border-[rgba(0,0,0,0.06)] text-gray-700 hover:bg-[#f3f4f6] hover:shadow-sm"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }, (_, index) => <CourseCardSkeleton key={index} />)
              : isError
                ? null
                : filteredCourses.length === 0
                ? (
                  <div className="md:col-span-2 lg:col-span-3">
                    <EmptyState
                      icon={Search}
                      title={hasActiveFilters ? "No courses match your filters" : "No enrolled courses"}
                      description={
                        hasActiveFilters
                          ? "Try changing your search, category, or sort to find a course faster."
                          : "Browse the catalog and enroll in a course to start learning with guided lessons and progress tracking."
                      }
                      action={
                        hasActiveFilters
                          ? <Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={clearFilters}>Clear Filters</Button>
                          : <Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={loadCourses}>Reload Courses</Button>
                      }
                    />
                  </div>
                  )
                : visibleCourses.map((course) => {
                  const status = getCourseStatus(course.id);
                  const summary = getCourseProgressSummary(course.id, course.totalLessons);
                  const progress = status === "not-enrolled" ? 0 : summary.progress;
                  const continueHref = status !== "not-enrolled" && summary.currentLessonId
                    ? `/courses/${course.id}/lessons/${summary.currentLessonId}`
                    : `/courses/${course.id}`;
                  const hasLessons = summary.hasLessons;
                  const actionLabel = !hasLessons
                    ? "No Lessons Yet"
                    : status === "not-enrolled"
                    ? "Start Course"
                    : status === "completed"
                    ? "Review Course"
                    : "Continue Where You Left Off";
                  const actionButton = (
                    <Button
                      className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!hasLessons}
                      onClick={(event) => {
                        if (!hasLessons) {
                          event.preventDefault();
                          return;
                        }

                        if (status === "not-enrolled") {
                          if (isPaidCourse(course.price)) {
                            event.preventDefault();
                            void startCourseEnrollment({
                              courseId: course.id,
                              price: course.price,
                              returnTo: `/courses/${course.id}`,
                              origin: window.location.origin,
                              joinCourse,
                              createPaymentOrder: createCoursePaymentOrder,
                              redirectToApprovalUrl: (url) => {
                                window.location.assign(url);
                              },
                            }).catch((error) => {
                              pushNotification(
                                createProductNotification({
                                  title: "Payment could not start",
                                  detail: error instanceof Error ? error.message : "Payment could not be started.",
                                  category: "course",
                                  source: "course-update",
                                }),
                              );
                            });
                            return;
                          }

                          addRecentActivity("course", `Joined ${course.title}`);
                          pushNotification(
                            createProductNotification({
                              title: "Course enrolled",
                              detail: `You joined ${course.title}. Enrollment stats were updated.`,
                              category: "course",
                              source: "course-update",
                              actionLabel: "Open course",
                              metadata: { courseId: course.id },
                            }),
                          );
                          void joinCourse(course.id).then((result) => {
                            applyCourseJoin(result.joinedNewCourse);

                            if (!result.syncOk) {
                                pushNotification(
                                  createProductNotification({
                                    title: "Enrollment sync issue",
                                    detail: `Could not confirm enrollment for ${course.title}. You can keep learning locally.`,
                                    category: "course",
                                    source: "course-update",
                                  }),
                                );
                            }
                          });
                          markCourseAccessed(course.id);
                          addRecentActivity("course", `Accessed ${course.title}`);
                          setSuccessMessage(`Started ${course.title}.`);
                        } else {
                          addRecentActivity("course", `Reviewed ${course.title}`);
                          markCourseAccessed(course.id);
                          addRecentActivity("course", `Accessed ${course.title}`);
                          setSuccessMessage(`Resumed ${course.title}.`);
                        }

                        window.setTimeout(() => {
                          setSuccessMessage(null);
                        }, 2200);
                      }}
                    >
                      {actionLabel}
                    </Button>
                  );

                  return (
                  <GlassCard key={course.id} hover className="flex flex-col">
                    <div className="mb-4">
                      <div className="w-full h-32 bg-gradient-to-br from-[#4a9ff5]/20 to-[#0d6efd]/20 rounded-xl flex items-center justify-center text-5xl mb-4">
                          {hasCoverImage(course.coverImageUrl) ? (
                            <img src={course.coverImageUrl} alt={course.title} className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            course.image
                          )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          status === "completed"
                            ? "bg-green-100 text-green-700"
                            : status === "in-progress"
                            ? "bg-[#4a9ff5]/10 text-[#4a9ff5]"
                            : status === "enrolled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {status === "completed"
                            ? "Completed"
                            : status === "in-progress"
                            ? "In Progress"
                            : status === "enrolled"
                            ? "Enrolled"
                            : "Not Enrolled"}
                        </span>
                        {recentlyAccessedLabelByCourseId[course.id] ? (
                          <span className="text-xs text-gray-500">
                            Last opened {recentlyAccessedLabelByCourseId[course.id]}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{course.instructor}</p>
                      {course.description ? <p className="text-xs text-gray-600 mb-3 max-h-10 overflow-hidden">{course.description}</p> : null}

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{course.totalLessons} lessons</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{course.duration}</span>
                        </div>
                        {course.difficulty ? (
                          <div className="flex items-center gap-1">
                            <span className="capitalize">{course.difficulty}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 mb-4">
                        <Star className="w-4 h-4 fill-[#4a9ff5] text-[#4a9ff5]" />
                        <span className="text-sm font-medium text-gray-900">{course.rating}</span>
                      </div>

                      {status !== "not-enrolled" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-[#4a9ff5] font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-gray-500">
                            {summary.completedLessons}/{summary.totalLessons} lessons complete
                          </p>
                          {summary.currentModule ? (
                            <p className="text-xs text-gray-500">
                              Current module: {summary.currentModule.completedLessons}/{summary.currentModule.totalLessons} lessons complete
                            </p>
                          ) : !summary.hasLessons ? (
                            <p className="text-xs text-gray-500">No lessons are available for this course yet.</p>
                          ) : null}
                        </div>
                      ) : !hasLessons ? (
                        <p className="text-xs text-gray-500">No lessons are available for this course yet.</p>
                      ) : null}
                    </div>

                    <div className="mt-auto">
                      {hasLessons ? <Link to={continueHref}>{actionButton}</Link> : actionButton}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 w-full bg-white/[0.45]"
                        onClick={() => {
                          const wasBookmarked = bookmarks.includes(course.id);
                          const added = toggleBookmark(course.id);
                          applyBookmarkDelta(added ? 1 : -1);
                          addRecentActivity(
                            "course",
                            `${wasBookmarked ? "Removed" : "Saved"} ${course.title} ${wasBookmarked ? "from" : "to"} bookmarks`,
                          );
                          setSuccessMessage(
                            wasBookmarked
                              ? `Removed ${course.title} from saved courses.`
                              : `Saved ${course.title} for later.`,
                          );
                          window.setTimeout(() => {
                            setSuccessMessage(null);
                          }, 2200);
                        }}
                      >
                        {bookmarks.includes(course.id) ? "Saved" : "Save Course"}
                      </Button>
                    </div>
                  </GlassCard>
                  );
                })}
          </div>

          {!isLoading && !isError && filteredCourses.length > 0 ? (
            <LoadMoreFooter
              shownCount={visibleCourses.length}
              totalCount={filteredCourses.length}
              onLoadMore={() => {
                setVisibleCount((previous) => previous + 3);
              }}
              incrementLabel="Load more courses"
            />
          ) : null}
        </TabsContent>

        <TabsContent value="completed">
          {completedCourses.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No completed courses yet"
              description="Complete lessons and quizzes to build your finished course history here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCourses.map((course) => (
                <GlassCard key={`completed-${course.id}`} hover className="flex flex-col">
                  <div className="mb-4">
                    <div className="w-full h-32 bg-gradient-to-br from-[#4a9ff5]/20 to-[#0d6efd]/20 rounded-xl flex items-center justify-center text-5xl mb-4">
                      {hasCoverImage(course.coverImageUrl) ? (
                        <img src={course.coverImageUrl} alt={course.title} className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        course.image
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{course.instructor}</p>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-green-700 font-medium">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <Link to={`/courses/${course.id}`} className="mt-auto">
                    <Button className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">Review Course</Button>
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          {bookmarkedCourses.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No saved courses"
              description="Save courses you want to revisit later so they stay easy to find."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedCourses.map((course) => (
                <GlassCard key={`saved-${course.id}`} hover className="flex flex-col">
                  <div className="mb-4">
                    <div className="w-full h-32 bg-gradient-to-br from-[#4a9ff5]/20 to-[#0d6efd]/20 rounded-xl flex items-center justify-center text-5xl mb-4">
                      {hasCoverImage(course.coverImageUrl) ? (
                        <img src={course.coverImageUrl} alt={course.title} className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        course.image
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{course.instructor}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="text-[#4a9ff5] font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2 mt-2" />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
