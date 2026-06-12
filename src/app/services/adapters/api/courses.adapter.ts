import type { CoursesService } from "../../contracts/courses.contract";
import type {
  Course,
  CourseDetails,
  CourseLesson,
  CourseModule,
  CourseDifficulty,
  CoursePublicationStatus,
  CoursesPageData,
  EnrolledCourseProgress,
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  InstructorDraftQuizQuestionInput,
  InstructorManagedCourse,
} from "../../../models/courses";
import { httpClient, toApiError } from "../../../api";

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
  quiz?: {
    id: string;
    timeLimitSeconds: number | null;
    questions?: Array<{
      id: string;
      text: string;
      explanation: string | null;
      order: number;
      questionType: string;
      answerKey?: string | null;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        order: number;
      }>;
    }>;
  } | null;
}

interface BackendModule {
  id: string;
  title: string;
  order: number;
  lessons?: BackendLesson[];
  _count?: { lessons: number };
}

interface BackendCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  price: string | number | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  instructor: BackendInstructor;
  modules?: BackendModule[];
  rejectionReason?: string | null;
}

interface BackendEnrollmentCourse {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  instructor: BackendInstructor;
}

interface BackendEnrollment {
  id: string;
  enrolledAt: string;
  completedAt: string | null;
  course: BackendEnrollmentCourse;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(val: string): boolean {
  if (!val.trim()) return false;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
}

function getQuizTimeLimitSeconds(minutes?: number | null): number | undefined {
  return minutes && minutes > 0 ? Math.round(minutes * 60) : undefined;
}

function mapDifficulty(raw: string): CourseDifficulty {
  switch (raw.toUpperCase()) {
    case "INTERMEDIATE":
      return "intermediate";
    case "ADVANCED":
      return "advanced";
    default:
      return "beginner";
  }
}

function mapPublicationStatus(raw: string): CoursePublicationStatus {
  switch (raw.toUpperCase()) {
    case "PENDING_REVIEW":
      return "pending-approval";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "draft";
  }
}

function mapCourseLesson(lesson: BackendLesson): CourseLesson {
  let duration: string;
  if (lesson.videoDurationSecs) {
    const m = Math.floor(lesson.videoDurationSecs / 60);
    duration = m > 0 ? `${m}m` : "1m";
  } else if (lesson.estimatedMinutes) {
    duration = `${lesson.estimatedMinutes}m`;
  } else {
    duration = "—";
  }
  const orderedQuestions = [...(lesson.quiz?.questions ?? [])].sort((a, b) => a.order - b.order);
  const optionIds = ["a", "b", "c", "d"] as const;

  return {
    id: lesson.id,
    title: lesson.title,
    duration,
    description: lesson.description ?? undefined,
    videoUrl: lesson.videoUrl ?? undefined,
    estimatedCompletionTimeMinutes: lesson.estimatedMinutes ?? undefined,
    notesContent: lesson.notes ?? undefined,
    isFreePreview: lesson.isFree,
    quizAvailable: Boolean(lesson.quiz?.id),
    quizId: lesson.quiz?.id ?? undefined,
    quizTimeLimitSeconds: lesson.quiz?.timeLimitSeconds ?? undefined,
    quizQuestions: orderedQuestions.map((q) => {
      const orderedOptions = [...q.options].sort((a, b) => a.order - b.order);
      const correctIndex = orderedOptions.findIndex((option) => option.isCorrect);
      return {
        id: q.id,
        prompt: q.text,
        questionType: q.questionType === "SHORT_ANSWER" ? "SHORT_ANSWER" : "MCQ",
        options: orderedOptions.map((option, index) => ({
          id: optionIds[index] ?? option.id,
          text: option.text,
        })),
        correctOptionId: optionIds[Math.max(0, correctIndex)] ?? "a",
        explanation: q.explanation ?? "",
        answerKey: q.answerKey ?? undefined,
      };
    }),
  };
}

function buildQuizQuestionBody(question: InstructorDraftQuizQuestionInput, order: number) {
  if ((question.questionType ?? "MCQ") === "SHORT_ANSWER") {
    return {
      text: question.prompt,
      explanation: question.explanation || undefined,
      order,
      questionType: "SHORT_ANSWER",
      answerKey: question.answerKey || undefined,
    };
  }

  return {
    text: question.prompt,
    explanation: question.explanation || undefined,
    order,
    questionType: "MCQ",
    options: [
      { text: question.optionA, isCorrect: question.correctOption === "a", order: 0 },
      { text: question.optionB, isCorrect: question.correctOption === "b", order: 1 },
      { text: question.optionC, isCorrect: question.correctOption === "c", order: 2 },
      { text: question.optionD, isCorrect: question.correctOption === "d", order: 3 },
    ],
  };
}

function mapModule(mod: BackendModule): CourseModule {
  return {
    id: mod.id,
    title: mod.title,
    lessons: (mod.lessons ?? []).map(mapCourseLesson),
  };
}

function mapToCourse(course: BackendCourse): Course {
  const price = course.price === null ? null : Number(course.price);
  const totalLessons = (course.modules ?? []).reduce(
    (sum, module) => sum + (module.lessons?.length ?? module._count?.lessons ?? 0),
    0,
  );

  return {
    id: course.id,
    title: course.title,
    instructor: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
    progress: 0,
    totalLessons,
    completedLessons: 0,
    duration: course.estimatedHours ? `${course.estimatedHours}h` : "—",
    rating: 0,
    category: course.category,
    image: course.thumbnailUrl ?? "",
    difficulty: mapDifficulty(course.difficulty),
    description: course.description ?? undefined,
    estimatedHours: course.estimatedHours ?? undefined,
    coverImageUrl: course.thumbnailUrl ?? undefined,
    price: Number.isFinite(price) ? price : null,
  };
}

function mapToInstructorManagedCourse(course: BackendCourse): InstructorManagedCourse {
  const modules = (course.modules ?? []).map(mapModule);
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  return {
    ...mapToCourse(course),
    totalLessons,
    description: course.description ?? "",
    difficulty: mapDifficulty(course.difficulty),
    estimatedHours: course.estimatedHours ?? 0,
    learningOutcomes: [],
    topics: [],
    modules,
    publicationStatus: mapPublicationStatus(course.status),
    createdAt: course.createdAt,
    updatedAt: course.createdAt,
    submittedAt: null,
    approvedAt: course.publishedAt ?? null,
    rejectionReason: course.rejectionReason ?? null,
    isCustom: false,
  };
}

function mapToCourseDetails(course: BackendCourse): CourseDetails {
  const modules = (course.modules ?? []).map(mapModule);
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const instructorName = `${course.instructor.firstName} ${course.instructor.lastName}`.trim();
  const price = course.price === null ? null : Number(course.price);
  return {
    courseId: course.id,
    title: course.title,
    subtitle: course.description?.slice(0, 120) ?? "",
    description: course.description ?? undefined,
    difficulty: mapDifficulty(course.difficulty),
    estimatedHours: course.estimatedHours ?? undefined,
    learningOutcomes: [],
    topics: [],
    coverImageUrl: course.thumbnailUrl ?? undefined,
    instructorName,
    instructorAvatar: course.instructor.avatarUrl ?? "",
    rating: 0,
    reviewCount: 0,
    totalLessons,
    durationLabel: course.estimatedHours ? `${course.estimatedHours}h` : "—",
    image: course.thumbnailUrl ?? "",
    modules,
    resources: [],
    prerequisiteCourseIds: [],
    recommendedNextCourseId: undefined,
    price: Number.isFinite(price) ? price : null,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

type BackendCourseResponse = { status: string; data: { course: BackendCourse } };
type BackendCoursesResponse = { status: string; data: { courses: BackendCourse[] } };
type BackendEnrollmentsResponse = { status: string; data: { enrollments: BackendEnrollment[] } };

interface BackendCourseProgressData {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  completedAt: string | null;
  nextLessonId?: string | null;
  currentModule?: BackendCourseModuleProgress | null;
  modules?: BackendCourseModuleProgress[];
  lessonProgress: Array<{ lessonId: string; completedAt: string }>;
}

type BackendCourseProgressResponse = { status: string; data: { progress: BackendCourseProgressData } };

interface BackendCourseModuleProgress {
  id: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
}

export class ApiCoursesAdapter implements CoursesService {
  async getCoursesPageData(): Promise<CoursesPageData> {
    try {
      const response = await httpClient.get<BackendCoursesResponse>("/courses");
      const courses = response.data.courses.map(mapToCourse);
      const categories = [...new Set(courses.map((c) => c.category))].sort();
      return { courses, categories };
    } catch (error) {
      throw toApiError(error, { operation: "courses.getCoursesPageData" });
    }
  }

  async getCourseDetails(courseId: string): Promise<CourseDetails> {
    try {
      const response = await httpClient.get<BackendCourseResponse>(
        `/courses/${courseId}`,
      );
      return mapToCourseDetails(response.data.course);
    } catch (error) {
      throw toApiError(error, { operation: "courses.getCourseDetails" });
    }
  }

  async getSavedCourseIds(): Promise<string[]> {
    try {
      const response = await httpClient.get<BackendCoursesResponse>("/courses/saved");
      return response.data.courses.map((course) => course.id);
    } catch (error) {
      throw toApiError(error, { operation: "courses.getSavedCourseIds" });
    }
  }

  async saveCourse(courseId: string): Promise<void> {
    try {
      await httpClient.post(`/courses/${encodeURIComponent(courseId)}/save`);
    } catch (error) {
      throw toApiError(error, { operation: "courses.saveCourse" });
    }
  }

  async unsaveCourse(courseId: string): Promise<void> {
    try {
      await httpClient.delete(`/courses/${encodeURIComponent(courseId)}/save`);
    } catch (error) {
      throw toApiError(error, { operation: "courses.unsaveCourse" });
    }
  }

  async getEnrolledCoursesProgress(): Promise<EnrolledCourseProgress[]> {
    try {
      const enrollmentsResponse = await httpClient.get<BackendEnrollmentsResponse>(
        "/enrollments/my",
      );
      const enrollments = enrollmentsResponse.data.enrollments;

      // Fetch per-course progress in parallel; individual failures degrade gracefully
      const progressResults = await Promise.allSettled(
        enrollments.map((e) =>
          httpClient.get<BackendCourseProgressResponse>(
            `/enrollments/courses/${encodeURIComponent(e.course.id)}/progress`,
          ),
        ),
      );

      return enrollments.map((e, idx) => {
        const courseIdStr = e.course.id;
        const settled = progressResults[idx];

        if (settled.status === "rejected" || !settled.value) {
          return {
            courseId: courseIdStr,
            courseTitle: e.course.title,
            progress: 0,
            resumeLessonId: null,
            completedLessonIds: [],
            lastAccessedAt: null,
            totalLessons: 0,
            completedLessons: 0,
            currentModule: null,
            modules: [],
          };
        }

        const p = settled.value.data.progress;
        const completedLessonIds = p.lessonProgress.map((lp) => lp.lessonId);
        const lastAccessedAt =
          p.lessonProgress.length > 0
            ? p.lessonProgress.reduce((latest, lp) =>
                lp.completedAt > latest ? lp.completedAt : latest,
              p.lessonProgress[0].completedAt)
            : null;

        return {
          courseId: courseIdStr,
          courseTitle: e.course.title,
          progress: p.percentage,
          resumeLessonId: p.nextLessonId ?? null,
          completedLessonIds,
          lastAccessedAt,
          totalLessons: p.totalLessons,
          completedLessons: p.completedLessons,
          currentModule: p.currentModule ?? null,
          modules: p.modules ?? [],
        };
      });
    } catch (error) {
      throw toApiError(error, { operation: "courses.getEnrolledCoursesProgress" });
    }
  }

  async getInstructorManagedCourses(_instructorName?: string): Promise<InstructorManagedCourse[]> {
    try {
      const response = await httpClient.get<BackendCoursesResponse>(
        "/courses/mine/list",
      );
      return response.data.courses.map(mapToInstructorManagedCourse);
    } catch (error) {
      throw toApiError(error, { operation: "courses.getInstructorManagedCourses" });
    }
  }

  async getCourseModerationQueue(): Promise<InstructorManagedCourse[]> {
    try {
      const response = await httpClient.get<BackendCoursesResponse>(
        "/admin/courses/queue",
      );
      return response.data.courses.map(mapToInstructorManagedCourse);
    } catch (error) {
      throw toApiError(error, { operation: "courses.getCourseModerationQueue" });
    }
  }

  async createInstructorCourse(input: InstructorCourseDraftInput): Promise<InstructorManagedCourse> {
    const courseBody = {
      title: input.title,
      category: input.category,
      description: input.description,
      difficulty: input.difficulty.toUpperCase(),
      price: input.price ?? 0,
      ...(Number.isFinite(input.estimatedHours) ? { estimatedHours: input.estimatedHours } : {}),
      ...(isValidUrl(input.coverImageUrl ?? "") ? { thumbnailUrl: input.coverImageUrl } : {}),
    };
    try {
      // 1. Create course
      const courseResponse = await httpClient.post<BackendCourseResponse>(
        "/courses",
        { body: courseBody },
      );
      const courseId = courseResponse.data.course.id;

      // 2. Create modules and their lessons sequentially
      const modules = input.modules ?? [];
      for (let modIdx = 0; modIdx < modules.length; modIdx++) {
        const mod = modules[modIdx];
        if (!mod.title.trim()) continue;

        const modResponse = await httpClient.post<{ status: string; data: { module: { id: string } } }>(
          `/courses/${courseId}/modules`,
          { body: { title: mod.title, order: modIdx } },
        );
        const moduleId = modResponse.data.module.id;

        for (let lessonIdx = 0; lessonIdx < mod.lessons.length; lessonIdx++) {
          const lesson = mod.lessons[lessonIdx];
          if (!lesson.title.trim()) continue;

          const lessonBody: Record<string, unknown> = {
            title: lesson.title,
            order: lessonIdx,
            isFree: lesson.isFreePreview,
          };
          if (lesson.description.trim()) lessonBody.description = lesson.description;
          if (lesson.notesContent.trim()) lessonBody.notes = lesson.notesContent;
          if (isValidUrl(lesson.videoUrl)) lessonBody.videoUrl = lesson.videoUrl;
          if (lesson.estimatedCompletionTimeMinutes > 0) {
            lessonBody.estimatedMinutes = lesson.estimatedCompletionTimeMinutes;
          }

          const lessonResponse = await httpClient.post<{ status: string; data: { lesson: { id: string } } }>(
            `/courses/${courseId}/modules/${moduleId}/lessons`,
            { body: lessonBody },
          );
          const lessonId = lessonResponse.data.lesson.id;

          // 3b. Create attached quiz if the instructor authored questions for this lesson
          if (lesson.quizQuestions && lesson.quizQuestions.length > 0) {
            try {
              const quizTitle = `Quiz: ${lesson.title}`.slice(0, 200);
              const quizRes = await httpClient.post<{ status: string; data: { quiz: { id: string } } }>(
                `/content/lessons/${encodeURIComponent(lessonId)}/quiz`,
                {
                  body: {
                    title: quizTitle,
                    passingScore: 70,
                    ...(getQuizTimeLimitSeconds(lesson.quizTimeLimitMinutes)
                      ? { timeLimitSeconds: getQuizTimeLimitSeconds(lesson.quizTimeLimitMinutes) }
                      : {}),
                  },
                },
              );
              const quizId = quizRes.data.quiz.id;

              for (let qIdx = 0; qIdx < lesson.quizQuestions.length; qIdx++) {
                const q = lesson.quizQuestions[qIdx];
                if (!q.prompt.trim()) continue;

                await httpClient.post(
                  `/content/quizzes/${encodeURIComponent(quizId)}/questions`,
                  {
                    body: buildQuizQuestionBody(q, qIdx),
                  },
                );
              }
            } catch (error) {
              throw error;
            }
          }
        }
      }

      // 3. Fetch the full instructor course (includes modules + lessons)
      const fullResponse = await httpClient.get<BackendCourseResponse>(
        `/courses/mine/${courseId}`,
      );
      return mapToInstructorManagedCourse(fullResponse.data.course);
    } catch (error) {
      throw toApiError(error, { operation: "courses.createInstructorCourse" });
    }
  }

  async editInstructorCourse(input: InstructorCourseEditInput): Promise<InstructorManagedCourse> {
    const courseId = input.courseId;
    const courseBody = {
      title: input.title,
      category: input.category,
      description: input.description,
      difficulty: input.difficulty.toUpperCase(),
      price: input.price ?? 0,
      ...(Number.isFinite(input.estimatedHours) ? { estimatedHours: input.estimatedHours } : {}),
      ...(isValidUrl(input.coverImageUrl ?? "") ? { thumbnailUrl: input.coverImageUrl } : {}),
    };
    try {
      // 1. Update top-level course metadata
      await httpClient.put(`/courses/${courseId}`, { body: courseBody });

      // 2. Fetch the current persisted state so we know which module/lesson IDs exist
      const existingResp = await httpClient.get<BackendCourseResponse>(
        `/courses/mine/${courseId}`,
      );
      const existingModules = existingResp.data.course.modules ?? [];
      const existingModuleIds = new Set(existingModules.map((m) => m.id));
      const keepModuleIds = new Set<string>();

      // 3. Sync modules and their lessons
      const modules = input.modules ?? [];
      for (let modIdx = 0; modIdx < modules.length; modIdx++) {
        const mod = modules[modIdx];
        if (!mod.title.trim()) continue;

        let moduleId: string;
        if (mod.id && existingModuleIds.has(mod.id)) {
          // Existing module — update order/title
          await httpClient.put(
            `/courses/${courseId}/modules/${mod.id}`,
            { body: { title: mod.title, order: modIdx } },
          );
          moduleId = mod.id;
        } else {
          // New module — create
          const modResp = await httpClient.post<{ status: string; data: { module: { id: string } } }>(
            `/courses/${courseId}/modules`,
            { body: { title: mod.title, order: modIdx } },
          );
          moduleId = modResp.data.module.id;
        }
        keepModuleIds.add(moduleId);

        // Gather existing lessons for this module
        const existingMod = existingModules.find((m) => m.id === moduleId);
        const existingLessonIds = new Set(existingMod?.lessons?.map((l) => l.id) ?? []);
        const keepLessonIds = new Set<string>();

        for (let lessonIdx = 0; lessonIdx < mod.lessons.length; lessonIdx++) {
          const lesson = mod.lessons[lessonIdx];
          if (!lesson.title.trim()) continue;

          const lessonBody: Record<string, unknown> = {
            title: lesson.title,
            order: lessonIdx,
            isFree: lesson.isFreePreview,
          };
          if (lesson.description.trim()) lessonBody.description = lesson.description;
          if (lesson.notesContent.trim()) lessonBody.notes = lesson.notesContent;
          if (isValidUrl(lesson.videoUrl)) lessonBody.videoUrl = lesson.videoUrl;
          if (lesson.estimatedCompletionTimeMinutes > 0) {
            lessonBody.estimatedMinutes = lesson.estimatedCompletionTimeMinutes;
          }

          if (lesson.id && existingLessonIds.has(lesson.id)) {
            // Existing lesson — update
            await httpClient.put(
              `/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,
              { body: lessonBody },
            );
            keepLessonIds.add(lesson.id);
            if (lesson.quizId) {
              await httpClient.put(
                `/content/quizzes/${encodeURIComponent(lesson.quizId)}`,
                {
                  body: {
                    timeLimitSeconds: getQuizTimeLimitSeconds(lesson.quizTimeLimitMinutes) ?? null,
                  },
                },
              );
            }
          } else {
            // New lesson — create
            const lessonResp = await httpClient.post<{ status: string; data: { lesson: { id: string } } }>(
              `/courses/${courseId}/modules/${moduleId}/lessons`,
              { body: lessonBody },
            );
            const newLessonId = lessonResp.data.lesson.id;
            keepLessonIds.add(newLessonId);

            // Create attached quiz if questions were authored for this new lesson
            if (lesson.quizQuestions && lesson.quizQuestions.length > 0) {
              try {
                const quizTitle = `Quiz: ${lesson.title}`.slice(0, 200);
                const quizRes = await httpClient.post<{ status: string; data: { quiz: { id: string } } }>(
                  `/content/lessons/${encodeURIComponent(newLessonId)}/quiz`,
                  {
                    body: {
                      title: quizTitle,
                      passingScore: 70,
                      ...(getQuizTimeLimitSeconds(lesson.quizTimeLimitMinutes)
                        ? { timeLimitSeconds: getQuizTimeLimitSeconds(lesson.quizTimeLimitMinutes) }
                        : {}),
                    },
                  },
                );
                const quizId = quizRes.data.quiz.id;
                for (let qIdx = 0; qIdx < lesson.quizQuestions.length; qIdx++) {
                  const q = lesson.quizQuestions[qIdx];
                  if (!q.prompt.trim()) continue;
                  await httpClient.post(
                    `/content/quizzes/${encodeURIComponent(quizId)}/questions`,
                    {
                      body: buildQuizQuestionBody(q, qIdx),
                    },
                  );
                }
              } catch (error) {
                throw error;
              }
            }
          }
        }

        // Delete lessons removed from the form; server guards against progress.
        for (const existingLessonId of existingLessonIds) {
          if (!keepLessonIds.has(existingLessonId)) {
            try {
              await httpClient.delete(
                `/courses/${courseId}/modules/${moduleId}/lessons/${existingLessonId}`,
              );
            } catch {
              throw new Error("Course saved, but a lesson could not be deleted because it may have student progress.");
            }
          }
        }
      }

      // Delete modules removed from the form; server guards against progress.
      for (const existingModuleId of existingModuleIds) {
        if (!keepModuleIds.has(existingModuleId)) {
          try {
            await httpClient.delete(`/courses/${courseId}/modules/${existingModuleId}`);
          } catch {
            throw new Error("Course saved, but a module could not be deleted because it may have student progress.");
          }
        }
      }

      // 4. Fetch and return updated course
      const fullResponse = await httpClient.get<BackendCourseResponse>(
        `/courses/mine/${courseId}`,
      );
      return mapToInstructorManagedCourse(fullResponse.data.course);
    } catch (error) {
      throw toApiError(error, { operation: "courses.editInstructorCourse" });
    }
  }

  async submitCourseForApproval(courseId: string): Promise<InstructorManagedCourse> {
    try {
      const response = await httpClient.post<BackendCourseResponse>(
        `/courses/${courseId}/submit`,
      );
      return mapToInstructorManagedCourse(response.data.course);
    } catch (error) {
      throw toApiError(error, { operation: "courses.submitCourseForApproval" });
    }
  }

  async reviewCoursePublication(
    courseId: string,
    decision: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<InstructorManagedCourse> {
    const idStr = courseId;
    try {
      let response: BackendCourseResponse;
      if (decision === "approved") {
        response = await httpClient.post<BackendCourseResponse>(
          `/admin/courses/${idStr}/approve`,
        );
      } else {
        response = await httpClient.post<BackendCourseResponse, { reason: string }>(
          `/admin/courses/${idStr}/reject`,
          { body: { reason: rejectionReason ?? "" } },
        );
      }
      return mapToInstructorManagedCourse(response.data.course);
    } catch (error) {
      throw toApiError(error, { operation: "courses.reviewCoursePublication" });
    }
  }

  async enrollCourse(courseId: string): Promise<void> {
    try {
      await httpClient.post(
        `/enrollments/courses/${courseId}/enroll`,
      );
    } catch (error) {
      throw toApiError(error, { operation: "courses.enrollCourse" });
    }
  }

  async completeCourseLesson(courseId: string, lessonId: string): Promise<void> {
    try {
      await httpClient.post(
        `/enrollments/lessons/${encodeURIComponent(lessonId)}/complete`,
        { body: { courseId } },
      );
    } catch (error) {
      throw toApiError(error, { operation: "courses.completeCourseLesson" });
    }
  }

  async trackCourseAccess(_courseId: string): Promise<void> {
    // No-op: the backend does not have a dedicated access-tracking endpoint.
  }
}
