import type { QuizQuestion, QuizQuestionType } from "./quizzes";

export interface Course {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  duration: string;
  rating: number;
  category: string;
  image: string;
  difficulty?: CourseDifficulty;
  description?: string;
  estimatedHours?: number;
  coverImageUrl?: string;
  price?: number | null;
}

export type CoursePublicationStatus = "draft" | "pending-approval" | "approved" | "rejected";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced";

export interface InstructorCourseDraftInput {
  title: string;
  instructor: string;
  category: string;
  description: string;
  difficulty: CourseDifficulty;
  estimatedHours?: number;
  coverImageUrl?: string;
  topics?: string[];
  modules?: InstructorDraftModuleInput[];
  totalLessons: number;
  initialStatus: "draft" | "pending-approval";
  price?: number | null;
}

export interface InstructorManagedCourse extends Course {
  description: string;
  difficulty: CourseDifficulty;
  estimatedHours: number;
  coverImageUrl?: string;
  learningOutcomes: string[];
  topics: string[];
  modules: CourseModule[];
  publicationStatus: CoursePublicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  isCustom: boolean;
}

export type CourseStatus = "not-enrolled" | "enrolled" | "in-progress" | "completed";

export type CourseSort = "recommended" | "rating" | "title" | "progress";

export type CourseProgressFilter = "all" | "in-progress" | "not-started";

export interface CoursesViewPreferences {
  searchQuery: string;
  selectedCategory: string;
  progressFilter: CourseProgressFilter;
  sortBy: CourseSort;
}

export interface CourseLesson {
  id: string;
  title: string;
  duration: string;
  description?: string;
  videoUrl?: string;
  videoProvider?: "SUPABASE" | "EXTERNAL" | string;
  videoUploadStatus?: "PENDING" | "READY" | "FAILED" | string | null;
  estimatedCompletionTimeMinutes?: number;
  notesContent?: string;
  isFreePreview?: boolean;
  quizAvailable?: boolean;
  quizId?: string;
  quizTimeLimitSeconds?: number;
  /** Instructor-authored quiz questions stored with the lesson. */
  quizQuestions?: QuizQuestion[];
  locked?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface InstructorDraftQuizQuestionInput {
  questionType?: QuizQuestionType;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
  answerKey?: string;
}

export interface InstructorDraftLessonInput {
  /** Backend lesson ID, present for existing lessons during edit. */
  id?: string;
  title: string;
  videoUrl: string;
  videoProvider?: string;
  videoUploadStatus?: string | null;
  description: string;
  duration: string;
  estimatedCompletionTimeMinutes: number;
  notesContent: string;
  isFreePreview: boolean;
  quizAvailable: boolean;
  /** Optional lesson quiz duration in minutes; undefined/null means untimed. */
  quizTimeLimitMinutes?: number | null;
  /** Instructor-authored quiz questions. When provided, quizId is auto-generated. */
  quizQuestions?: InstructorDraftQuizQuestionInput[];
  /** Manual quiz ID to link to an existing static quiz template (used when no quizQuestions). */
  quizId?: string;
}

export interface LessonVideoUploadInput {
  courseId: string;
  moduleId: string;
  lessonId: string;
  file: File;
}

export interface LessonVideoUploadResult {
  videoUrl: string;
  videoProvider?: string;
  videoUploadStatus?: string | null;
}

export interface StandaloneLessonCreateInput {
  courseId: string;
  title?: string;
}

export interface InstructorDraftModuleInput {
  /** Backend module ID, present for existing modules during edit. */
  id?: string;
  title: string;
  lessons: InstructorDraftLessonInput[];
}

/** Input for editing a course (draft or rejected only) */
export interface InstructorCourseEditInput extends InstructorCourseDraftInput {
  courseId: string; // Required for edits
}

export interface CourseResource {
  name: string;
  size: string;
}

export interface CourseDetails {
  courseId: string;
  title: string;
  subtitle: string;
  description?: string;
  difficulty?: CourseDifficulty;
  estimatedHours?: number;
  learningOutcomes?: string[];
  topics?: string[];
  coverImageUrl?: string;
  instructorName: string;
  instructorAvatar: string;
  rating: number;
  reviewCount: number;
  totalLessons: number;
  durationLabel: string;
  image: string;
  modules: CourseModule[];
  resources: CourseResource[];
  prerequisiteCourseIds: string[];
  recommendedNextCourseId?: string;
  price?: number | null;
}

export interface CourseLessonProgress {
  completedLessonIds: string[];
  currentLessonId: string | null;
  lastAccessedAt: string | null;
  totalLessons?: number;
  completedLessons?: number;
  currentModule?: CourseModuleProgress | null;
  modules?: CourseModuleProgress[];
}

export interface RecentCourseAccess {
  courseId: string;
  lastAccessedAt: string;
}

export interface EnrolledCourseProgress {
  courseId: string;
  progress: number;
  resumeLessonId: string | null;
  completedLessonIds: string[];
  lastAccessedAt: string | null;
  courseTitle?: string;
  totalLessons?: number;
  completedLessons?: number;
  currentModule?: CourseModuleProgress | null;
  modules?: CourseModuleProgress[];
}

export interface CourseModuleProgress {
  id: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
}

export interface CoursesPageData {
  courses: Course[];
  categories: string[];
}
