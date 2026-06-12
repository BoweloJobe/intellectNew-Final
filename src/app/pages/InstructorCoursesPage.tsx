import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { ListRowSkeleton } from "../components/skeletons/SectionSkeletons";
import { Button } from "../components/ui/button";
import { CourseAuthoringForm } from "../components/instructor/CourseAuthoringForm";
import { CourseStatusCard } from "../components/instructor/CourseStatusCard";
import { domainAdapterConfig } from "../api/config/apiConfig";
import {
  createInstructorCourse,
  editInstructorCourse,
  getInstructorManagedCourses,
  submitCourseForApproval,
  uploadLessonVideo,
} from "../services/courses.service";
import type { InstructorCourseDraftInput, InstructorManagedCourse } from "../models/courses";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

type ViewMode = "list" | "create" | "edit";

const COURSE_CATEGORIES = ["Biology", "Chemistry", "Physics", "Mathematics", "Other"];
const isCourseAuthoringAvailable = domainAdapterConfig.courses === "api";

export function InstructorCoursesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const instructorName = user?.fullName ?? "Instructor";

  const { errorMessage, isLoading, isError, run: runLoad } = useAsyncViewState({
    defaultErrorMessage: "Could not load your courses. Please retry.",
  });
  const {
    isSubmitting,
    submitError,
    submitSuccess,
    clearStatus,
    run: runMutation,
  } = useAsyncFormSubmission();

  const [courses, setCourses] = useState<InstructorManagedCourse[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingCourse, setEditingCourse] = useState<InstructorManagedCourse | null>(null);

  const loadCourses = () => {
    void runLoad(async () => {
      const data = await getInstructorManagedCourses(instructorName);
      setCourses(data);
      return data;
    });
  };

  useEffect(() => {
    loadCourses();
  }, [runLoad]);

  const handleCreate = (input: InstructorCourseDraftInput) => {
    void runMutation(
      async () => createInstructorCourse({ ...input, instructor: instructorName }),
      {
        successMessage: `Course "${input.title}" created successfully.`,
        onSuccess: async () => {
          const refreshed = await getInstructorManagedCourses(instructorName);
          setCourses(refreshed);
          setViewMode("list");
        },
      },
    );
  };

  const handleEdit = (input: InstructorCourseDraftInput) => {
    if (!editingCourse) {
      return;
    }

    void runMutation(
      async () => editInstructorCourse({ ...input, instructor: instructorName, courseId: editingCourse.id }),
      {
        successMessage: `Course "${input.title}" updated.`,
        onSuccess: async () => {
          const refreshed = await getInstructorManagedCourses(instructorName);
          setCourses(refreshed);
          setViewMode("list");
          setEditingCourse(null);
        },
      },
    );
  };

  const handleSubmitForApproval = (courseId: string) => {
    void runMutation(
      async () => submitCourseForApproval(courseId),
      {
        successMessage: "Course submitted for admin review.",
        onSuccess: async () => {
          const refreshed = await getInstructorManagedCourses(instructorName);
          setCourses(refreshed);
        },
      },
    );
  };

  const goToEdit = (course: InstructorManagedCourse) => {
    clearStatus();
    setEditingCourse(course);
    setViewMode("edit");
  };

  const goToList = () => {
    clearStatus();
    setViewMode("list");
    setEditingCourse(null);
  };

  if (viewMode === "create") {
    return (
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" onClick={goToList} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Create New Course</h1>
        </div>

        {submitError ? (
          <div className="mb-6">
            <DataErrorState title="Could not create course" description={submitError} />
          </div>
        ) : null}

        <GlassCard>
          <CourseAuthoringForm
            isSubmitting={isSubmitting}
            instructorName={instructorName}
            availableCategories={COURSE_CATEGORIES}
            onUploadLessonVideo={uploadLessonVideo}
            onSubmit={handleCreate}
          />
        </GlassCard>
      </div>
    );
  }

  if (viewMode === "edit" && editingCourse) {
    return (
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" onClick={goToList} className="text-gray-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Courses
          </Button>
          <h1 className="text-2xl font-semibold text-gray-900">Edit Course</h1>
        </div>

        {submitError ? (
          <div className="mb-6">
            <DataErrorState title="Could not update course" description={submitError} />
          </div>
        ) : null}

        <GlassCard>
          <CourseAuthoringForm
            isSubmitting={isSubmitting}
            isEditing
            editingCourse={editingCourse}
            instructorName={instructorName}
            availableCategories={COURSE_CATEGORIES}
            onUploadLessonVideo={uploadLessonVideo}
            onSubmit={handleEdit}
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold mb-2 text-gray-900">My Courses</h1>
          <p className="text-lg text-gray-700">Create, manage, and submit courses for admin approval.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="text-gray-600"
            onClick={() => {
              navigate("/instructor");
            }}
          >
            Dashboard
          </Button>
          <Button
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            disabled={!isCourseAuthoringAvailable}
            title={!isCourseAuthoringAvailable ? "Course authoring requires API-backed courses." : undefined}
            onClick={() => {
              clearStatus();
              setViewMode("create");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </div>
      </div>

      {submitSuccess ? <ActionSuccessState message={submitSuccess} className="mb-6" /> : null}

      {submitError ? (
        <div className="mb-6">
          <DataErrorState title="Action failed" description={submitError} />
        </div>
      ) : null}

      {isError ? (
        <DataErrorState
          description={errorMessage ?? "Could not load your courses."}
          onRetry={loadCourses}
          retryLabel="Reload"
        />
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <ListRowSkeleton key={`course-loading-${index}`} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description={
              isCourseAuthoringAvailable
                ? "Create your first course draft and submit it for admin approval before it appears to students."
                : "Course authoring is unavailable while courses are running in mock mode."
            }
            action={(
              <Button
                className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]"
                disabled={!isCourseAuthoringAvailable}
                title={!isCourseAuthoringAvailable ? "Course authoring requires API-backed courses." : undefined}
                onClick={() => {
                  setViewMode("create");
                }}
              >
                Create First Course
              </Button>
            )}
          />
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <CourseStatusCard
              key={course.id}
              course={course}
              isSubmitting={isSubmitting}
              onEdit={isCourseAuthoringAvailable ? goToEdit : undefined}
              onAddQuiz={isCourseAuthoringAvailable ? (course) => {
                // Open the edit view — the LessonQuizEditor is embedded
                // inside each lesson in the course authoring form.
                goToEdit(course);
              } : undefined}
              onSubmitForApproval={isCourseAuthoringAvailable ? handleSubmitForApproval : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
