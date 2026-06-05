import type { LessonsService, VideoLessonPageData } from "../../contracts/lessons.contract";
import { LessonNotFoundError } from "../../contracts/lessons.contract";
import type { VideoLesson, VideoLessonNote } from "../../../models/lessons";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendInstructor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface BackendLesson {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  videoUrl: string | null;
  videoDurationSecs: number | null;
  estimatedMinutes: number | null;
  order: number;
  isFree: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendModule {
  id: string;
  title: string;
  order: number;
  lessons?: BackendLesson[];
}

interface BackendCourseWithModules {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  instructor: BackendInstructor;
  modules?: BackendModule[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseRawNotes(raw: string | null): import("../../../models/lessons").VideoLessonNote[] {
  const content = raw?.trim();
  if (!content) return [];
  return [{ id: "authored-notes", title: "Lesson Notes", content }];
}

function mapDifficulty(raw: string): "beginner" | "intermediate" | "advanced" {
  switch (raw.toUpperCase()) {
    case "INTERMEDIATE":
      return "intermediate";
    case "ADVANCED":
      return "advanced";
    default:
      return "beginner";
  }
}

function mapToVideoLesson(
  lesson: BackendLesson,
  course: BackendCourseWithModules,
  mod: BackendModule,
  totalLessonsInModule: number,
): VideoLesson {
  const now = new Date().toISOString();
  return {
    id: lesson.id,
    courseId: course.id,
    moduleId: mod.id,
    title: lesson.title,
    description: lesson.description ?? "",
    videoUrl: lesson.videoUrl ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    duration: lesson.videoDurationSecs ?? (lesson.estimatedMinutes ? lesson.estimatedMinutes * 60 : 0),
    lessonOrder: lesson.order,
    totalLessonsInModule,
    instructor: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
    instructorAvatar: course.instructor.avatarUrl ?? "",
    courseName: course.title,
    moduleName: mod.title,
    difficulty: mapDifficulty(course.difficulty),
    estimatedCompletionTime: lesson.estimatedMinutes ?? 0,
    notes: parseRawNotes(lesson.notes),
    learningObjectives: [],
    summary: "",
    tags: [],
    resources: [],
    quizAvailable: false,
    isFreePreview: lesson.isFree,
    createdAt: lesson.createdAt ?? now,
    updatedAt: lesson.updatedAt ?? now,
  };
}

async function fetchCourseWithModules(courseId: string): Promise<BackendCourseWithModules> {
  const response = await httpClient.get<{ status: string; data: { course: BackendCourseWithModules } }>(
    `/courses/${courseId}`,
    { headers: authHeaders() },
  );
  return response.data.course;
}

function flattenLessons(course: BackendCourseWithModules): VideoLesson[] {
  const lessons: VideoLesson[] = [];
  for (const mod of course.modules ?? []) {
    const totalLessonsInModule = mod.lessons?.length ?? 0;
    for (const lesson of mod.lessons ?? []) {
      lessons.push(mapToVideoLesson(lesson, course, mod, totalLessonsInModule));
    }
  }
  return lessons;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiLessonsAdapter implements LessonsService {
  async getVideoLessonData(lessonId: string): Promise<VideoLesson> {
    // The backend has no direct /lessons/:id endpoint.
    // This method is not the primary entrypoint; getVideoLessonPageData is used instead.
    throw new LessonNotFoundError(lessonId);
  }

  async getCourseLessons(courseId: string): Promise<VideoLesson[]> {
    try {
      const course = await fetchCourseWithModules(courseId);
      return flattenLessons(course);
    } catch (error) {
      throw toApiError(error, { operation: "lessons.getCourseLessons" });
    }
  }

  async getFurtherLessons(_lessonId: string): Promise<VideoLesson[]> {
    // No dedicated backend endpoint for this — return empty to degrade gracefully.
    return [];
  }

  async getLessonNotes(_lessonId: string): Promise<VideoLessonNote[]> {
    // Lesson notes are embedded in the lesson object fetched via getVideoLessonPageData.
    return [];
  }

  async completeLessonVideo(lessonId: string, courseId: string): Promise<void> {
    try {
      await httpClient.post(
        `/enrollments/lessons/${encodeURIComponent(lessonId)}/complete`,
        { body: { courseId }, headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "lessons.completeLessonVideo" });
    }
  }

  async trackLessonProgress(_lessonId: string, _courseId: string, _watchedDuration: number): Promise<void> {
    // No-op: the backend does not have a lesson progress tracking endpoint.
  }

  async getVideoLessonPageData(courseId: string, lessonId: string): Promise<VideoLessonPageData> {
    try {
      const course = await fetchCourseWithModules(courseId);
      const allLessons = flattenLessons(course);

      const lesson = allLessons.find((l) => l.id === lessonId);
      if (!lesson) {
        throw new LessonNotFoundError(lessonId);
      }

      // Discover whether this lesson has an attached quiz (backend doesn't embed
      // quiz info in the course structure response, so we probe separately).
      let resolvedLesson = lesson;
      try {
        const quizRes = await httpClient.get<{ status: string; data: { quiz: { id: string } } }>(
          `/content/lessons/${encodeURIComponent(lessonId)}/quiz`,
          { headers: authHeaders() },
        );
        resolvedLesson = { ...lesson, quizAvailable: true, quizId: quizRes.data.quiz.id };
      } catch {
        // 404 means no quiz for this lesson — keep quizAvailable: false
      }

      const furtherLessons = allLessons.filter(
        (l) => l.id !== lessonId && l.moduleId === resolvedLesson.moduleId,
      );

      return { lesson: resolvedLesson, furtherLessons, courseLessons: allLessons };
    } catch (error) {
      if (error instanceof LessonNotFoundError) throw error;
      throw toApiError(error, { operation: "lessons.getVideoLessonPageData" });
    }
  }
}
