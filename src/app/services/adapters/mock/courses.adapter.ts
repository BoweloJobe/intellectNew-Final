import { courseDetailsMockById, coursesPageMock } from "../../../mocks/courses.mock";
import type {
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  InstructorManagedCourse,
} from "../../../models/courses";
import type { CoursesService } from "../../contracts/courses.contract";
import { withMockDelay } from "../../mock-utils";

// ─── Shared mock instructor-course store ──────────────────────────────────────
// Empty by default. lessons.adapter and quizzes.adapter iterate this list to
// resolve custom lesson/quiz templates in mock mode. The real data lives in the
// API adapter; here an empty list is a safe no-op fallback.

const MOCK_MANAGED_COURSES: InstructorManagedCourse[] = [];
const MOCK_SAVED_COURSE_IDS = new Set<string>();

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
    return withMockDelay([]);
  }

  async getCourseModerationQueue(): Promise<InstructorManagedCourse[]> {
    return withMockDelay([]);
  }

  async createInstructorCourse(_input: InstructorCourseDraftInput): Promise<InstructorManagedCourse> {
    notImplementedCourse("createInstructorCourse");
  }

  async editInstructorCourse(_input: InstructorCourseEditInput): Promise<InstructorManagedCourse> {
    notImplementedCourse("editInstructorCourse");
  }

  async submitCourseForApproval(_courseId: string): Promise<InstructorManagedCourse> {
    notImplementedCourse("submitCourseForApproval");
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
