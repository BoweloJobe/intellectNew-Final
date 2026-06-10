import type { LessonWatchProgressInput, LessonsService, VideoLessonPageData } from "../../contracts/lessons.contract";
import { LessonCourseMismatchError, LessonNotFoundError } from "../../contracts/lessons.contract";
import type { VideoLesson, VideoLessonNote } from "../../../models/lessons";
import { ApiError, httpClient, toApiError } from "../../../api";

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

interface BackendLessonPageItem {
  id: string;
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  title: string;
  description: string | null;
  notes: string | null;
  videoUrl: string | null;
  videoDurationSecs: number | null;
  estimatedMinutes: number | null;
  order: number;
  isFree: boolean;
  quizId: string | null;
  createdAt: string;
  updatedAt: string;
  course: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    thumbnailUrl: string | null;
    instructor: BackendInstructor;
  };
}

type BackendLessonPageResponse = {
  status: string;
  data: {
    lesson: BackendLessonPageItem;
    furtherLessons: BackendLessonPageItem[];
    courseLessons: BackendLessonPageItem[];
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function mapLessonPageItem(lesson: BackendLessonPageItem, totalLessonsInModule: number): VideoLesson {
  return {
    id: lesson.id,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    title: lesson.title,
    description: lesson.description ?? "",
    videoUrl: lesson.videoUrl ?? "",
    thumbnailUrl: lesson.course.thumbnailUrl ?? "",
    duration: lesson.videoDurationSecs ?? (lesson.estimatedMinutes ? lesson.estimatedMinutes * 60 : 0),
    lessonOrder: lesson.order,
    totalLessonsInModule,
    instructor: `${lesson.course.instructor.firstName} ${lesson.course.instructor.lastName}`.trim(),
    instructorAvatar: lesson.course.instructor.avatarUrl ?? "",
    courseName: lesson.course.title,
    moduleName: lesson.moduleTitle,
    difficulty: mapDifficulty(lesson.course.difficulty),
    estimatedCompletionTime: lesson.estimatedMinutes ?? 0,
    notes: parseRawNotes(lesson.notes),
    learningObjectives: [],
    summary: "",
    tags: [],
    resources: [],
    quizAvailable: Boolean(lesson.quizId),
    quizId: lesson.quizId ?? undefined,
    isFreePreview: lesson.isFree,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}

function mapLessonPageResponse(response: BackendLessonPageResponse): VideoLessonPageData {
  const moduleCounts = response.data.courseLessons.reduce<Record<string, number>>((counts, item) => {
    counts[item.moduleId] = (counts[item.moduleId] ?? 0) + 1;
    return counts;
  }, {});

  return {
    lesson: mapLessonPageItem(response.data.lesson, moduleCounts[response.data.lesson.moduleId] ?? 1),
    furtherLessons: response.data.furtherLessons.map((item) =>
      mapLessonPageItem(item, moduleCounts[item.moduleId] ?? 1),
    ),
    courseLessons: response.data.courseLessons.map((item) =>
      mapLessonPageItem(item, moduleCounts[item.moduleId] ?? 1),
    ),
  };
}

async function fetchCourseWithModules(courseId: string): Promise<BackendCourseWithModules> {
  const response = await httpClient.get<{ status: string; data: { course: BackendCourseWithModules } }>(
    `/courses/${courseId}`,
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
    const data = await this.getVideoLessonPageData("", lessonId);
    return data.lesson;
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
        { body: { courseId } },
      );
    } catch (error) {
      throw toApiError(error, { operation: "lessons.completeLessonVideo" });
    }
  }

  async trackLessonProgress(lessonId: string, _courseId: string, watchedDuration: number): Promise<void> {
    await this.saveLessonWatchProgress(lessonId, { watchedSeconds: watchedDuration });
  }

  async saveLessonWatchProgress(lessonId: string, input: LessonWatchProgressInput): Promise<void> {
    try {
      await httpClient.patch(
        `/content/lessons/${encodeURIComponent(lessonId)}/watch-progress`,
        { body: input },
      );
    } catch (error) {
      throw toApiError(error, { operation: "lessons.saveLessonWatchProgress" });
    }
  }

  async getVideoLessonPageData(courseId: string, lessonId: string): Promise<VideoLessonPageData> {
    try {
      const response = await httpClient.get<BackendLessonPageResponse>(
        `/content/lessons/${encodeURIComponent(lessonId)}`,
      );
      const pageData = mapLessonPageResponse(response);

      if (courseId && pageData.lesson.courseId !== courseId) {
        throw new LessonCourseMismatchError(lessonId, courseId);
      }
      return pageData;
    } catch (error) {
      if (error instanceof LessonNotFoundError || error instanceof LessonCourseMismatchError) throw error;
      if (error instanceof ApiError && error.status === 404) {
        throw new LessonNotFoundError(lessonId);
      }
      throw toApiError(error, { operation: "lessons.getVideoLessonPageData" });
    }
  }
}
