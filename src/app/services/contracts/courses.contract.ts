import type {
  CourseDetails,
  CoursesPageData,
  EnrolledCourseProgress,
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  LessonVideoUploadInput,
  LessonVideoUploadResult,
  InstructorManagedCourse,
} from "../../models/courses";

export interface CoursesService {
  getCoursesPageData(): Promise<CoursesPageData>;
  getCourseDetails(courseId: string): Promise<CourseDetails>;
  getSavedCourseIds(): Promise<string[]>;
  saveCourse(courseId: string): Promise<void>;
  unsaveCourse(courseId: string): Promise<void>;
  getEnrolledCoursesProgress(): Promise<EnrolledCourseProgress[]>;
  getInstructorManagedCourses(instructorName?: string): Promise<InstructorManagedCourse[]>;
  getCourseModerationQueue(): Promise<InstructorManagedCourse[]>;
  createInstructorCourse(input: InstructorCourseDraftInput): Promise<InstructorManagedCourse>;
  editInstructorCourse(input: InstructorCourseEditInput): Promise<InstructorManagedCourse>;
  uploadLessonVideo(input: LessonVideoUploadInput): Promise<LessonVideoUploadResult>;
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
