import { courseDetailsMockById, coursesPageMock } from "../../../mocks/courses.mock";
import type {
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  LessonVideoUploadInput,
  LessonVideoUploadResult,
  InstructorManagedCourse,
  CourseModule,
  StandaloneLessonCreateInput,
} from "../../../models/courses";
import type { CoursesService } from "../../contracts/courses.contract";
import { withMockDelay } from "../../mock-utils";

// ─── Shared mock instructor-course store ──────────────────────────────────────
// Empty by default. lessons.adapter and quizzes.adapter iterate this list to
// resolve custom lesson/quiz templates in mock mode. The real data lives in the
// API adapter; here an empty list is a safe no-op fallback.

const MOCK_MANAGED_COURSES: InstructorManagedCourse[] = [];
const MOCK_SAVED_COURSE_IDS = new Set<string>();
let mockCourseSequence = 1;
const STANDALONE_MODULE_TITLE = "Standalone lessons";

function createMockId(prefix: string): string {
  return `mock-${prefix}-${mockCourseSequence++}`;
}

export function getAllMockManagedCourses(): InstructorManagedCourse[] {
  return MOCK_MANAGED_COURSES;
}

export function getMockManagedCourseById(courseId: string): InstructorManagedCourse | undefined {
  return MOCK_MANAGED_COURSES.find((c) => c.id === courseId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function mockCourseMutation(): Promise<void> {
  await withMockDelay(null, 180);
}

function notImplementedCourse(method: string): never {
  throw new Error(`MockCoursesAdapter.${method} is not implemented in mock mode.`);
}

function mapDraftModules(input: InstructorCourseDraftInput | InstructorCourseEditInput): CourseModule[] {
  return (input.modules ?? []).map((module) => ({
    id: module.id ?? createMockId("module"),
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id ?? createMockId("lesson"),
      title: lesson.title,
      videoUrl: lesson.videoUrl || undefined,
      videoProvider: lesson.videoProvider,
      videoUploadStatus: lesson.videoUploadStatus,
      description: lesson.description || undefined,
      duration: lesson.duration,
      estimatedCompletionTimeMinutes: lesson.estimatedCompletionTimeMinutes,
      notesContent: lesson.notesContent || undefined,
      isFreePreview: lesson.isFreePreview,
      quizAvailable: lesson.quizAvailable,
      quizId: lesson.quizId,
      quizTimeLimitSeconds: lesson.quizTimeLimitMinutes ? Math.round(lesson.quizTimeLimitMinutes * 60) : undefined,
    })),
  }));
}

function createMockManagedCourse(input: InstructorCourseDraftInput): InstructorManagedCourse {
  const now = new Date().toISOString();
  const modules = mapDraftModules(input);
  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);

  return {
    id: createMockId("course"),
    title: input.title,
    instructor: input.instructor,
    progress: 0,
    totalLessons,
    completedLessons: 0,
    duration: input.estimatedHours ? `${input.estimatedHours}h` : "0h",
    rating: 0,
    category: input.category,
    image: input.coverImageUrl ?? "",
    difficulty: input.difficulty,
    description: input.description,
    estimatedHours: input.estimatedHours ?? 0,
    coverImageUrl: input.coverImageUrl,
    price: input.price ?? 0,
    learningOutcomes: [],
    topics: input.topics ?? [],
    modules,
    publicationStatus: input.initialStatus === "pending-approval" ? "pending-approval" : "draft",
    createdAt: now,
    updatedAt: now,
    submittedAt: input.initialStatus === "pending-approval" ? now : null,
    approvedAt: null,
    rejectionReason: null,
    isCustom: true,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class MockCoursesAdapter implements CoursesService {
  async getCoursesPageData() {
    return withMockDelay(coursesPageMock);
  }

  async getCourseDetails(courseId: string) {
    const details = courseDetailsMockById[courseId] ?? courseDetailsMockById["1"];
    return withMockDelay(details);
  }

  async getSavedCourseIds(): Promise<string[]> {
    return withMockDelay([...MOCK_SAVED_COURSE_IDS]);
  }

  async saveCourse(courseId: string): Promise<void> {
    MOCK_SAVED_COURSE_IDS.add(courseId);
    await mockCourseMutation();
  }

  async unsaveCourse(courseId: string): Promise<void> {
    MOCK_SAVED_COURSE_IDS.delete(courseId);
    await mockCourseMutation();
  }

  async getEnrolledCoursesProgress() {
    return withMockDelay([]);
  }

  async getInstructorManagedCourses(): Promise<InstructorManagedCourse[]> {
    return withMockDelay([...MOCK_MANAGED_COURSES]);
  }

  async getCourseModerationQueue(): Promise<InstructorManagedCourse[]> {
    return withMockDelay([]);
  }

  async createInstructorCourse(input: InstructorCourseDraftInput): Promise<InstructorManagedCourse> {
    const course = createMockManagedCourse(input);
    MOCK_MANAGED_COURSES.unshift(course);
    return withMockDelay(course);
  }

  async editInstructorCourse(input: InstructorCourseEditInput): Promise<InstructorManagedCourse> {
    const index = MOCK_MANAGED_COURSES.findIndex((course) => course.id === input.courseId);
    if (index < 0) {
      throw new Error("Mock course draft not found.");
    }

    const current = MOCK_MANAGED_COURSES[index];
    const modules = mapDraftModules(input);
    const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
    const updated = {
      ...current,
      title: input.title,
      instructor: input.instructor,
      category: input.category,
      description: input.description,
      difficulty: input.difficulty,
      estimatedHours: input.estimatedHours ?? current.estimatedHours,
      coverImageUrl: input.coverImageUrl ?? current.coverImageUrl,
      image: input.coverImageUrl ?? current.image,
      price: input.price ?? 0,
      topics: input.topics ?? [],
      modules,
      totalLessons,
      duration: input.estimatedHours ? `${input.estimatedHours}h` : "0h",
      updatedAt: new Date().toISOString(),
    };

    MOCK_MANAGED_COURSES[index] = updated;
    return withMockDelay(updated);
  }

  async addStandaloneLesson(input: StandaloneLessonCreateInput): Promise<InstructorManagedCourse> {
    const index = MOCK_MANAGED_COURSES.findIndex((course) => course.id === input.courseId);
    if (index < 0) {
      throw new Error("Mock course draft not found.");
    }

    const current = MOCK_MANAGED_COURSES[index];
    const modules = current.modules.map((module) => ({
      ...module,
      lessons: [...module.lessons],
    }));
    let module = modules.find((candidate) => candidate.title === STANDALONE_MODULE_TITLE);

    if (!module) {
      module = {
        id: createMockId("module"),
        title: STANDALONE_MODULE_TITLE,
        lessons: [],
      };
      modules.push(module);
    }

    module.lessons.push({
      id: createMockId("lesson"),
      title: input.title?.trim() || "New lesson",
      duration: "20m",
      description: "",
      videoUrl: undefined,
      estimatedCompletionTimeMinutes: 20,
      notesContent: "",
      isFreePreview: false,
      quizAvailable: false,
    });

    const updated = {
      ...current,
      modules,
      totalLessons: modules.reduce((total, candidate) => total + candidate.lessons.length, 0),
      updatedAt: new Date().toISOString(),
    };

    MOCK_MANAGED_COURSES[index] = updated;
    return withMockDelay(updated);
  }

  async uploadLessonVideo(_input: LessonVideoUploadInput): Promise<LessonVideoUploadResult> {
    throw new Error("Video upload requires API mode with configured storage.");
  }

  async submitCourseForApproval(courseId: string): Promise<InstructorManagedCourse> {
    const index = MOCK_MANAGED_COURSES.findIndex((course) => course.id === courseId);
    if (index < 0) {
      throw new Error("Mock course draft not found.");
    }

    const now = new Date().toISOString();
    const updated = {
      ...MOCK_MANAGED_COURSES[index],
      publicationStatus: "pending-approval" as const,
      submittedAt: now,
      updatedAt: now,
    };

    MOCK_MANAGED_COURSES[index] = updated;
    return withMockDelay(updated);
  }

  async reviewCoursePublication(
    _courseId: string,
    _decision: "approved" | "rejected",
    _rejectionReason?: string,
  ): Promise<InstructorManagedCourse> {
    notImplementedCourse("reviewCoursePublication");
  }

  async enrollCourse(): Promise<void> {
    await mockCourseMutation();
  }

  async completeCourseLesson(): Promise<void> {
    await mockCourseMutation();
  }

  async trackCourseAccess(): Promise<void> {
    await withMockDelay(null, 100);
  }
}
