import { getCourseDetails } from "./courses.service";
import type { VideoLesson, VideoLessonNote } from "../models/lessons";
import {
  LessonCourseMismatchError,
  LessonNotFoundError,
  type LessonWatchProgressInput,
  type VideoLessonPageData,
} from "./contracts/lessons.contract";
import { getLessonsService } from "./factory/service-registry";

export { LessonCourseMismatchError, LessonNotFoundError };

/**
 * Fetch a single video lesson with all its data
 */
export async function getVideoLessonData(lessonId: string): Promise<VideoLesson> {
  return getLessonsService().getVideoLessonData(lessonId);
}

/**
 * Get all lessons for a specific course
 * Useful for course details page and curriculum view
 */
export async function getCourseLessons(courseId: string): Promise<VideoLesson[]> {
  return getLessonsService().getCourseLessons(courseId);
}

/**
 * Get related/further videos for a lesson
 * Includes other lessons in same module plus explicitly related lessons
 */
export async function getFurtherLessons(lessonId: string): Promise<VideoLesson[]> {
  return getLessonsService().getFurtherLessons(lessonId);
}

/**
 * Get lesson notes (currently returns lesson.notes, but can be extended
 * to support separate note storage/editing in the future)
 */
export async function getLessonNotes(lessonId: string): Promise<VideoLessonNote[]> {
  return getLessonsService().getLessonNotes(lessonId);
}

/**
 * Complete a lesson (mark as watched/completed)
 */
export async function completeLessonVideo(lessonId: string, courseId: string): Promise<void> {
  await getLessonsService().completeLessonVideo(lessonId, courseId);
}

/**
 * Track lesson progress (watch duration, etc)
 */
export async function trackLessonProgress(lessonId: string, courseId: string, watchedDuration: number): Promise<void> {
  await getLessonsService().trackLessonProgress(lessonId, courseId, watchedDuration);
}

export async function saveLessonWatchProgress(lessonId: string, input: LessonWatchProgressInput): Promise<void> {
  await getLessonsService().saveLessonWatchProgress(lessonId, input);
}

/**
 * Get all lesson data for a course (curriculum view)
 * Groups lessons by module for course details page
 */
export async function getCourseWithLessons(
  courseId: string
): Promise<{
  courseDetails: Awaited<ReturnType<typeof getCourseDetails>>;
  lessons: VideoLesson[];
}> {
  const [courseDetails, lessons] = await Promise.all([
    getCourseDetails(courseId),
    getCourseLessons(courseId),
  ]);

  return { courseDetails, lessons };
}

/**
 * Aggregate lesson page data and guard against course/lesson mismatches.
 */
export async function getVideoLessonPageData(
  courseId: string,
  lessonId: string,
): Promise<VideoLessonPageData> {
  return getLessonsService().getVideoLessonPageData(courseId, lessonId);
}
