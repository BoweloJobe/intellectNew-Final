import type { VideoLesson, VideoLessonNote } from "../../models/lessons";

export class LessonNotFoundError extends Error {
  constructor(lessonId: string) {
    super(`Lesson not found: ${lessonId}`);
    this.name = "LessonNotFoundError";
  }
}

export class LessonCourseMismatchError extends Error {
  constructor(lessonId: string, courseId: string) {
    super(`Lesson ${lessonId} does not belong to course ${courseId}`);
    this.name = "LessonCourseMismatchError";
  }
}

export interface VideoLessonPageData {
  lesson: VideoLesson;
  furtherLessons: VideoLesson[];
  courseLessons: VideoLesson[];
}

export interface LessonWatchProgressInput {
  watchedSeconds?: number;
  lastPositionSeconds?: number;
  completed?: boolean;
}

export interface LessonsService {
  getVideoLessonData(lessonId: string): Promise<VideoLesson>;
  getCourseLessons(courseId: string): Promise<VideoLesson[]>;
  getFurtherLessons(lessonId: string): Promise<VideoLesson[]>;
  getLessonNotes(lessonId: string): Promise<VideoLessonNote[]>;
  completeLessonVideo(lessonId: string, courseId: string): Promise<void>;
  trackLessonProgress(lessonId: string, courseId: string, watchedDuration: number): Promise<void>;
  saveLessonWatchProgress(lessonId: string, input: LessonWatchProgressInput): Promise<void>;
  getVideoLessonPageData(courseId: string, lessonId: string): Promise<VideoLessonPageData>;
}
