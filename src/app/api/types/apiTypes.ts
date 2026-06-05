import type {
  CourseDetails,
  CoursesPageData,
  CourseLessonProgress,
  EnrolledCourseProgress,
  InstructorCourseDraftInput,
  InstructorCourseEditInput,
  InstructorManagedCourse,
  RecentCourseAccess,
} from "../../models/courses";
import type {
  VideoLesson,
  VideoLessonNote,
} from "../../models/lessons";
import type {
  GetQuizTemplateInput,
  QuizAttemptResult,
  QuizzesPageData,
  QuizSubmissionInput,
  QuizTemplate,
} from "../../models/quizzes";
import type { ProgressPageData } from "../../models/progress";
import type {
  CreateSubscriptionApprovalInput,
  CreateSubscriptionApprovalResult,
  SubscriptionOverview,
  SubscriptionPlan,
  VerifySubscriptionReturnInput,
  VerifySubscriptionReturnResult,
} from "../../models/subscription";
import type {
  TutorMessage,
  TutorPageData,
  TutorReplyInput,
  TutorSession,
  TutorSessionStatus,
} from "../../models/tutor";

export interface ApiListResponse<T> {
  items: T[];
  total?: number;
  nextCursor?: string | null;
}

export interface ApiMutationResult {
  success: boolean;
}

export type CoursesPageDto = CoursesPageData;
export type CourseDetailsDto = CourseDetails;

export interface EnrollCourseRequestDto {
  courseId: string;
}

export interface CompleteCourseLessonRequestDto {
  courseId: string;
  lessonId: string;
}

export interface TrackCourseAccessRequestDto {
  courseId: string;
  accessedAt?: string;
}

export type CourseLessonProgressDto = CourseLessonProgress;
export type RecentCourseAccessDto = RecentCourseAccess;

export type TutorPageDto = TutorPageData;
export type TutorReplyRequestDto = TutorReplyInput;
export type TutorReplyDto = TutorMessage;

export interface SaveTutorTakeawayRequestDto {
  sessionId: string;
  text: string;
}

export interface SaveTutorTakeawayResponseDto {
  sessionId: string;
  takeaway: string;
}

export interface UpdateTutorSessionStatusRequestDto {
  sessionId: string;
  status: TutorSessionStatus;
}

export interface UpdateTutorSessionStatusResponseDto {
  sessionId: string;
  status: TutorSessionStatus;
}

export interface GenerateNoteExplanationRequestDto {
  noteTitle: string;
  noteContent: string;
  lessonTitle: string;
  courseName: string;
  tags: string[];
}

export interface GenerateNoteExplanationResponseDto {
  explanation: string;
}

export type BuildTutorSessionResponseDto = TutorSession;

export interface ApiErrorResponseDto {
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

// ── Courses (remaining) ──────────────────────────────────────────────────────

export type EnrolledCourseProgressDto = EnrolledCourseProgress;
export type InstructorManagedCourseDto = InstructorManagedCourse;
export type CreateInstructorCourseRequestDto = InstructorCourseDraftInput;
export type EditInstructorCourseRequestDto = InstructorCourseEditInput;

export interface SubmitCourseForApprovalRequestDto {
  courseId: number;
}

export interface ReviewCoursePublicationRequestDto {
  decision: "approved" | "rejected";
  rejectionReason?: string;
}

// ── Lessons ──────────────────────────────────────────────────────────────────

export type VideoLessonDto = VideoLesson;
export type VideoLessonNoteDto = VideoLessonNote;

export interface CompleteLessonVideoRequestDto {
  lessonId: string;
  courseId: string;
}

export interface TrackLessonProgressRequestDto {
  lessonId: string;
  courseId: string;
  watchedDuration: number;
}

// ── Quizzes ──────────────────────────────────────────────────────────────────

export type QuizzesPageDto = QuizzesPageData;
export type QuizTemplateDto = QuizTemplate;
export type GetQuizTemplateRequestDto = GetQuizTemplateInput;
export type SubmitQuizAttemptRequestDto = QuizSubmissionInput;
export type QuizAttemptResultDto = QuizAttemptResult;

// ── Progress ─────────────────────────────────────────────────────────────────

export type ProgressPageDto = ProgressPageData;

// ── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionPlanDto = SubscriptionPlan;
export type SubscriptionOverviewDto = SubscriptionOverview;
export type CreateSubscriptionApprovalRequestDto = CreateSubscriptionApprovalInput;
export type CreateSubscriptionApprovalResponseDto = CreateSubscriptionApprovalResult;
export type VerifySubscriptionReturnRequestDto = VerifySubscriptionReturnInput;
export type VerifySubscriptionReturnResponseDto = VerifySubscriptionReturnResult;

