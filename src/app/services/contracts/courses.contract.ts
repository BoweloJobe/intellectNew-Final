import type {
  CourseDetails,
  CoursesPageData,
  EnrolledCourseProgress,
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  InstructorManagedCourse,
} from "../../models/courses";

export interface CoursesService {
  getCoursesPageData(): Promise<CoursesPageData>;
  getCourseDetails(courseId: string): Promise<CourseDetails>;
  getEnrolledCoursesProgress(): Promise<EnrolledCourseProgress[]>;
  getInstructorManagedCourses(instructorName?: string): Promise<InstructorManagedCourse[]>;
  getCourseModerationQueue(): Promise<InstructorManagedCourse[]>;
  createInstructorCourse(input: InstructorCourseDraftInput): Promise<InstructorManagedCourse>;
  editInstructorCourse(input: InstructorCourseEditInput): Promise<InstructorManagedCourse>;
  submitCourseForApproval(courseId: string): Promise<InstructorManagedCourse>;
  reviewCoursePublication(
    courseId: string,
    decision: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<InstructorManagedCourse>;
  enrollCourse(courseId: string): Promise<void>;
  completeCourseLesson(courseId: string, lessonId: string): Promise<void>;
  trackCourseAccess(courseId: string): Promise<void>;
}