import type {
  CourseDetails,
  CoursesPageData,
  EnrolledCourseProgress,
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  InstructorManagedCourse,
} from "../models/courses";
import { getCoursesService } from "./factory/service-registry";

export async function getCoursesPageData(): Promise<CoursesPageData> {
  return getCoursesService().getCoursesPageData();
}

export async function getCourseDetails(courseId: string): Promise<CourseDetails> {
  return getCoursesService().getCourseDetails(courseId);
}

export async function getSavedCourseIds(): Promise<string[]> {
  return getCoursesService().getSavedCourseIds();
}

export async function saveCourse(courseId: string): Promise<void> {
  await getCoursesService().saveCourse(courseId);
}

export async function unsaveCourse(courseId: string): Promise<void> {
  await getCoursesService().unsaveCourse(courseId);
}

export async function getEnrolledCoursesProgress(): Promise<EnrolledCourseProgress[]> {
  return getCoursesService().getEnrolledCoursesProgress();
}

export async function getInstructorManagedCourses(instructorName?: string): Promise<InstructorManagedCourse[]> {
  return getCoursesService().getInstructorManagedCourses(instructorName);
}

export async function getCourseModerationQueue(): Promise<InstructorManagedCourse[]> {
  return getCoursesService().getCourseModerationQueue();
}

export async function createInstructorCourse(input: InstructorCourseDraftInput): Promise<InstructorManagedCourse> {
  return getCoursesService().createInstructorCourse(input);
}

export async function editInstructorCourse(input: InstructorCourseEditInput): Promise<InstructorManagedCourse> {
  return getCoursesService().editInstructorCourse(input);
}

export async function submitCourseForApproval(courseId: string): Promise<InstructorManagedCourse> {
  return getCoursesService().submitCourseForApproval(courseId);
}

export async function reviewCoursePublication(
  courseId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
): Promise<InstructorManagedCourse> {
  return getCoursesService().reviewCoursePublication(courseId, decision, rejectionReason);
}

export async function enrollCourse(courseId: string): Promise<void> {
  await getCoursesService().enrollCourse(courseId);
}

export async function completeCourseLesson(courseId: string, lessonId: string): Promise<void> {
  await getCoursesService().completeCourseLesson(courseId, lessonId);
}

export async function trackCourseAccess(courseId: string): Promise<void> {
  await getCoursesService().trackCourseAccess(courseId);
}
